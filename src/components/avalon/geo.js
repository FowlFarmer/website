import * as THREE from "three";

const UP = new THREE.Vector3(0, 0, 1);

export function latLonToVector3(lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function orientToSurfaceNormal(object, position) {
  object.quaternion.setFromUnitVectors(UP, position.clone().normalize());
}
