import * as THREE from "three";
import { EARTH_RADIUS } from "./spaceScene.js";
import { latLonToVector3, orientToSurfaceNormal } from "./geo.js";

const MARKER_RADIUS = EARTH_RADIUS + 1.7;

function makeRing(radius, color, opacity) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.035, 8, 48),
    new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
}

export function createEarthMarker(location) {
  const group = new THREE.Group();
  const position = latLonToVector3(location.lat, location.lon, MARKER_RADIUS);
  group.position.copy(position);
  orientToSurfaceNormal(group, position);
  group.userData.location = location;

  const outerRing = makeRing(1.05, "#ffffff", 0.86);
  const innerRing = makeRing(0.48, location.id === "waterloo" ? "#ffdf5e" : "#8adfff", 0.95);
  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 16, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitTarget.material.userData.skipSceneOpacity = true;

  outerRing.userData.markerGroup = group;
  outerRing.userData.location = location;
  innerRing.userData.markerGroup = group;
  innerRing.userData.location = location;
  hitTarget.userData.markerGroup = group;
  hitTarget.userData.location = location;

  group.add(outerRing, innerRing, hitTarget);
  group.userData.rings = [outerRing, innerRing];
  group.userData.rayTargets = [outerRing, innerRing, hitTarget];

  return group;
}

export function updateEarthMarker(marker, elapsed, isHovered) {
  const pulse = 1 + Math.sin(elapsed * 3.4 + marker.position.x) * 0.04;
  marker.scale.setScalar(isHovered ? 1.18 : pulse);

  const [outerRing, innerRing] = marker.userData.rings;
  outerRing.material.opacity = isHovered ? 1 : 0.78;
  innerRing.material.opacity = isHovered ? 1 : 0.9;
}
