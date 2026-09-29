import * as THREE from 'three';

// The outcrop the figure stands on: a sculpted boulder (free CGTrader asset, converted by
// scripts/assets/obj-to-glb.mjs to positions only), stretched upward into a ledge and coloured
// entirely in the shader. No textures: moss on the flats, slate on the faces, dark cracks from a
// per-vertex cavity term, a pink rim from the sunset, and the base fading into the dusk haze.

// Model units: the boulder's plateau has a flat shoulder around (15, 0) that falls away steeply
// toward +x, so he sits there facing +x with his legs over the drop.
const SEAT = new THREE.Vector2(15, 0);
const FACING = new THREE.Vector3(1, 0, 0);
// Scene units per model unit, and how much taller than sculpted (a ledge, not a boulder).
const SCALE = 0.13;
const STRETCH = 1.25;
// Radius (model units) of the patch under his hips that sets the rock's height: its upper
// quantile meets his seat, so small bumps sink into him instead of leaving him floating.
const FOOTPRINT = 2.5;
const FOOT_QUANTILE = 0.75;

const PALETTE = {
  moss: '#4f5d57',
  mossLight: '#75806c',
  stone: '#6f6886',
  stoneDark: '#4d4868',
  crack: '#211f3a',
  rim: '#ffb3c8',
  haze: '#4f5596',
};

// Concavity per vertex: how far the neighbours' centroid sits above the vertex along its normal,
// relative to the local edge length. Positive in cracks and creases, negative on ridges.
function vertexCavity(geometry) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const index = geometry.index.array;
  const count = position.count;
  const sum = new Float32Array(count * 3);
  const edge = new Float32Array(count);
  const degree = new Uint16Array(count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let face = 0; face < index.length; face += 3) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = index[face + corner];
      const to = index[face + ((corner + 1) % 3)];
      a.fromBufferAttribute(position, from);
      b.fromBufferAttribute(position, to);
      const length = a.distanceTo(b);
      // Each undirected edge is seen from both sides across the two faces sharing it.
      for (const [self, other] of [[from, b], [to, a]]) {
        sum[self * 3] += other.x;
        sum[self * 3 + 1] += other.y;
        sum[self * 3 + 2] += other.z;
        edge[self] += length;
        degree[self] += 1;
      }
    }
  }
  const cavity = new Float32Array(count);
  const values = [];
  const n = new THREE.Vector3();
  for (let vertex = 0; vertex < count; vertex += 1) {
    if (!degree[vertex]) continue;
    a.fromBufferAttribute(position, vertex);
    n.fromBufferAttribute(normal, vertex);
    b.set(sum[vertex * 3], sum[vertex * 3 + 1], sum[vertex * 3 + 2]).divideScalar(degree[vertex]).sub(a);
    cavity[vertex] = b.dot(n) / (edge[vertex] / degree[vertex]);
    values.push(cavity[vertex]);
  }
  // Map the 50th–95th percentile of concavity onto 0–1: only real creases darken.
  values.sort((x, y) => x - y);
  const low = values[Math.floor(values.length * 0.5)];
  const high = values[Math.floor(values.length * 0.95)];
  for (let vertex = 0; vertex < count; vertex += 1) {
    cavity[vertex] = THREE.MathUtils.clamp((cavity[vertex] - low) / (high - low), 0, 1);
  }
  return new THREE.BufferAttribute(cavity, 1);
}

function rockMaterial({ top, bottom }) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: false });
  const colors = Object.fromEntries(Object.entries(PALETTE).map(([key, value]) => [key, { value: new THREE.Color(value) }]));
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, colors, {
      rockTop: { value: top },
      rockBottom: { value: bottom },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float cavity;
varying float vCavity;
varying vec3 vRockWorld;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
vCavity = cavity;
vRockWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 moss;
uniform vec3 mossLight;
uniform vec3 stone;
uniform vec3 stoneDark;
uniform vec3 crack;
uniform vec3 rim;
uniform vec3 haze;
uniform float rockTop;
uniform float rockBottom;
varying float vCavity;
varying vec3 vRockWorld;

float rockHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float rockNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(rockHash(i), rockHash(i + vec3(1, 0, 0)), f.x), mix(rockHash(i + vec3(0, 1, 0)), rockHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(rockHash(i + vec3(0, 0, 1)), rockHash(i + vec3(1, 0, 1)), f.x), mix(rockHash(i + vec3(0, 1, 1)), rockHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}`)
      // Colour by slope once the (flat) normal is known, before lighting reads diffuseColor.
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
  float grain = rockNoise(vRockWorld * 1.7) * 0.6 + rockNoise(vRockWorld * 6.0) * 0.4;
  float strata = rockNoise(vec3(vRockWorld.x * 0.4, vRockWorld.y * 3.0, vRockWorld.z * 0.4));
  vec3 face = mix(stoneDark, stone, clamp(grain * 0.8 + strata * 0.5 - 0.15, 0.0, 1.0));
  // Moss only settles on the flats near the top, with a ragged edge.
  float height = clamp((vRockWorld.y - rockBottom) / (rockTop - rockBottom), 0.0, 1.0);
  float level = smoothstep(0.8, 0.95, worldNormal.y + (grain - 0.5) * 0.35);
  float cover = level * smoothstep(0.6, 0.9, height) * smoothstep(0.35, 0.6, rockNoise(vRockWorld * 0.8));
  vec3 growth = mix(moss, mossLight, rockNoise(vRockWorld * 3.0));
  vec3 base = mix(face, growth, cover);
  base = mix(base, crack, pow(vCavity, 0.7) * (1.0 - cover * 0.5));
  diffuseColor.rgb = base;
}`)
      // A pink rim where faces turn edge-on to the camera, then the base sinks into the haze.
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
{
  vec3 toCamera = normalize(cameraPosition - vRockWorld);
  vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
  float fresnel = pow(1.0 - clamp(dot(worldNormal, toCamera), 0.0, 1.0), 3.0);
  gl_FragColor.rgb += rim * fresnel * 0.35 * (1.0 - vCavity);
  float height = clamp((vRockWorld.y - rockBottom) / (rockTop - rockBottom), 0.0, 1.0);
  gl_FragColor.rgb = mix(haze, gl_FragColor.rgb, smoothstep(0.02, 0.6, height));
}`);
  };
  return material;
}

// The height he sits at: the low end of the figure's vertices behind his torso centre (his back
// and hips; the legs hang forward, over the drop).
function seatHeight(figure, frame) {
  const position = figure.geometry.attributes.position;
  const point = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const heights = [];
  figure.updateMatrixWorld(true);
  const stride = Math.max(1, Math.floor(position.count / 20000));
  for (let vertex = 0; vertex < position.count; vertex += stride) {
    point.fromBufferAttribute(position, vertex).applyMatrix4(figure.matrixWorld);
    if (offset.subVectors(point, frame.torso).dot(frame.forward) < 0) heights.push(point.y);
  }
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length * 0.02)];
}

// Build the rock from the loaded glb and set it under the figure: the seat under his torso, the
// drop ahead of him (frame.forward), and the seat patch's upper quantile at his hips.
export function buildRock(gltf, figure, frame) {
  let mesh = null;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((child) => {
    if (child.isMesh && !mesh) mesh = child;
  });
  // Mesh quantization stores positions as normalised integers with the real scale on the node.
  // Copy them out as floats first: transforming the integer attribute in place would clip it.
  const quantized = mesh.geometry.attributes.position;
  const floats = new Float32Array(quantized.count * 3);
  for (let vertex = 0; vertex < quantized.count; vertex += 1) {
    floats[vertex * 3] = quantized.getX(vertex);
    floats[vertex * 3 + 1] = quantized.getY(vertex);
    floats[vertex * 3 + 2] = quantized.getZ(vertex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(floats, 3));
  geometry.setIndex(mesh.geometry.index.clone());
  geometry.applyMatrix4(mesh.matrixWorld);

  // Seat at the origin, stretched, scaled, and turned so FACING points along frame.forward.
  geometry.translate(-SEAT.x, 0, -SEAT.y);
  geometry.scale(SCALE, SCALE * STRETCH, SCALE);
  const yaw = Math.atan2(frame.forward.x, frame.forward.z) - Math.atan2(FACING.x, FACING.z);
  geometry.rotateY(yaw);
  geometry.computeVertexNormals();
  geometry.setAttribute('cavity', vertexCavity(geometry));

  const reach = FOOTPRINT * SCALE;
  const under = [];
  for (let vertex = 0; vertex < floats.length / 3; vertex += 1) {
    if (Math.hypot(floats[vertex * 3], floats[vertex * 3 + 2]) < reach) under.push(floats[vertex * 3 + 1]);
  }
  under.sort((x, y) => x - y);
  const footHeight = under[Math.floor(under.length * FOOT_QUANTILE)];
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const lift = seatHeight(figure, frame) - footHeight;

  const rock = new THREE.Mesh(geometry, rockMaterial({ top: max.y + lift, bottom: min.y + lift }));
  rock.position.set(frame.torso.x, lift, frame.torso.z);
  return rock;
}
