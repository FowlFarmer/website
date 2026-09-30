import * as THREE from 'three';

// The ledge is kitbashed from photoscanned rock in Blender (scripts/assets/build-kitsune-cliff.py)
// with the dusk lighting, his shadow, grass and fallen petals baked in: the rock carries one lit
// texture, the dressing lit vertex colours. So it's shown unlit here, exactly as baked, and only
// the deep part of the face fades into the haze below.
const HAZE = new THREE.Color('#5b5f9c');
// Below the ledge top (cliff-local metres), where the face starts to fade and where it's gone.
const HAZE_START = -4;
const HAZE_END = -13;
// The bake is linear radiance; lift it to sit with the backdrop photo.
const EXPOSURE = 1.25;

function bakedMaterial(source, ground) {
  const material = new THREE.MeshBasicMaterial({
    map: source.map ?? null,
    vertexColors: !source.map,
    // The scans are open shells: their backs must render too, or they show as holes.
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.hazeColor = { value: HAZE };
    shader.uniforms.hazeStart = { value: ground + HAZE_START };
    shader.uniforms.hazeEnd = { value: ground + HAZE_END };
    shader.uniforms.exposure = { value: EXPOSURE };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHeight;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHeight = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 hazeColor;
uniform float hazeStart;
uniform float hazeEnd;
uniform float exposure;
varying float vHeight;`)
      .replace('#include <opaque_fragment>', `outgoingLight *= exposure;
outgoingLight = mix(outgoingLight, hazeColor, smoothstep(hazeStart, hazeEnd, vHeight));
#include <opaque_fragment>`);
  };
  return material;
}

export function buildCliff(gltf, frame) {
  const group = gltf.scene;
  group.name = 'Cliff ledge';
  group.traverse((child) => {
    if (!child.isMesh) return;
    const baked = bakedMaterial(child.material, frame.ground);
    child.material.dispose();
    child.material = baked;
    child.castShadow = false;
    child.receiveShadow = false;
  });
  // Cliff-local axes: X across the ledge (his side), Y up, Z back toward the camera.
  const placement = new THREE.Group();
  placement.add(group);
  placement.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.back));
  placement.position.set(frame.torso.x, frame.ground + 0.025, frame.torso.z);
  return placement;
}
