import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// Holographic tails: mostly light added over the scene, so it shows through them. The sculpt's fur is many
// overlapping locks, so a pixel can cross several surfaces of one tail; each surface therefore
// adds only a little (LAYER_GAIN), and the stacked locks sum to the glow. A tail seen face-on is
// almost clear; its silhouette glows (fresnel), a hot near-white core runs down its middle like a
// lightsaber blade, slow bands of energy drift root → tip, the stalk fades in from the tailbone
// and the tip burns whiter. The tails are the only thing bright enough to cross the bloom
// threshold, so only they radiate.

const LAYER_GAIN = 0.2;


// A tail's palette is one to three colours, each with a share of the fur. Multi-colour tails are
// marked like a cat's coat: fixed patches of fur in each colour, from a per-vertex `marking`
// value the skin bakes from the sculpt (so patches ride with the fur). Blending is
// premultiplied: light colours add light (additive glow), dark ones (black, navy) become tinted
// dark glass that dims the scene behind, with a faint sheen on their edges. Hovering brightens the
// glow and deepens the dark glass, so black fur gets blacker.
const MARKED_VERTEX = /* glsl */ `
  attribute float along;
  attribute float marking;
  varying float vAlong;
  varying float vMarking;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vAlong = along;
    vMarking = marking;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float gain0;
  uniform float gain1;
  uniform float gain2;
  uniform float hoverAmount;
  uniform float hoverShare;
  uniform float hover0;
  uniform float hover1;
  uniform float hover2;
  uniform vec3 color0;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float cut0;
  uniform float cut1;
  uniform float time;
  uniform float phase;
  uniform float intensity;
  uniform float layerGain;
  varying float vAlong;
  varying float vMarking;
  varying vec3 vNormal;
  varying vec3 vWorld;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

  void main() {
    vec3 view = normalize(cameraPosition - vWorld);
    // Guard every input: a single NaN pixel gets smeared across the whole screen by the bloom.
    float normalLength = length(vNormal);
    vec3 surfaceNormal = normalLength > 1e-5 ? vNormal / normalLength : view;
    float facing = clamp(abs(dot(surfaceNormal, view)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.4);
    float core = pow(facing, 7.0);
    float bands = 0.85 + 0.15 * sin(vAlong * 34.0 - time * 1.6 + phase);
    float sparkle = step(0.985, hash(floor(vWorld * 40.0) + floor(time * 3.0))) * 0.6;
    // The six stalks overlap at the tailbone; fade them in gently so their light doesn't pile up.
    float body = smoothstep(0.05, 0.5, vAlong) * (0.35 + 0.65 * smoothstep(0.25, 0.55, vAlong));
    float tip = smoothstep(0.82, 1.0, vAlong);

    // The coat: which colour this patch of fur is, with soft patch edges.
    float edge = 0.02;
    float w1 = smoothstep(cut0 - edge, cut0 + edge, vMarking);
    float w2 = smoothstep(cut1 - edge, cut1 + edge, vMarking);
    vec3 color = mix(mix(color0, color1, w1), color2, w2);
    // Per-colour strength: scales a light colour's glow, and a dark colour's opacity.
    float gain = mix(mix(gain0, gain1, w1), gain2, w2);
    // Hover: each colour has its own hover brightness (3 = three times as bright when hovered);
    // emphasised tails take a bigger share of it.
    float hoverScale = mix(mix(hover0, hover1, w1), hover2, w2);
    float lift = 1.0 + (hoverScale - 1.0) * hoverShare * hoverAmount;

    // Dark fur becomes dark glass; light fur glows.
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float darkness = 1.0 - smoothstep(0.04, 0.3, luminance);
    vec3 glow = color * (rim * 2.4 + 0.06) * bands;
    glow += mix(color, vec3(1.0), 0.5) * core * 0.7 * (1.0 - darkness);
    glow += color * sparkle * rim * (1.0 - darkness);
    glow += vec3(1.0) * rim * tip * 0.35 * (1.0 - darkness);
    glow += vec3(0.8, 0.85, 1.0) * rim * 0.22 * darkness;
    float cover = darkness * (0.28 + rim * 0.45);
    glow *= gain;
    cover *= gain;

    glow *= body * intensity * lift * layerGain;
    // Hover deepens dark glass as well as brightening the glow.
    cover *= body * layerGain * 2.5 * (1.0 + (intensity * lift - 1.0) * 0.9);
    gl_FragColor = vec4(clamp(glow, 0.0, 16.0), clamp(cover, 0.0, 1.0));
  }
`;

// Normalise a palette to [{ color, share }] and place the patch cut-offs at the quantiles of this
// tail's own marking values, so each colour covers exactly its share of the fur.
const normalisePalette = (palette) => palette.map((entry) => (typeof entry === 'string' ? { color: entry, share: 1 } : entry));

// `tuning` maps a colour to { strength, hover }: strength scales its glow (for black, its opacity);
// hover is how many times brighter (darker, for black) it gets when its tail is hovered.
export function hologramMaterial({ palette, markings, tuning = {}, phase = 0, intensity = 1 }) {
  const entries = normalisePalette(palette).slice(0, 3);
  const total = entries.reduce((sum, entry) => sum + entry.share, 0);
  const sorted = Float32Array.from(markings).sort();
  const quantile = (fraction) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(fraction * sorted.length)))];
  const first = entries[0].share / total;
  const second = entries[1] ? (entries[0].share + entries[1].share) / total : 1;
  const colors = entries.map((entry) => new THREE.Color(entry.color));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color0: { value: colors[0] },
      color1: { value: colors[1] || colors[0] },
      color2: { value: colors[2] || colors[1] || colors[0] },
      // Past the end of the range when a colour is absent, so it never shows.
      cut0: { value: entries.length > 1 ? quantile(first) : 2 },
      cut1: { value: entries.length > 2 ? quantile(second) : 2 },
      time: { value: 0 },
      phase: { value: phase },
      intensity: { value: intensity },
      layerGain: { value: LAYER_GAIN },
      gain0: { value: 1 },
      gain1: { value: 1 },
      gain2: { value: 1 },
      hoverAmount: { value: 0 },
      hoverShare: { value: 1 },
      hover0: { value: 1 },
      hover1: { value: 1 },
      hover2: { value: 1 },
    },
    vertexShader: MARKED_VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    // Premultiplied: rgb adds light, alpha dims what's behind (dark glass).
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const keys = entries.map((entry) => entry.color.toLowerCase());
  [keys[0], keys[1] || keys[0], keys[2] || keys[1] || keys[0]].forEach((key, slot) => {
    const { strength = 1, hover = 3 } = tuning[key] || {};
    material.uniforms[`gain${slot}`].value = strength;
    material.uniforms[`hover${slot}`].value = hover;
  });
  return material;
}

// Render through bloom so the tails radiate. Anything below `threshold` brightness (the backdrop,
// the figure, the cliff, the petals) stays crisp; the tails' edges and cores push past it.
export function createGlowComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize: (width, height) => {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose: () => composer.dispose(),
  };
}

// The same glow as a layer over a scene that's already drawn: `camera`'s view of `scene` (which
// should hold nothing else on that camera's layers) goes through the bloom into its own
// transparent buffer, then onto the screen in premultiplied form, over whatever is there, inside
// the given viewport, at the given opacity. The bloom's halo lands like a screen blend. `warm`
// runs the bloom once off screen, so its shaders are compiled before it's first seen.
export function createGlowLayer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera, null, new THREE.Color(0x000000), 0));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.9));
  const quad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, opacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv);
        #include <colorspace_fragment>
        gl_FragColor *= opacity;
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  }));
  const render = (x, y, width, height, opacity = 1) => {
    composer.render();
    quad.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
    quad.material.uniforms.opacity.value = opacity;
    renderer.setRenderTarget(null);
    renderer.setViewport(x, y, width, height);
    quad.render(renderer);
  };
  return {
    render,
    setSize: (width, height) => {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    // Fully transparent, so nothing shows; the caller restores its viewport afterwards.
    warm: () => render(0, 0, 1, 1, 0),
    dispose: () => {
      composer.dispose();
      quad.material.dispose();
      quad.dispose();
    },
  };
}

// The backdrop photo as the scene background, cropped like CSS `cover` anchored to the bottom.
export function coverBackground(texture, aspect) {
  const imageAspect = texture.image.width / texture.image.height;
  if (aspect > imageAspect) {
    texture.repeat.set(1, imageAspect / aspect);
    texture.offset.set(0, 0);
  } else {
    texture.repeat.set(aspect / imageAspect, 1);
    texture.offset.set((1 - aspect / imageAspect) / 2, 0);
  }
}
