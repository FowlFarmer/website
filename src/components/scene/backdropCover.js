import * as THREE from 'three';
import {
  BACKDROP_COVER_BOB_STEPS, BACKDROP_COVER_MAX_SCALE, BACKDROP_COVER_OVERSCAN, BACKDROP_COVER_POINTER_STEPS,
  PARALLAX_CAMERA_SWAY, PARALLAX_FOCUS_SWAY,
} from './sceneConfig.js';

// Keeping the backdrop photo covering the screen however the camera sways (CherryBlossomScene.jsx).
// Desktop: the photo's plane is scaled up just enough that, across the whole parallax and bob
// envelope around the saved camera, it always covers the viewport (a search, redone only when the
// camera, its framing or the backdrop's pose changes). Phones: the photo's plane is fitted to that
// envelope directly, anchored at the bottom. `getBackdrop` and `getPlane` give the backdrop's group
// and its photo plane as they are now (they arrive once the photo has loaded).
export function createBackdropCover({ camera, baseCameraPosition, baseCameraTarget, ground, mobile, getBackdrop, getPlane }) {
  let backdrop = null;
  let backdropPlane = null;
  const sync = () => {
    backdrop = getBackdrop();
    backdropPlane = getPlane();
  };
  const backdropLocalCorners = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  const backdropProjectedCorners = [
    new THREE.Vector2(),
    new THREE.Vector2(),
    new THREE.Vector2(),
    new THREE.Vector2(),
  ];
  const viewportCoverCorners = [
    new THREE.Vector2(-BACKDROP_COVER_OVERSCAN, -BACKDROP_COVER_OVERSCAN),
    new THREE.Vector2(BACKDROP_COVER_OVERSCAN, -BACKDROP_COVER_OVERSCAN),
    new THREE.Vector2(BACKDROP_COVER_OVERSCAN, BACKDROP_COVER_OVERSCAN),
    new THREE.Vector2(-BACKDROP_COVER_OVERSCAN, BACKDROP_COVER_OVERSCAN),
  ];
  const backdropProjectedPoint = new THREE.Vector3();
  const coverCamera = new THREE.PerspectiveCamera();
  const coverLookAt = new THREE.Vector3();
  const backdropCoverKey = new Float64Array(24);
  const backdropCoverScratch = new Float64Array(24);
  let backdropCoverReady = false;
  const coverQuantization = (index) => (index === 0 || index >= 8 ? 1e5 : 1e4);
  const backdropCoverUnchanged = () => {
    const elements = backdrop.matrixWorld.elements;
    const scratch = backdropCoverScratch;
    scratch[0] = camera.aspect;
    scratch[1] = camera.fov;
    scratch[2] = baseCameraPosition.x;
    scratch[3] = baseCameraPosition.y;
    scratch[4] = baseCameraPosition.z;
    scratch[5] = baseCameraTarget.x;
    scratch[6] = baseCameraTarget.y;
    scratch[7] = baseCameraTarget.z;
    for (let index = 0; index < 16; index += 1) scratch[8 + index] = elements[index];
    if (!backdropCoverReady) return false;
    for (let index = 0; index < scratch.length; index += 1) {
      const factor = coverQuantization(index);
      if (Math.round(scratch[index] * factor) !== Math.round(backdropCoverKey[index] * factor)) return false;
    }
    return true;
  };

  const projectedPolygonContains = (point, polygon) => {
    let windingSign = 0;
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      const cross = (end.x - start.x) * (point.y - start.y)
        - (end.y - start.y) * (point.x - start.x);
      if (Math.abs(cross) < 0.00001) continue;
      const edgeSign = Math.sign(cross);
      if (windingSign && edgeSign !== windingSign) return false;
      windingSign = edgeSign;
    }
    return windingSign !== 0;
  };

  const applyParallaxSample = (sampleCamera, pointerX, pointerY, bob) => {
    sampleCamera.position.set(
      baseCameraPosition.x + pointerX * PARALLAX_CAMERA_SWAY.x,
      baseCameraPosition.y - pointerY * PARALLAX_CAMERA_SWAY.y + bob * PARALLAX_CAMERA_SWAY.bob,
      baseCameraPosition.z,
    );
    coverLookAt.set(
      baseCameraTarget.x - pointerX * PARALLAX_FOCUS_SWAY.x,
      baseCameraTarget.y + pointerY * PARALLAX_FOCUS_SWAY.y,
      baseCameraTarget.z,
    );
    sampleCamera.up.set(0, 1, 0);
    sampleCamera.lookAt(coverLookAt);
    sampleCamera.updateMatrixWorld(true);
  };

  const projectBackdropCorners = (sampleCamera) => {
    const bounds = backdropPlane.geometry.boundingBox;
    backdropPlane.updateMatrixWorld(true);
    backdropLocalCorners[0].set(bounds.min.x, bounds.min.y, 0);
    backdropLocalCorners[1].set(bounds.max.x, bounds.min.y, 0);
    backdropLocalCorners[2].set(bounds.max.x, bounds.max.y, 0);
    backdropLocalCorners[3].set(bounds.min.x, bounds.max.y, 0);
    backdropLocalCorners.forEach((corner, index) => {
      backdropProjectedPoint
        .copy(corner)
        .applyMatrix4(backdropPlane.matrixWorld)
        .project(sampleCamera);
      backdropProjectedCorners[index].set(
        backdropProjectedPoint.x,
        backdropProjectedPoint.y,
      );
    });
  };

  const sampleCoversViewport = (sampleCamera) => {
    projectBackdropCorners(sampleCamera);
    return viewportCoverCorners.every((corner) => (
      projectedPolygonContains(corner, backdropProjectedCorners)
    ));
  };

  const envelopeCoversViewport = () => {
    coverCamera.fov = camera.fov;
    coverCamera.aspect = camera.aspect;
    coverCamera.near = camera.near;
    coverCamera.far = camera.far;
    coverCamera.updateProjectionMatrix();
    for (const pointerX of BACKDROP_COVER_POINTER_STEPS) {
      for (const pointerY of BACKDROP_COVER_POINTER_STEPS) {
        for (const bob of BACKDROP_COVER_BOB_STEPS) {
          applyParallaxSample(coverCamera, pointerX, pointerY, bob);
          if (!sampleCoversViewport(coverCamera)) return false;
        }
      }
    }
    return true;
  };

  const updateDesktop = () => {
    if (!backdropPlane || !backdrop) return;
    const bounds = backdropPlane.geometry.boundingBox;
    if (!bounds) return;

    backdrop.updateMatrixWorld(true);
    if (backdropCoverUnchanged()) return;
    backdropCoverKey.set(backdropCoverScratch);
    backdropCoverReady = true;

    // Size the hidden inner plane for the full parallax/bob envelope around
    // the saved camera, not the live wiggling camera. That keeps coverage
    // during resize without the image jumping as the pointer moves.
    backdropPlane.scale.setScalar(1);
    if (!envelopeCoversViewport()) {
      let high = 1;
      do {
        high *= 1.25;
        backdropPlane.scale.setScalar(high);
      } while (high < BACKDROP_COVER_MAX_SCALE && !envelopeCoversViewport());

      let low = high / 1.25;
      for (let pass = 0; pass < 10; pass += 1) {
        const mid = (low + high) * 0.5;
        backdropPlane.scale.setScalar(mid);
        if (envelopeCoversViewport()) high = mid;
        else low = mid;
      }
      backdropPlane.scale.setScalar(Math.min(high * 1.02, BACKDROP_COVER_MAX_SCALE));
    }

  };

  const mobileBackdropKey = new Float64Array(8);
  const mobileBackdropScratch = new Float64Array(8);
  let mobileBackdropReady = false;
  const frameMobile = () => {
    if (!backdrop || !backdropPlane) return;
    mobileBackdropScratch[0] = camera.aspect;
    mobileBackdropScratch[1] = camera.fov;
    mobileBackdropScratch[2] = baseCameraPosition.x;
    mobileBackdropScratch[3] = baseCameraPosition.y;
    mobileBackdropScratch[4] = baseCameraPosition.z;
    mobileBackdropScratch[5] = baseCameraTarget.x;
    mobileBackdropScratch[6] = baseCameraTarget.y;
    mobileBackdropScratch[7] = baseCameraTarget.z;
    let mobileUnchanged = mobileBackdropReady;
    if (mobileUnchanged) {
      for (let index = 0; index < mobileBackdropKey.length; index += 1) {
        if (mobileBackdropKey[index] !== mobileBackdropScratch[index]) {
          mobileUnchanged = false;
          break;
        }
      }
    }
    if (mobileUnchanged) return;
    mobileBackdropKey.set(mobileBackdropScratch);
    mobileBackdropReady = true;

    // Fit the full parallax envelope in the photo's plane, rather than
    // enlarging a centered image afterward (which loses the bottom anchor).
    coverCamera.copy(camera);
    coverCamera.position.copy(baseCameraPosition);
    coverCamera.lookAt(baseCameraTarget);
    coverCamera.updateMatrixWorld(true);
    coverCamera.updateProjectionMatrix();
    const normal = coverCamera.getWorldDirection(new THREE.Vector3());
    backdrop.position.copy(baseCameraPosition).addScaledVector(normal, 140);
    backdrop.quaternion.copy(coverCamera.quaternion);
    backdrop.scale.setScalar(1);
    backdrop.updateMatrixWorld(true);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, backdrop.position);
    const ray = new THREE.Raycaster();
    const point = new THREE.Vector3();
    const bounds = new THREE.Box2();
    for (const x of BACKDROP_COVER_POINTER_STEPS) {
      for (const y of BACKDROP_COVER_POINTER_STEPS) {
        for (const bob of BACKDROP_COVER_BOB_STEPS) {
          applyParallaxSample(coverCamera, x, y, bob);
          coverCamera.updateMatrixWorld(true);
          for (const corner of viewportCoverCorners) {
            ray.setFromCamera(corner, coverCamera);
            if (ray.ray.intersectPlane(plane, point)) {
              backdrop.worldToLocal(point);
              bounds.expandByPoint(new THREE.Vector2(point.x, point.y));
            }
          }
        }
      }
    }
    const imageAspect = backdropPlane.geometry.parameters.width / backdropPlane.geometry.parameters.height;
    const height = Math.max(bounds.max.y - bounds.min.y, (bounds.max.x - bounds.min.x) / imageAspect);
    backdropPlane.scale.setScalar(height / 16);
    // Extra height extends upward into the sky. The photo's bottom always
    // reaches below the lowest visible corner, including Safari's tall canvas.
    backdropPlane.position.set((bounds.min.x + bounds.max.x) / 2, bounds.min.y + height / 2, 0);
    ground.visible = false;
  };

  return {
    // Whichever this layout uses.
    update: () => {
      sync();
      if (mobile) frameMobile();
      else updateDesktop();
    },
    frameMobile: () => {
      sync();
      frameMobile();
    },
  };
}
