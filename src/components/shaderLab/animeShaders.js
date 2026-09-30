import * as THREE from 'three';

// Anime shading variants for the Tripo rider. The scan's colour texture has photographic
// lighting baked in, which fights toon shading; every variant can "flatten" it first: pull each
// texel's brightness toward its neighbourhood's (a blurred mip level), which irons out folds and
// creases while dark clothes stay dark, then restore a little saturation.
// All variants use the smooth vertex normals and ignore the scan's noisy normal map on purpose.

// Textures can carry a UV transform (Meshy exports KHR_texture_transform); apply it like
// three's own materials do, or the colours land on the wrong parts of the mesh.
const COMMON_VERTEX = /* glsl */ `
  uniform mat3 mapMatrix;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = (mapMatrix * vec3(uv, 1.0)).xy;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const COMMON_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 lightDir;
  uniform float flatten;
  uniform float saturation;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  vec3 albedo() {
    vec3 c = texture2D(map, vUv).rgb;
    float l = luma(c);
    float local = luma(textureLod(map, vUv, 4.5).rgb);
    // Scale each texel toward its local brightness: small-scale baked shading goes, colour stays.
    c *= pow(max(local, 0.004) / max(l, 0.004), flatten);
    float g = luma(c);
    return max(mix(vec3(g), c, saturation), 0.0);
  }
`;

function mapMatrix(texture) {
  texture.updateMatrix();
  return texture.matrix;
}

function shadingMaterial(texture, body, uniforms = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      mapMatrix: { value: mapMatrix(texture) },
      lightDir: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
      flatten: { value: 0.8 },
      saturation: { value: 1.15 },
      ...uniforms,
    },
    vertexShader: COMMON_VERTEX,
    fragmentShader: `${COMMON_FRAGMENT}
      ${body}
      void main() {
        vec3 N = normalize(vNormal);
        if (!gl_FrontFacing) N = -N;
        gl_FragColor = vec4(shade(albedo(), N, normalize(lightDir), normalize(vViewDir)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// Inverted-hull outline: the mesh again, pushed out along its normals, back faces only.
// Width is a fraction of the viewport's half-height, so the line keeps its thickness at any zoom.
function outlineMaterial(texture, { width, color, tint }) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      map: { value: texture },
      mapMatrix: { value: mapMatrix(texture) },
      width: { value: width },
      color: { value: new THREE.Color(color) },
      tint: { value: tint },
    },
    vertexShader: /* glsl */ `
      uniform float width;
      uniform mat3 mapMatrix;
      varying vec2 vUv;
      void main() {
        vUv = (mapMatrix * vec3(uv, 1.0)).xy;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * normal);
        vec2 offset = normalize(viewNormal.xy + 1e-5) * width * clip.w;
        clip.xy += offset * vec2(projectionMatrix[0][0] / projectionMatrix[1][1], 1.0);
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 color;
      uniform float tint;
      varying vec2 vUv;
      void main() {
        // Coloured lines take a darkened version of the surface colour underneath.
        vec3 surface = texture2D(map, vUv).rgb * 0.28;
        gl_FragColor = vec4(mix(color, surface, tint), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

export const VARIANTS = [
  {
    id: 'original',
    label: 'Original',
    note: 'The scan as it ships: PBR with baked lighting. Baseline.',
    build: (texture, original) => ({ surface: original }),
  },
  {
    id: 'hard-cel',
    label: 'Hard cel',
    note: 'Two flat tones split by a hard terminator, black ink outline. Classic TV-anime / manga.',
    build: (texture) => ({
      surface: shadingMaterial(texture, /* glsl */ `
        vec3 shade(vec3 base, vec3 N, vec3 L, vec3 V) {
          float lit = step(0.05, dot(N, L));
          return base * mix(0.52, 1.05, lit);
        }`),
      outline: outlineMaterial(texture, { width: 0.007, color: '#141018', tint: 0 }),
    }),
  },
  {
    id: 'gacha',
    label: 'Soft ramp + rim',
    note: 'The modern 3D-anime game look: narrow soft terminator, cool violet shadows, stepped specular, rim light, colour-matched outline.',
    build: (texture) => ({
      surface: shadingMaterial(texture, /* glsl */ `
        uniform vec3 shadowTint;
        uniform vec3 rimColor;
        vec3 shade(vec3 base, vec3 N, vec3 L, vec3 V) {
          float ndl = dot(N, L);
          float lit = smoothstep(-0.02, 0.08, ndl);
          vec3 color = mix(base * shadowTint, base * 1.04, lit);
          float spec = pow(max(dot(N, normalize(L + V)), 0.0), 48.0);
          color += step(0.55, spec) * 0.18 * lit;
          float fresnel = 1.0 - max(dot(N, V), 0.0);
          color += smoothstep(0.62, 0.7, fresnel) * rimColor * (0.35 + 0.65 * lit);
          return color;
        }`, {
        shadowTint: { value: new THREE.Color('#9f93c9') },
        rimColor: { value: new THREE.Color('#ffd9ea').multiplyScalar(0.55) },
      }),
      outline: outlineMaterial(texture, { width: 0.0045, color: '#2a1f33', tint: 0.8 }),
    }),
  },
  {
    id: 'ink',
    label: 'Three-tone + ink edges',
    note: 'Three hard bands with screen-space ink lines found from depth and normal edges, so creases and silhouettes both get lines.',
    build: (texture) => ({
      surface: shadingMaterial(texture, /* glsl */ `
        vec3 shade(vec3 base, vec3 N, vec3 L, vec3 V) {
          float ndl = dot(N, L);
          float band = ndl < -0.15 ? 0.5 : (ndl < 0.35 ? 0.78 : 1.04);
          return base * band;
        }`),
      edges: true,
    }),
  },
  {
    id: 'key-art',
    label: 'Painterly key art',
    note: 'Posterised colour, warm light / cool shadow wrap, strong pink rim and bloom. Reads like a promotional illustration.',
    build: (texture) => ({
      surface: shadingMaterial(texture, /* glsl */ `
        uniform vec3 warm;
        uniform vec3 cool;
        vec3 shade(vec3 base, vec3 N, vec3 L, vec3 V) {
          vec3 poster = floor(base * 7.0 + 0.5) / 7.0;
          float wrap = dot(N, L) * 0.5 + 0.5;
          vec3 color = poster * mix(cool, warm, smoothstep(0.35, 0.65, wrap));
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.4);
          color += fresnel * vec3(1.0, 0.72, 0.9) * 0.75;
          return color;
        }`, {
        warm: { value: new THREE.Color('#fff1e0').multiplyScalar(1.08) },
        cool: { value: new THREE.Color('#7f7fc4') },
      }),
      outline: outlineMaterial(texture, { width: 0.003, color: '#3b2a45', tint: 0.6 }),
      bloom: true,
    }),
  },
  {
    id: 'flat-ink',
    label: 'Flat colour + heavy line',
    note: 'No lighting at all, just flattened colour and a thick line. Graphic, sticker-like; hides the scan the most.',
    build: (texture) => ({
      surface: shadingMaterial(texture, /* glsl */ `
        vec3 shade(vec3 base, vec3 N, vec3 L, vec3 V) {
          return base * 1.02;
        }`, { flatten: { value: 1 } }),
      outline: outlineMaterial(texture, { width: 0.011, color: '#0e0b12', tint: 0 }),
    }),
  },
];
