import * as THREE from 'three';
import { EMPTY_POSE, POSE_STORAGE_KEY } from './sceneConfig.js';

// The scene editor (dev and preview builds, CherryBlossomScene.jsx): reading and applying the
// scene's pose (camera, focus, backdrop, store, rider, fog), the orbit and transform handles, and
// the API the editor's panel drives (`api`). The reference aspect lives in the scene, read and set
// through the callbacks.
export function createSceneEditor({
  scene, camera, orbitControls, transformControls, transformHelper, focusMarker, editableObjects, mount,
  backdropFogUniform, baseCameraPosition, baseCameraTarget,
  getReferenceAspect, setReferenceAspect, measureStoreWidth,
  setPoseReadout, setFogDensity, setBackdropFogDensity,
}) {
  let editingActive = false;
  let activeSelection = 'camera';
  let initialPose = null;

  const roundPoseValue = (value) => Number(value.toFixed(3));
  const readPose = (name = activeSelection) => {
    if (name === 'camera') {
      return {
        position: camera.position.toArray().map(roundPoseValue),
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        target: orbitControls.target.toArray().map(roundPoseValue),
        fov: roundPoseValue(camera.fov),
      };
    }

    const object = editableObjects[name];
    if (!object) return EMPTY_POSE;
    return {
      position: object.position.toArray().map(roundPoseValue),
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z]
        .map(THREE.MathUtils.radToDeg)
        .map(roundPoseValue),
      scale: object.scale.toArray().map(roundPoseValue),
      target: orbitControls.target.toArray().map(roundPoseValue),
      fov: roundPoseValue(camera.fov),
    };
  };

  const readFullPose = () => ({
    referenceAspect: editingActive ? camera.aspect : getReferenceAspect(),
    camera: readPose('camera'),
    focus: readPose('focus'),
    backdrop: readPose('backdrop'),
    store: readPose('store'),
    rider: readPose('rider'),
    fogDensity: roundPoseValue(scene.fog.density),
    backdropFogDensity: roundPoseValue(backdropFogUniform.value),
  });

  const applyObjectPose = (object, pose) => {
    if (!object || !pose) return;
    if (pose.position) object.position.fromArray(pose.position);
    if (pose.rotation) object.rotation.set(...pose.rotation.map(THREE.MathUtils.degToRad));
    if (pose.scale) object.scale.fromArray(pose.scale);
    object.updateMatrixWorld(true);
  };

  const applyFullPose = (pose) => {
    if (!pose) return;
    if (Number.isFinite(pose.referenceAspect) && pose.referenceAspect > 0) {
      setReferenceAspect(pose.referenceAspect);
    }
    if (Number.isFinite(pose.fogDensity)) {
      scene.fog.density = THREE.MathUtils.clamp(pose.fogDensity, 0, 0.12);
      setFogDensity(scene.fog.density);
    }
    if (Number.isFinite(pose.backdropFogDensity)) {
      backdropFogUniform.value = THREE.MathUtils.clamp(pose.backdropFogDensity, 0, 0.12);
      setBackdropFogDensity(backdropFogUniform.value);
    }
    if (pose.camera) {
      if (pose.camera.position) camera.position.fromArray(pose.camera.position);
      if (pose.camera.target) orbitControls.target.fromArray(pose.camera.target);
      if (Number.isFinite(pose.camera.fov)) {
        camera.fov = pose.camera.fov;
        camera.updateProjectionMatrix();
      }
      baseCameraPosition.copy(camera.position);
      baseCameraTarget.copy(orbitControls.target);
    }
    if (pose.focus) {
      applyObjectPose(editableObjects.focus, pose.focus);
      orbitControls.target.copy(focusMarker.position);
      baseCameraTarget.copy(focusMarker.position);
    } else {
      focusMarker.position.copy(orbitControls.target);
    }
    applyObjectPose(editableObjects.backdrop, pose.backdrop);
    applyObjectPose(editableObjects.store, pose.store);
    applyObjectPose(editableObjects.rider, pose.rider);
    orbitControls.update();
    setPoseReadout(readPose());
  };

  const attachSelection = (name) => {
    activeSelection = name;
    transformControls.detach();
    if (editingActive && name !== 'camera' && editableObjects[name]) {
      if (name === 'focus') transformControls.setMode('translate');
      transformControls.attach(editableObjects[name]);
    }
    transformHelper.visible = editingActive && name !== 'camera' && Boolean(editableObjects[name]);
    focusMarker.visible = editingActive && name === 'focus';
    setPoseReadout(readPose(name));
  };

  const handleOrbitChange = () => {
    if (editingActive && activeSelection !== 'focus') {
      focusMarker.position.copy(orbitControls.target);
      baseCameraTarget.copy(orbitControls.target);
    }
    setPoseReadout(readPose());
  };
  const handleObjectChange = () => {
    if (activeSelection === 'focus') {
      orbitControls.target.copy(focusMarker.position);
      baseCameraTarget.copy(focusMarker.position);
      orbitControls.update();
    }
    setPoseReadout(readPose());
  };
  const handleDraggingChanged = (event) => {
    orbitControls.enabled = editingActive && !event.value;
  };
  orbitControls.addEventListener('change', handleOrbitChange);
  transformControls.addEventListener('objectChange', handleObjectChange);
  transformControls.addEventListener('dragging-changed', handleDraggingChanged);

  const api = {
    setEditing(value) {
      editingActive = value;
      if (value) {
        camera.position.copy(baseCameraPosition);
        orbitControls.target.copy(baseCameraTarget);
      } else {
        baseCameraPosition.copy(camera.position);
        baseCameraTarget.copy(orbitControls.target);
        setReferenceAspect(camera.aspect);
        measureStoreWidth();
      }
      orbitControls.update();
      if (value) orbitControls.connect(mount);
      else orbitControls.disconnect();
      orbitControls.enabled = value;
      transformControls.enabled = value;
      mount.dataset.editing = String(value);
      attachSelection(activeSelection);
    },
    select(name) {
      attachSelection(name);
    },
    setTransformMode(mode) {
      transformControls.setMode(mode);
    },
    setFogDensity(value) {
      if (!Number.isFinite(value)) return;
      scene.fog.density = THREE.MathUtils.clamp(value, 0, 0.12);
      setFogDensity(scene.fog.density);
    },
    setBackdropFogDensity(value) {
      if (!Number.isFinite(value)) return;
      backdropFogUniform.value = THREE.MathUtils.clamp(value, 0, 0.12);
      setBackdropFogDensity(backdropFogUniform.value);
    },
    update(section, index, value) {
      if (!Number.isFinite(value)) return;
      if (activeSelection === 'camera') {
        if (section === 'position') camera.position.setComponent(index, value);
        if (section === 'target') {
          orbitControls.target.setComponent(index, value);
          focusMarker.position.copy(orbitControls.target);
          baseCameraTarget.copy(orbitControls.target);
        }
        if (section === 'fov') {
          camera.fov = THREE.MathUtils.clamp(value, 15, 100);
          camera.updateProjectionMatrix();
        }
        orbitControls.update();
      } else {
        const object = editableObjects[activeSelection];
        if (!object) return;
        if (section === 'position' || section === 'scale') object[section].setComponent(index, value);
        if (section === 'rotation') {
          const rotation = [object.rotation.x, object.rotation.y, object.rotation.z];
          rotation[index] = THREE.MathUtils.degToRad(value);
          object.rotation.set(...rotation);
        }
        object.updateMatrixWorld(true);
        if (activeSelection === 'focus') {
          orbitControls.target.copy(focusMarker.position);
          baseCameraTarget.copy(focusMarker.position);
          orbitControls.update();
        }
      }
      setPoseReadout(readPose());
    },
    getPose: readFullPose,
    save() {
      const pose = readFullPose();
      window.localStorage.setItem(POSE_STORAGE_KEY, JSON.stringify(pose));
      return pose;
    },
    reset() {
      window.localStorage.removeItem(POSE_STORAGE_KEY);
      applyFullPose(initialPose);
    },
  };

  return {
    api,
    applyFullPose,
    // The default pose, applied and kept for reset.
    applyInitialPose(pose) {
      initialPose = pose;
      applyFullPose(pose);
    },
    // The handles back on whatever's selected (once the models it may point at exist).
    reattach: () => attachSelection(activeSelection),
    editing: () => editingActive,
    dispose() {
      orbitControls.removeEventListener('change', handleOrbitChange);
      transformControls.removeEventListener('objectChange', handleObjectChange);
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
    },
  };
}
