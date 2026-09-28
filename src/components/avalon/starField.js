import * as THREE from 'three';

// Each star is a camera-facing radiance asset in world space. The quad is only
// its carrier: this shader defines a white photosphere, temperature-colored halo,
// and faint optical diffraction. Bloom is a final lens effect, not the star itself.
const vertexShader = `
attribute vec3 aCenter; attribute vec3 aColor;
attribute float aRadius; attribute float aLuminosity; attribute float aPhase; attribute float aOrbit;
uniform float uTime; uniform float uViewportHeight;
varying vec2 vUv; varying vec3 vColor; varying float vEnergy; varying float vLuminosity;
void main() {
  float angle = uTime * aOrbit;
  vec3 center = aCenter;
  center.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * center.xy;
  vec4 viewCenter = modelViewMatrix * vec4(center, 1.);
  float distanceToCamera = max(.1, -viewCenter.z);
  float worldDiameter = aRadius * 8.;
  float projectedDiameter = worldDiameter * projectionMatrix[1][1] * uViewportHeight / (2. * distanceToCamera);
  // Keep subpixel stars stable, conserving their light as the footprint is enlarged.
  float coverage = min(1., pow(projectedDiameter / 3., 2.));
  worldDiameter *= max(1., 3. / max(projectedDiameter, .001));
  viewCenter.xy += position.xy * worldDiameter;
  gl_Position = projectionMatrix * viewCenter;
  vUv = uv; vColor = aColor; vLuminosity = aLuminosity;
  float scintillation = 1. + .055 * sin(uTime * .7 + aPhase) + .025 * sin(uTime * 1.13 + aPhase * 2.);
  vEnergy = coverage * scintillation * exp(-distanceToCamera * .004);
}`;
const fragmentShader = `
varying vec2 vUv; varying vec3 vColor; varying float vEnergy; varying float vLuminosity;
void main() {
  vec2 p = (vUv - .5) * 2.; float r = length(p);
  float photosphere = exp(-r*r*105.);
  float corona = exp(-r*r*24.) * .34;
  float halo = exp(-r*6.5) * .24;
  float diffraction = exp(-abs(p.x)*115.)*exp(-abs(p.y)*9.) + exp(-abs(p.y)*115.)*exp(-abs(p.x)*9.);
  float edge = 1. - smoothstep(.72, 1., r);
  vec3 whiteHot = mix(vColor, vec3(1.15), .8);
  vec3 radiance = whiteHot * photosphere * 2.8 + vColor * (corona + halo);
  radiance += mix(vColor, vec3(1.), .35) * diffraction * .075 * smoothstep(1.2, 3., vLuminosity);
  gl_FragColor = vec4(radiance * vLuminosity * vEnergy * edge, 1.);
}`;

export function createStarField(stars) {
  const geometry = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geometry.index = quad.index.clone();
  geometry.setAttribute('position', quad.attributes.position.clone());
  geometry.setAttribute('uv', quad.attributes.uv.clone()); quad.dispose();
  const attrs = { aCenter: [], aColor: [], aRadius: [], aLuminosity: [], aPhase: [], aOrbit: [] };
  for (const star of stars) {
    attrs.aCenter.push(...star.position); attrs.aColor.push(...star.color);
    attrs.aRadius.push(star.radius); attrs.aLuminosity.push(star.luminosity);
    attrs.aPhase.push(star.phase ?? 0); attrs.aOrbit.push(star.orbit ?? 0);
  }
  for (const [name, values] of Object.entries(attrs)) geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(values), name === 'aCenter' || name === 'aColor' ? 3 : 1));
  geometry.instanceCount = stars.length;
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uViewportHeight: { value: 1000 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // The carrier quad's bounds do not include the instanced world-space positions.
  mesh.frustumCulled = false;
  return mesh;
}

// Art-directed temperature palette in linear light: blue-white, neutral, amber.
export const starColors = [[.58, .83, 1.4], [.9, 1.03, 1.3], [1.18, 1.08, .9], [1.4, .81, .4]];
