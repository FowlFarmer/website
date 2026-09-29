import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VARIANTS } from './animeShaders.js';
import './shaderLab.css';

// A/B lab for anime shading on the rider scan: variant A left of the split, B right of it.
const MODELS = {
  rider: '/models/cherry-blossom/bicycle-rider-mobile.glb',
  kitsune: '/models/kitsune/keria.glb',
};
const MODEL_URL = MODELS[new URLSearchParams(window.location.search).get('model')] || MODELS.rider;
const BACKDROPS = ['site', 'dusk', 'paper'];

const FULLSCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Views each slot's render and, where asked, draws ink along depth and normal edges.
const COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D colorA;
  uniform sampler2D colorB;
  uniform sampler2D normalA;
  uniform sampler2D normalB;
  uniform float edgesA;
  uniform float edgesB;
  uniform float split;
  uniform vec2 texel;
  varying vec2 vUv;

  float edgeAt(sampler2D buffer) {
    vec4 c = texture2D(buffer, vUv);
    float edge = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 dir = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(0.0, 1.0) : i == 2 ? vec2(1.0, 1.0) : vec2(1.0, -1.0);
      vec4 a = texture2D(buffer, vUv + dir * texel * 1.2);
      vec4 b = texture2D(buffer, vUv - dir * texel * 1.2);
      float normalJump = length(a.rgb - b.rgb) * step(0.001, a.a * b.a);
      float depthJump = abs(a.a - b.a) * 18.0;
      edge = max(edge, max(smoothstep(0.35, 0.6, normalJump), smoothstep(0.25, 0.5, depthJump)));
    }
    return edge;
  }

  void main() {
    bool left = vUv.x < split;
    vec4 color = left ? texture2D(colorA, vUv) : texture2D(colorB, vUv);
    float edge = left ? edgesA * edgeAt(normalA) : edgesB * edgeAt(normalB);
    vec3 ink = vec3(0.06, 0.045, 0.08);
    color.rgb = mix(color.rgb, ink, edge);
    color.a = max(max(color.a, edge), min(dot(color.rgb, vec3(0.3333)), 1.0));
    if (abs(vUv.x - split) < texel.x * 1.5) color = vec4(1.0);
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

const NORMAL_DEPTH = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    varying vec3 vViewNormal;
    varying float vDepth;
    void main() {
      vViewNormal = normalize(normalMatrix * normal);
      vec4 view = modelViewMatrix * vec4(position, 1.0);
      vDepth = -view.z;
      gl_Position = projectionMatrix * view;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vViewNormal;
    varying float vDepth;
    void main() { gl_FragColor = vec4(normalize(vViewNormal) * 0.5 + 0.5, vDepth / 4.0); }
  `,
});

export default function RiderShaderLab() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [variantA, setVariantA] = useState('original');
  const [variantB, setVariantB] = useState('gacha');
  const [split, setSplit] = useState(0.5);
  const [flatten, setFlatten] = useState(0.8);
  const [spin, setSpin] = useState(true);
  const [backdrop, setBackdrop] = useState('site');
  const [status, setStatus] = useState('Loading rider…');
  const [panelOpen, setPanelOpen] = useState(true);
  const settings = useRef({});
  settings.current = { variantA, variantB, split, flatten, spin };

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 0.6;
    controls.maxDistance = 4;

    // Lighting for the untouched PBR baseline; the anime shaders take the same direction.
    const lightDirection = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.copy(lightDirection).multiplyScalar(5);
    scene.add(sun, new THREE.HemisphereLight(0xdfe4ff, 0x6c5a70, 1.1));

    const pivot = new THREE.Group();
    scene.add(pivot);

    const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const slots = [0, 1].map(() => ({ color: makeTarget(), normal: makeTarget() }));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.7);

    const composite = new THREE.ShaderMaterial({
      uniforms: {
        colorA: { value: slots[0].color.texture },
        colorB: { value: slots[1].color.texture },
        normalA: { value: slots[0].normal.texture },
        normalB: { value: slots[1].normal.texture },
        edgesA: { value: 0 },
        edgesB: { value: 0 },
        split: { value: 0.5 },
        texel: { value: new THREE.Vector2() },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      transparent: true,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite);
    screen.frustumCulled = false;
    const screenScene = new THREE.Scene();
    screenScene.add(screen);
    const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let model = null;
    let outline = null;
    let variants = {};
    let disposed = false;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.loadAsync(MODEL_URL).then((gltf) => {
      if (disposed) return;
      gltf.scene.traverse((child) => {
        if (child.isMesh && !model) model = child;
      });
      const box = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
      pivot.add(gltf.scene);
      // Fit the whole rider with headroom, aimed low so it sits above the control panel.
      const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
      const distance = (radius * 1.35) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      controls.target.set(0, -radius * 0.42, 0);
      camera.position.copy(new THREE.Vector3(0.8, 0.12, 0.58).normalize().multiplyScalar(distance).add(controls.target));
      controls.update();
      const texture = model.material.map;
      variants = Object.fromEntries(VARIANTS.map((variant) => [variant.id, variant.build(texture, model.material)]));
      outline = new THREE.Mesh(model.geometry, undefined);
      outline.visible = false;
      model.add(outline);
      setStatus('');
    }).catch((error) => setStatus(`Could not load the rider: ${error.message}`));

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const pixelWidth = Math.round(width * renderer.getPixelRatio());
      const pixelHeight = Math.round(height * renderer.getPixelRatio());
      slots.forEach((slot) => {
        slot.color.setSize(pixelWidth, pixelHeight);
        slot.normal.setSize(pixelWidth, pixelHeight);
      });
      bloom.setSize(pixelWidth, pixelHeight);
      composite.uniforms.texel.value.set(1 / pixelWidth, 1 / pixelHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const renderSlot = (slot, variantId) => {
      const variant = variants[variantId];
      model.material = variant.surface;
      if (variant.surface.uniforms?.flatten) variant.surface.uniforms.flatten.value = settings.current.flatten;
      outline.visible = Boolean(variant.outline);
      if (variant.outline) outline.material = variant.outline;
      renderer.setRenderTarget(slot.color);
      renderer.clear();
      renderer.render(scene, camera);
      if (variant.bloom) bloom.render(renderer, null, slot.color, 0, false);
      if (variant.edges) {
        outline.visible = false;
        scene.overrideMaterial = NORMAL_DEPTH;
        renderer.setRenderTarget(slot.normal);
        renderer.clear();
        renderer.render(scene, camera);
        scene.overrideMaterial = null;
      }
      return variant.edges ? 1 : 0;
    };

    let frame = 0;
    let previous = performance.now();
    const loop = (time) => {
      frame = window.requestAnimationFrame(loop);
      const seconds = (time - previous) / 1000;
      previous = time;
      controls.update();
      if (!model) return;
      if (settings.current.spin) pivot.rotation.y += seconds * 0.35;
      const { variantA: a, variantB: b } = settings.current;
      composite.uniforms.edgesA.value = renderSlot(slots[0], a);
      composite.uniforms.edgesB.value = b === a ? composite.uniforms.edgesA.value : renderSlot(slots[1], b);
      composite.uniforms.colorB.value = b === a ? slots[0].color.texture : slots[1].color.texture;
      composite.uniforms.normalB.value = b === a ? slots[0].normal.texture : slots[1].normal.texture;
      composite.uniforms.split.value = settings.current.split;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(screenScene, screenCamera);
    };
    frame = window.requestAnimationFrame(loop);
    engineRef.current = { renderer };

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      slots.forEach((slot) => { slot.color.dispose(); slot.normal.dispose(); });
      bloom.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const dragSplit = (event) => {
    const bounds = mountRef.current.getBoundingClientRect();
    const move = (moveEvent) => setSplit(Math.min(Math.max((moveEvent.clientX - bounds.left) / bounds.width, 0.02), 0.98));
    move(event);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const describe = (id) => VARIANTS.find((variant) => variant.id === id);

  return (
    <div className="shader-lab" data-backdrop={backdrop}>
      <div ref={mountRef} className="shader-lab-viewport" />
      <button
        type="button"
        className="shader-lab-split"
        style={{ left: `${split * 100}%` }}
        onPointerDown={dragSplit}
        aria-label="Drag to compare"
      />
      <div className="shader-lab-tag shader-lab-tag-a">A · {describe(variantA).label}</div>
      <div className="shader-lab-tag shader-lab-tag-b">B · {describe(variantB).label}</div>
      {status && <p className="shader-lab-status">{status}</p>}

      <button type="button" className="shader-lab-toggle" onClick={() => setPanelOpen((open) => !open)}>
        {panelOpen ? 'Hide controls' : 'Show controls'}
      </button>
      <div className="shader-lab-panel" hidden={!panelOpen}>
        {[['A', variantA, setVariantA], ['B', variantB, setVariantB]].map(([slot, value, set]) => (
          <div key={slot} className="shader-lab-row">
            <span className="shader-lab-slot">{slot}</span>
            {VARIANTS.map((variant) => (
              <button key={variant.id} type="button" aria-pressed={value === variant.id} onClick={() => set(variant.id)}>
                {variant.label}
              </button>
            ))}
          </div>
        ))}
        <p className="shader-lab-note"><b>A</b> {describe(variantA).note}</p>
        <p className="shader-lab-note"><b>B</b> {describe(variantB).note}</p>
        <div className="shader-lab-row">
          <label>
            Flatten baked lighting
            <input type="range" min="0" max="1" step="0.05" value={flatten} onChange={(event) => setFlatten(Number(event.target.value))} />
            {Math.round(flatten * 100)}%
          </label>
          <button type="button" aria-pressed={spin} onClick={() => setSpin((value) => !value)}>Spin</button>
          {BACKDROPS.map((option) => (
            <button key={option} type="button" aria-pressed={backdrop === option} onClick={() => setBackdrop(option)}>{option}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
