import * as THREE from 'three';
import { createPetalWind } from '../petalWind.mjs';

// The falling petals: one instanced mesh drawn by its own shaders, and the seeded randomness
// that places them the same way every visit.
const petalVertexShader = `
  uniform float uTime;
  uniform float uAspect;
  uniform float uTanHalfFov;
  attribute vec3 aWindMotion;
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aSpin;
  attribute float aTint;
  varying vec2 vUv;
  varying float vTint;
  varying float vGlow;
  varying vec3 vNormal;

  mat2 rotate2d(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
  }

  void main() {
    float time = uTime + aPhase;
    float depth = aOffset.z;
    float halfHeight = uTanHalfFov * depth;
    float halfWidth = halfHeight * uAspect;
    float fall = mod(aOffset.y - uTime * aSpeed * 0.18 + 1.25, 2.5) - 1.25;
    float horizontalDrift = sin(time * 0.72 + depth) * 0.075 + cos(time * 0.23) * 0.028;
    vec2 petalNdc = vec2(aOffset.x + horizontalDrift, fall);
    petalNdc += vec2(aWindMotion.x / uAspect, aWindMotion.y);
    vec3 center = vec3(
      petalNdc.x * halfWidth,
      petalNdc.y * halfHeight,
      -depth
    );

    // Keep the nearest flakes from filling the viewport while preserving
    // normal perspective for the rest of the field.
    float foregroundScale = smoothstep(1.4, 6.0, depth);
    vec3 petal = position * aScale * mix(0.28, 1.0, foregroundScale);
    // Small variations keep the shared mesh from looking stamped out.
    float widthVariation = mix(0.90, 1.10, aTint);
    petal.x *= widthVariation;
    vec3 petalNormal = normalize(normal / vec3(widthVariation, 1.0, 1.0));
    petal.xy = rotate2d(time * aSpin + aWindMotion.z) * petal.xy;
    petalNormal.xy = rotate2d(time * aSpin + aWindMotion.z) * petalNormal.xy;
    petal.yz = rotate2d(time * (0.82 + aSpin * 0.22)) * petal.yz;
    petalNormal.yz = rotate2d(time * (0.82 + aSpin * 0.22)) * petalNormal.yz;
    petal.xz = rotate2d(sin(time * 1.17) * 0.75) * petal.xz;
    petalNormal.xz = rotate2d(sin(time * 1.17) * 0.75) * petalNormal.xz;

    vec4 viewPosition = vec4(center + petal, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vUv = uv;
    vTint = aTint;
    vGlow = 1.0 - smoothstep(2.0, 55.0, depth);
    vNormal = normalize(petalNormal);
  }
`;

const petalFragmentShader = `
  varying vec2 vUv;
  varying float vTint;
  varying float vGlow;
  varying vec3 vNormal;

  void main() {
    float height = vUv.y;
    float baseBlush = exp(-height * 5.5);
    float edge = pow(abs(vUv.x - 0.5) * 2.0, 3.0);
    vec3 ivoryPink = mix(vec3(1.0, 0.88, 0.90), vec3(1.0, 0.95, 0.94), vTint);
    vec3 color = mix(ivoryPink, vec3(0.91, 0.51, 0.62), baseBlush * 0.48);

    // Fine, fanning veins emerge from the narrow attachment point.
    float fan = (vUv.x - 0.5) / (0.16 + height * 0.84);
    float veinWave = abs(sin(fan * 24.0 + sin(height * 5.0 + fan * 3.0) * 0.32));
    float veinAA = max(fwidth(veinWave), 0.035);
    float veins = 1.0 - smoothstep(0.035, 0.035 + veinAA, veinWave);
    veins *= smoothstep(0.03, 0.22, height) * (1.0 - smoothstep(0.55, 0.98, height));
    color = mix(color, vec3(0.84, 0.49, 0.58), veins * 0.065);
    color = mix(color, vec3(1.0, 0.96, 0.95), edge * 0.22);

    // Soft two-sided light gives the thin, cupped surface a translucent feel.
    vec3 surfaceNormal = normalize(vNormal);
    float light = abs(dot(surfaceNormal, normalize(vec3(-0.35, 0.65, 0.85))));
    float transmission = pow(1.0 - abs(surfaceNormal.z), 2.0);
    color *= 0.86 + light * 0.14;
    color += vec3(0.045, 0.025, 0.025) * transmission;
    gl_FragColor = vec4(color, mix(0.86, 0.96, vGlow));
  }
`;

export function seededRandom(seed = 48271) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPetalField(random, count) {
  const shape = new THREE.Shape();
  // A narrow attachment opens into broad, unequal shoulders and a small
  // apical notch: the characteristic silhouette of a single sakura petal.
  shape.moveTo(0.015, -0.60);
  shape.bezierCurveTo(-0.10, -0.51, -0.37, -0.22, -0.43, 0.10);
  shape.bezierCurveTo(-0.49, 0.37, -0.33, 0.62, -0.14, 0.60);
  shape.bezierCurveTo(-0.065, 0.60, -0.035, 0.52, 0.005, 0.475);
  shape.bezierCurveTo(0.05, 0.53, 0.09, 0.61, 0.18, 0.585);
  shape.bezierCurveTo(0.40, 0.55, 0.47, 0.31, 0.415, 0.075);
  shape.bezierCurveTo(0.35, -0.22, 0.12, -0.52, 0.015, -0.60);

  const outline = new THREE.ShapeGeometry(shape, 10);
  const outlinePositions = outline.getAttribute('position');
  const positions = [];
  const uvs = [];
  const indices = [];
  const vertices = new Map();
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const addTriangle = (a, b, c, subdivisions) => {
    if (subdivisions > 0) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      addTriangle(a, ab, ca, subdivisions - 1);
      addTriangle(ab, b, bc, subdivisions - 1);
      addTriangle(ca, bc, c, subdivisions - 1);
      addTriangle(ab, bc, ca, subdivisions - 1);
      return;
    }
    for (const [x, y] of [a, b, c]) {
      const key = `${x.toFixed(7)},${y.toFixed(7)}`;
      let vertex = vertices.get(key);
      if (vertex === undefined) {
        vertex = positions.length / 3;
        vertices.set(key, vertex);
        positions.push(x, y, 0);
        // ShapeGeometry supplies raw XY coordinates, not normalized UVs.
        uvs.push(x + 0.5, (y + 0.60) / 1.22);
      }
      indices.push(vertex);
    }
  };
  for (let index = 0; index < outline.index.count; index += 3) {
    const triangle = [0, 1, 2].map((corner) => {
      const vertex = outline.index.getX(index + corner);
      return [outlinePositions.getX(vertex), outlinePositions.getY(vertex)];
    });
    addTriangle(...triangle, 1);
  }
  outline.dispose();

  // Interior vertices allow a smooth cup instead of a flat polygon whose
  // boundary alone has been bent. Analytic normals avoid triangulation seams.
  const normals = [];
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const tip = Math.max(y - 0.22, 0);
    positions[index + 2] = 0.40 * x * x + 0.10 * x * y + 0.24 * tip * tip;
    const normal = new THREE.Vector3(-0.80 * x - 0.10 * y, -0.10 * x - 0.48 * tip, 1).normalize();
    normals.push(normal.x, normal.y, normal.z);
  }
  const petalShape = new THREE.BufferGeometry();
  petalShape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  petalShape.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  petalShape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  petalShape.setIndex(indices);
  petalShape.scale(0.16, 0.16, 0.16);

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = petalShape.index;
  geometry.setAttribute('position', petalShape.getAttribute('position').clone());
  geometry.setAttribute('normal', petalShape.getAttribute('normal').clone());
  geometry.setAttribute('uv', petalShape.getAttribute('uv').clone());
  geometry.instanceCount = count;
  petalShape.dispose();

  const offsets = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const spins = new Float32Array(count);
  const tints = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    offsets[index * 3] = (random() - 0.5) * 2.5;
    offsets[index * 3 + 1] = random() * 2.5;
    offsets[index * 3 + 2] = 1.4 + Math.pow(random(), 0.72) * 56;
    scales[index] = 0.58 + random() * 1.02;
    phases[index] = random() * Math.PI * 2;
    speeds[index] = 0.34 + random() * 0.62;
    spins[index] = (random() - 0.5) * 2.8;
    tints[index] = random();
  }

  geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
  geometry.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spins, 1));
  geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 1));
  const wind = createPetalWind(offsets, phases, tints, speeds);
  geometry.setAttribute('aWindMotion', new THREE.InstancedBufferAttribute(wind.displacement, 3).setUsage(THREE.DynamicDrawUsage));

  const material = new THREE.ShaderMaterial({
    vertexShader: petalVertexShader,
    fragmentShader: petalFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uTanHalfFov: { value: Math.tan(THREE.MathUtils.degToRad(43 / 2)) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const petals = new THREE.Mesh(geometry, material);
  petals.userData.wind = wind;
  petals.frustumCulled = false;
  petals.renderOrder = 4;
  return petals;
}
