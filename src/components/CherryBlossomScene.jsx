import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { createScenePerformanceMonitor } from './scenePerformance.mjs';
import { sceneViewport } from './sceneViewport.mjs';
import {
  MOBILE_SCENE_QUERY, PHONE_HIGHLIGHT_BOOST, PHONE_KITSUNE_SCALE, PHONE_KITSUNE_SHARE,
  closeLore, cycleGlow, experienceStage, openLore, phoneKitsuneTap, setHovered as setKitsuneHovered, setKitsuneShown, tapKitsune,
} from './experience/experienceStage.js';
import { closeInspo, openInspo } from './lawsonStage.js';
import { drawSceneMirrors } from './sceneMirror.jsx';
import { SCENE_PROGRESS_WEIGHT, releaseLoader, reportProgress, setStage } from '../bootLoader.js';
import { downloadSceneFiles, sceneFile, sceneFileUrls } from './sceneFiles.js';
import { KITSUNE_URLS } from './experience/kitsuneFiles.js';
import { onPageScroll, pageScrollY } from './pageScroll.js';
import {
  SHOW_FRAME_METER, auditOff, createFrameProfiler, markFrame, markLoad, onTuningChange, setTargetFps, tuning,
} from './frameStats.js';
import { createChimes } from './experience/kitsuneChimes.js';
import {
  EMPTY_POSE, AXES, DEFAULT_FOG_DENSITY, DEFAULT_BACKDROP_FOG_DENSITY, DEFAULT_SCENE_POSE, OBJECT_LABELS, TAB_LABELS, POSE_STORAGE_KEY, PARALLAX_CAMERA_SWAY, PARALLAX_FOCUS_SWAY, MOBILE_YAW_PERIOD, MOBILE_PHOTO_HEIGHT, MOBILE_PITCH_SPEED, MOBILE_PITCH_SETTLE_MS, BACKDROP_COVER_OVERSCAN, BACKDROP_COVER_MAX_SCALE, BACKDROP_COVER_POINTER_STEPS, BACKDROP_COVER_BOB_STEPS, DESKTOP_PIXEL_RATIO_CAP, FRAME_SLACK_MS, FRAME_JUDGE_SETTLE_MS, FRAME_JUDGE_FRAMES, FRAME_LATE_SHARE, FRAME_CAP_KEY, SCROLL_SETTLE_MS, KITSUNE_LAYER, FADE_MS, PHONE_KITSUNE_ASPECT, LAYOUT_SETTLE_MS,
} from './scene/sceneConfig.js';
import { createFadeLayer } from './scene/fadeLayer.js';
import { createPetalField, seededRandom } from './scene/petalField.js';
import { prepareMaterials, scaleAndGround } from './scene/modelPrep.js';
import { createBackdropCover } from './scene/backdropCover.js';
import SceneVectorInput from './scene/SceneVectorInput.jsx';

const SCENE_EDITOR_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_VERCEL_ENV === 'preview';
// On the quests page the editor tunes the kitsune instead: where its tails sit, and their light.
const TailPoseTuner = lazy(() => import('./experience/TailPoseTuner.jsx'));
const TailLightTuner = lazy(() => import('./experience/TailLightTuner.jsx'));

// Downloaded files stay in memory (three.js's file cache): rebuilding the scene (switching 3D back on,
// or crossing the phone/desktop breakpoint) reuses them instead of fetching them again, and a
// download still going when the first load gave up (SceneBackground.jsx) finishes into it.
THREE.Cache.enabled = true;

export default function CherryBlossomScene({ onLowPerformance, onReady }) {
  const captureMode = import.meta.env.DEV && new URLSearchParams(window.location.search).has('sceneCapture');
  const captureRequested = useRef(false);
  const [captureStatus, setCaptureStatus] = useState('Save background snapshot');
  const lowPerformanceRef = useRef(onLowPerformance);
  lowPerformanceRef.current = onLowPerformance;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia(MOBILE_SCENE_QUERY).matches);
  // Switching layout rebuilds the whole scene (a couple of seconds' work), so wait until the window
  // has settled on one side of the breakpoint rather than rebuilding on every crossing of a drag.
  useEffect(() => {
    const query = window.matchMedia(MOBILE_SCENE_QUERY);
    let settle = 0;
    const update = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => setMobileLayout(query.matches), LAYOUT_SETTLE_MS);
    };
    query.addEventListener('change', update);
    return () => {
      window.clearTimeout(settle);
      query.removeEventListener('change', update);
    };
  }, []);
  const mountRef = useRef(null);
  const editorApiRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const onQuests = useLocation().pathname === '/quests';
  const [kitsuneEditing, setKitsuneEditing] = useState(false);
  const [selection, setSelection] = useState('camera');
  const [transformMode, setTransformMode] = useState('translate');
  const [poseReadout, setPoseReadout] = useState(EMPTY_POSE);
  const [fogDensity, setFogDensity] = useState(DEFAULT_FOG_DENSITY);
  const [backdropFogDensity, setBackdropFogDensity] = useState(DEFAULT_BACKDROP_FOG_DENSITY);
  const [editorStatus, setEditorStatus] = useState('Orbit to move the camera');
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    // Freeze the large viewport in pixels as well, including browsers whose
    // viewport units resize with browser chrome. Re-measure on width changes.
    if (mobileLayout) mount.style.height = `${mount.clientHeight}px`;
    // The loading screen (bootLoader.js) waits until everything is built, compiled, on the GPU and
    // drawn once (ready, below): what's left to do then would freeze the page later instead. Its
    // percentage: each part weighted by about how long it takes on a fresh load (the downloads by
    // size, ~1 MB a unit, counted by sceneFiles.js; the setup steps here, by their measured time on
    // the same scale).
    const ready = () => {
      readyRef.current?.();
      releaseLoader('scene');
      setSceneReady(true);
    };
    const SETUP = { 'store setup': 0.4, 'kitsune setup': 2.4, 'warm-up': 0.6 };
    // Reported to the loading screen as one part, its share reserved from the start (SceneBackground.jsx).
    const weights = SETUP;
    const fractions = Object.fromEntries(Object.keys(weights).map((part) => [part, 0]));
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const progress = (part, fraction) => {
      fractions[part] = Math.max(fractions[part], fraction);
      const done = Object.entries(fractions).reduce((sum, [name, value]) => sum + value * weights[name], 0);
      reportProgress('scene', done / totalWeight, SCENE_PROGRESS_WEIGHT);
    };
    // The files, downloaded by sceneFiles.js (already going if the page started them: SceneBackground.jsx),
    // each handed to three.js's file cache once in, for its loaders to take from there.
    const riderTextures = (SHOW_FRAME_METER && tuning.riderTextures) || '512';
    downloadSceneFiles(sceneFileUrls({ mobile: mobileLayout, rider: riderTextures }));
    const fromDownloads = async (url) => {
      const data = await sceneFile(url);
      if (!/\.(jpe?g|png|webp)$/.test(url)) {
        THREE.Cache.add(`file:${url}`, data);
        return;
      }
      if (THREE.Cache.get(`image:${url}`)) return;
      const image = new Image();
      image.src = URL.createObjectURL(new Blob([data]));
      await image.decode();
      THREE.Cache.add(`image:${url}`, image);
    };

    const random = seededRandom();
    const reduceMotion = captureMode || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const performanceMonitor = createScenePerformanceMonitor();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb9c5ce);
    scene.fog = new THREE.FogExp2(0x777294, DEFAULT_FOG_DENSITY);

    const camera = new THREE.PerspectiveCamera(
      43,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      250,
    );
    camera.position.set(0, 2.6, 9.2);
    const baseCameraPosition = new THREE.Vector3(0, 2.6, 9.2);
    const baseCameraTarget = new THREE.Vector3(0, 1.88, -2.8);
    const modelCamera = new THREE.PerspectiveCamera();
    let referenceAspect = 1.6;
    let modelBounds = { storeMinX: -1, storeMaxX: 1 };
    const parallaxFocalPoint = new THREE.Vector3();

    const orbitControls = new OrbitControls(camera, mount);
    // The controls listen for the wheel without being passive, which makes every scroll of the page
    // wait on the main thread (it scrolls only once the wheel stops, then jumps). Listen only while
    // the scene editor is open.
    orbitControls.disconnect();
    orbitControls.enabled = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.075;
    orbitControls.screenSpacePanning = true;
    orbitControls.minDistance = 1.2;
    orbitControls.maxDistance = 35;
    orbitControls.target.set(0, 1.88, -2.8);

    // The pixel ratio: the display's, capped (or the preview's render settings, frameStats.js).
    const pixelRatio = () => (captureMode ? (mobileLayout ? 2 : 1)
      : tuning.pixelRatio ?? Math.min(window.devicePixelRatio, lowPower ? 1.1 : DESKTOP_PIXEL_RATIO_CAP));
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: tuning.antialias,
        alpha: false,
        powerPreference: 'high-performance',
      });
      markLoad('3D: renderer made');
    } catch {
      mount.dataset.webglFallback = 'true';
      ready();
      lowPerformanceRef.current?.('unavailable');
      return undefined;
    }

    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    // The quests page's kitsune shows on desktop only, for now.
    experienceStage.supported = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    mount.appendChild(renderer.domElement);

    const transformControls = new TransformControls(camera, renderer.domElement);
    const transformHelper = transformControls.getHelper();
    transformControls.enabled = false;
    transformHelper.visible = false;
    scene.add(transformHelper);

    // Lavender skylight and a low peach-pink key match the sunset photograph.
    const hemisphere = new THREE.HemisphereLight(0xa4aee8, 0x44394e, 0.48);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffa9b5, 1.1);
    sun.position.set(14, 12, 6);
    sun.target.position.set(-1, 8, 0);
    scene.add(sun.target);
    scene.add(sun);
    const roseFill = new THREE.DirectionalLight(0x8c9ee9, 0.22);
    roseFill.position.set(-10, 15, 4);
    scene.add(roseFill);
    [hemisphere, sun, roseFill].forEach((light) => light.layers.enable(1));

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({
        color: 0x384039,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.035;
    scene.add(ground);

    // Half the petals they once were: tuned by eye against their GPU cost (the frame meter's audit).
    const petalField = createPetalField(random, lowPower ? 80 : 205);
    petalField.layers.set(2);
    scene.add(petalField);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const focusMarker = new THREE.Group();
    const focusMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8dab,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.94,
    });
    const focusCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), focusMaterial);
    const focusRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 32), focusMaterial);
    focusRing.rotation.x = Math.PI / 2;
    focusMarker.add(focusCore, focusRing);
    focusMarker.position.copy(baseCameraTarget);
    focusMarker.visible = false;
    focusMarker.renderOrder = 110;
    scene.add(focusMarker);

    const editableObjects = {
      focus: focusMarker,
      backdrop: null,
      store: null,
      rider: null,
    };
    let editingActive = false;
    let activeSelection = 'camera';
    let initialPose = null;
    const backdropFogUniform = { value: DEFAULT_BACKDROP_FOG_DENSITY };
    const backdropFogColorUniform = { value: scene.fog.color };
    let backdropPlane = null;
    // Keeping the photo behind everything covering the screen (scene/backdropCover.js).
    const backdropCover = createBackdropCover({
      camera, baseCameraPosition, baseCameraTarget, ground, mobile: mobileLayout,
      getBackdrop: () => editableObjects.backdrop,
      getPlane: () => backdropPlane,
    });
    const updateBackdropCover = backdropCover.update;
    const frameMobileBackdrop = backdropCover.frameMobile;

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
      referenceAspect: editingActive ? camera.aspect : referenceAspect,
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
        referenceAspect = pose.referenceAspect;
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

    editorApiRef.current = {
      setEditing(value) {
        editingActive = value;
        if (value) {
          camera.position.copy(baseCameraPosition);
          orbitControls.target.copy(baseCameraTarget);
        } else {
          baseCameraPosition.copy(camera.position);
          baseCameraTarget.copy(orbitControls.target);
          referenceAspect = camera.aspect;
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

    if (import.meta.env.DEV) {
      window.__cherryScene = { renderer, scene, camera, modelCamera, editableObjects };
    }

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    let disposed = false;
    const handleContextLost = (event) => {
      event.preventDefault();
      if (!disposed) lowPerformanceRef.current?.('unavailable');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    // The store's lighting environment: it only lights the store and the rider. Resolves once
    // it's applied (or failed), since it changes which shaders they compile to.
    let environmentTarget;
    const loadEnvironment = () => new Promise((resolve) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      fromDownloads('/models/lawson/dawn-environment.hdr').then(() => new HDRLoader().load('/models/lawson/dawn-environment.hdr', (hdr) => {
        if (!disposed) {
          environmentTarget = pmrem.fromEquirectangular(hdr);
          scene.environment = environmentTarget.texture;
          scene.environmentIntensity = 0.18;
        }
        hdr.dispose();
        pmrem.dispose();
        resolve();
      }, undefined, () => { pmrem.dispose(); resolve(); })).catch(() => { pmrem.dispose(); resolve(); });
    });
    const disposeAsset = (asset) => asset.scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = object.material
        ? (Array.isArray(object.material) ? object.material : [object.material])
        : [];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => { if (value?.isTexture) value.dispose(); });
        material.dispose();
      });
    });
    // The rider with 512px textures everywhere: he's drawn under ~300px tall even on a big screen,
    // and the 2048px ones took ~64 MB of GPU memory (the 2048 and 1024px versions stay, to compare
    // in the frame meter's render settings).
    const loadModelAssets = () => Promise.all(['/models/lawson/lawson-mobile.glb', `/models/cherry-blossom/bicycle-rider-${riderTextures}.glb`]
      .map((url) => fromDownloads(url).then(() => loader.loadAsync(url))));
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // The scene's saved framing: the default, then any pose saved from the editor.
    const applySavedPose = () => {
      initialPose = DEFAULT_SCENE_POSE;
      applyFullPose(initialPose);
      const savedPose = window.localStorage.getItem(POSE_STORAGE_KEY);
      if (savedPose && !captureMode) {
        try {
          applyFullPose(JSON.parse(savedPose));
        } catch {
          window.localStorage.removeItem(POSE_STORAGE_KEY);
        }
      }
    };
    // Everything loads up front, behind the loading screen: the store, the rider, their lighting
    // and the kitsune, whichever page this is. Drawn only once their shaders are compiled (in the
    // background where the browser can).
    let modelsReady = false;
    const environmentLoaded = loadEnvironment();
    // A compile in the background that hasn't finished within COMPILE_MS (a stalled readiness check,
    // a throttled background tab) doesn't hold the load up: it carries on, and the warm-up frames
    // compile whatever's left, still behind the loading screen.
    const COMPILE_MS = 5000;
    const compiled = (promise, what) => new Promise((resolve) => {
      const late = window.setTimeout(() => {
        console.warn(`${what}: compiling took over ${COMPILE_MS}ms; finishing in the warm-up.`);
        resolve();
      }, COMPILE_MS);
      promise.catch(() => {}).then(() => {
        window.clearTimeout(late);
        resolve();
      });
    });
    const compileModels = () => {
      const compileCamera = camera.clone();
      compileCamera.layers.set(1);
      return compiled(renderer.compileAsync(modelGroup, compileCamera, scene), 'Store shaders');
    };
    // The store and the rider, with the store's lights.
    const setupModels = ([storeAsset, riderAsset]) => {
      // Normalize to the previous asset's local width so existing saved poses
      // keep their scale and framing. The detailed model includes its own sign.
      const building = storeAsset.scene;
      const bounds = new THREE.Box3().setFromObject(building);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 0.98618 / size.x;
      building.scale.setScalar(scale);
      building.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const store = new THREE.Group();
      store.add(building);
      prepareMaterials(store, lowPower ? 2 : Math.min(maxAnisotropy, 4));
      store.traverse((object) => {
        if (!object.isMesh) return;
        const material = object.material;
        // Printed surfaces should pick up scene lighting rather than glow.
        if (/Printed Japanese|Small product labels|Photo reference|Interior ivory|Refrigerator/.test(material.name)) {
          material.emissiveIntensity = 0.3;
        }
        if (material.name === 'Lightbox opal white') {
          material.emissive.setRGB(0.58, 0.48, 0.52);
        }
        if (material.name === 'Fluorescent diffusers') {
          material.emissive.setRGB(1, 0.88, 0.84);
        }
        // Physical transmission re-renders the whole store into a texture
        // every frame and halved the frame rate. Alpha-blended glass with
        // the same environment reflections reads the same at this scale.
        if (material.transmission > 0) {
          const frosted = material.name === 'Frosted lower panels';
          material.transmission = 0;
          material.roughness = frosted ? 0.52 : 0.045;
          material.envMapIntensity = 0.7;
          material.transparent = true;
          material.opacity = frosted ? 0.78 : 0.24;
        }
        if (material.transparent) {
          material.depthWrite = false;
          object.renderOrder = 1;
        }
      });
      modelGroup.add(store);
      editableObjects.store = store;
      // Lights follow the building's editable pose. Convert their positions
      // from source metres into the normalized store's local coordinates.
      const lightScale = scale * DEFAULT_SCENE_POSE.store.scale[0];
      for (const x of [-4.5, 4.5]) {
        for (const z of [2, -2.8]) {
          const light = new THREE.PointLight(0xffe6df, 16 * lightScale ** 2, 12 * lightScale, 2);
          light.position.set((x - center.x) * scale, (3.1 - bounds.min.y) * scale, (z - center.z) * scale);
          store.add(light);
        }
      }

      const rider = riderAsset.scene;
      scaleAndGround(rider, 3.25);
      rider.position.set(2.85, -0.015, 1.45);
      rider.rotation.y = -Math.PI / 2 + 0.12;
      prepareMaterials(rider, maxAnisotropy);
      modelGroup.add(rider);
      editableObjects.rider = rider;
      modelGroup.traverse((object) => object.layers.set(1));
    };
    const textureLoader = new THREE.TextureLoader();
    // The kitsune downloads alongside (it's set up as it arrives: loadKitsune, below).
    Promise.resolve().then(() => { if (!disposed) loadKitsune(); });
    Promise.all([
      ((url) => fromDownloads(url).then(() => textureLoader.loadAsync(url)))(mobileLayout ? '/images/scene/fuji-mobile.jpg' : '/images/scene/fuji_hd.jpg'),
      loadModelAssets(),
      environmentLoaded,
    ])
      .then(async ([backdropTexture, models]) => {
        if (disposed) {
          backdropTexture.dispose();
          models?.forEach(disposeAsset);
          return;
        }
        backdropTexture.colorSpace = THREE.SRGBColorSpace;
        backdropTexture.anisotropy = Math.min(maxAnisotropy, 8);
        if (mobileLayout) backdropTexture.repeat.y = MOBILE_PHOTO_HEIGHT;
        const backdropAspect = backdropTexture.image.width / (backdropTexture.image.height * (mobileLayout ? MOBILE_PHOTO_HEIGHT : 1));
        const backdropHeight = 16;
        const backdropMaterial = new THREE.MeshBasicMaterial({
          map: backdropTexture,
          fog: false,
          toneMapped: false,
        });
        backdropMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uBackdropFogDensity = backdropFogUniform;
          shader.uniforms.uBackdropFogColor = backdropFogColorUniform;
          shader.vertexShader = `varying float vBackdropFogDepth;\n${shader.vertexShader}`
            .replace(
              '#include <project_vertex>',
              '#include <project_vertex>\nvBackdropFogDepth = -mvPosition.z;',
            );
          shader.fragmentShader = `
            uniform float uBackdropFogDensity;
            uniform vec3 uBackdropFogColor;
            varying float vBackdropFogDepth;
          ${shader.fragmentShader}`.replace(
            '#include <fog_fragment>',
            `
              float backdropFogFactor = 1.0 - exp(
                -uBackdropFogDensity * uBackdropFogDensity
                * vBackdropFogDepth * vBackdropFogDepth
              );
              gl_FragColor.rgb = mix(
                gl_FragColor.rgb,
                uBackdropFogColor,
                clamp(backdropFogFactor, 0.0, 1.0)
              );
            `,
          );
        };
        backdropMaterial.customProgramCacheKey = () => 'image-backdrop-fog-v1';
        backdropPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(backdropHeight * backdropAspect, backdropHeight),
          backdropMaterial,
        );
        backdropPlane.geometry.computeBoundingBox();
        const backdrop = new THREE.Group();
        backdrop.add(backdropPlane);
        backdrop.position.set(0, 10, -13.5);
        backdrop.renderOrder = -10;
        scene.add(backdrop);
        editableObjects.backdrop = backdrop;

        if (models) setupModels(models);

        applySavedPose();
        attachSelection(activeSelection);
        measureStoreWidth();
        if (mobileLayout) frameMobileBackdrop();
        if (models) {
          markLoad('store & rider: downloaded');
          setStage('store shaders');
          await compileModels();
          if (disposed) return;
          markLoad('store & rider: compiled');
          progress('store setup', 1);
          modelsReady = true;
        }

        mount.dataset.sceneLoaded = 'true';
        markLoad('3D: scene up');
      })
      .catch((error) => {
        if (disposed) return;
        console.error('Unable to load the convenience store scene.', error);
        mount.dataset.assetFallback = 'true';
        lowPerformanceRef.current?.('unavailable');
        ready();
      });

    // Clicks on the store or the rider open the inspo: their boxes, and where the models were last
    // drawn on screen (CSS pixels, from the bottom left), or null when they weren't.
    let modelBox = null;
    let modelsDrawn = null;
    let modelFade = null;
    const modelRay = new THREE.Raycaster();
    const modelRayLocal = new THREE.Ray();
    const lawsonHit = (event) => {
      if (!modelsDrawn || editingActive || !modelBox) return false;
      const x = (event.clientX - modelsDrawn.x) / modelsDrawn.width;
      const y = (window.innerHeight - event.clientY - modelsDrawn.y) / modelsDrawn.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return false;
      modelRay.setFromCamera(new THREE.Vector2(x * 2 - 1, y * 2 - 1), modelCamera);
      modelRayLocal.copy(modelRay.ray).applyMatrix4(modelGroup.matrixWorld.clone().invert());
      return modelRayLocal.intersectsBox(modelBox);
    };

    // The kitsune (figure, tails and rock) for the quests page. It loads in the background once the
    // scene is up and the page is idle (or at once, if the quests page wants it), compiles its
    // shaders and warms its bloom, and only then is ready to fade in. It draws over the backdrop,
    // under the petals, and is lit only by its own lights.
    let kitsune = null;
    let kitsuneGlow = null;
    let chimes = null;
    let kitsuneReady = false;
    // Set if the kitsune couldn't load: the loading screen stops waiting for it.
    let kitsuneFailed = false;
    // His textures onto the GPU one a frame before he's first drawn, instead of all in that frame
    // (with the page's other work going on, a freeze of a few hundred ms as he loaded).
    const uploadGradually = (root) => new Promise((resolve) => {
      const textures = new Set();
      root?.traverse((object) => [].concat(object.material ?? []).forEach((material) => {
        Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
        Object.values(material.uniforms ?? {}).forEach(({ value }) => { if (value?.isTexture) textures.add(value); });
      }));
      const queue = [...textures];
      const next = () => {
        if (disposed || !queue.length) return resolve();
        renderer.initTexture(queue.shift());
        return window.requestAnimationFrame(next);
      };
      next();
    });
    const loadKitsune = () => {
      markLoad('kitsune: requested');
      Promise.all([import('./experience/kitsuneRig.js'), import('./experience/kitsuneHologram.js')])
        .then(([rig, hologram]) => Promise.all(KITSUNE_URLS.map(fromDownloads)).then(() => rig.loadKitsuneAssets(loader)).then((assets) => {
          if (disposed) return undefined;
          markLoad('kitsune: downloaded');
          setStage('kitsune build');
          kitsune = rig.createKitsune(assets, {
            layer: KITSUNE_LAYER,
            highlightBoost: mobileLayout ? PHONE_HIGHLIGHT_BOOST : 1,
            onHover: (index) => {
              document.body.style.cursor = index >= 0 ? 'pointer' : '';
              setKitsuneHovered(index);
            },
          });
          scene.add(kitsune.root);
          chimes = createChimes();
          if (import.meta.env.DEV && window.__cherryScene) window.__cherryScene.chimes = chimes;
          if (import.meta.env.DEV && window.__cherryScene) window.__cherryScene.kitsune = kitsune;
          const frame = kitsuneFrame();
          if (mobileLayout) kitsune.setPhoneView(frame.width / frame.height);
          else kitsune.setAspect(frame.width / frame.height);
          kitsuneGlow = hologram.createGlowLayer(renderer, scene, kitsune.camera);
          kitsuneGlow.setSize(frame.width, frame.height, tuning.glowScale);
          markLoad('kitsune: built');
          progress('kitsune setup', 0.4);
          // The tails settle on their thread while his shaders compile.
          setStage('tail physics');
          kitsune.ready.then(() => setStage('kitsune shaders'));
          // After the lighting: it changes which shaders his materials compile to.
          return Promise.resolve(environmentLoaded).then(() => Promise.all([
            compiled(renderer.compileAsync(kitsune.root, kitsune.camera, scene), 'Kitsune shaders').then(() => setStage('glow shaders')),
            compiled(kitsuneGlow.compile(kitsune.camera), 'Glow shaders'), kitsune.ready,
          ]));
        }))
        .then(() => {
          setStage('textures');
          return uploadGradually(kitsune?.root);
        })
        .then(() => {
          if (disposed || !kitsune) return;
          setStage('glow');
          kitsune.update(0, performance.now());
          kitsuneGlow.warm();
          renderer.setViewport(0, 0, viewportWidth, viewportHeight);
          markLoad('kitsune: compiled');
          progress('kitsune setup', 1);
          kitsuneReady = true;
        })
        .catch((error) => {
          console.error('Unable to load the kitsune.', error);
          kitsuneFailed = true;
        });
    };
    // The fades, 0 to 1: the store and rider, and the kitsune. One fades out before the other fades
    // in. They start where the page wants them, once the scene is up.
    let modelsAlpha = 1;
    let kitsuneAlpha = 0;
    let fadesStarted = false;
    const approach = (value, target, step) => (value < target ? Math.min(target, value + step) : Math.max(target, value - step));
    const updateFades = (seconds) => {
      const wantKitsune = experienceStage.show === 'kitsune' && experienceStage.supported;
      if (!fadesStarted) {
        fadesStarted = true;
        modelsAlpha = wantKitsune ? 0 : 1;
      }
      const step = (seconds * 1000) / FADE_MS;
      modelsAlpha = approach(modelsAlpha, wantKitsune || kitsuneAlpha > 0 || !modelsReady ? 0 : 1, step);
      kitsuneAlpha = approach(kitsuneAlpha, wantKitsune && kitsuneReady && modelsAlpha === 0 ? 1 : 0, step);
      setKitsuneShown(kitsuneAlpha > 0);
    };
    // Once everything is loaded, a few frames drawn behind the loading screen in every state the
    // page will show: the store and the kitsune each at full strength, then mid-fade (the fade's own
    // layer), then as the page wants them. Whatever's left (textures to upload, a shader variant
    // the compile missed, a buffer to allocate) happens here, not on the first switch between
    // the pages. Then the loading screen goes.
    let warmFrame = -1;
    const warmUp = () => {
      if (warmFrame >= 4) return;
      if (warmFrame < 0) {
        if (!modelsReady || !(kitsuneReady || kitsuneFailed) || mount.dataset.sceneLoaded !== 'true') return;
        warmFrame = 0;
      }
      warmFrame += 1;
      const wantKitsune = experienceStage.show === 'kitsune' && kitsuneReady;
      if (warmFrame === 1) {
        modelsAlpha = 1;
        kitsuneAlpha = kitsuneReady ? 1 : 0;
      } else if (warmFrame === 2) {
        modelsAlpha = 0.5;
        kitsuneAlpha = kitsuneReady ? 0.5 : 0;
      } else {
        modelsAlpha = wantKitsune ? 0 : 1;
        kitsuneAlpha = wantKitsune ? 1 : 0;
      }
      setKitsuneShown(kitsuneAlpha > 0);
      progress('warm-up', warmFrame / 4);
      setStage(['first frame', 'fade frame', 'last frame', 'done'][warmFrame - 1]);
      if (warmFrame === 4) {
        markLoad('3D: warmed up');
        ready();
      }
    };
    // Where the kitsune's view sits on screen, in CSS pixels from the bottom left: scaled down
    // about the bottom-right corner.
    const kitsuneShown = () => kitsune && kitsuneAlpha > 0;
    // On phones he's a fixed band across the bottom of the visible screen instead (above any part
    // of the canvas under Safari's toolbar), and doesn't shrink.
    const kitsuneView = (width, height) => {
      if (mobileLayout) {
        const inset = Math.max(0, viewportHeight - safeViewportHeight);
        // A phone on its side: the right half of the screen, full height, with the page on the left.
        if (width > safeViewportHeight) {
          const half = Math.round(width / 2);
          return { x: half, y: inset, width: width - half, height: safeViewportHeight };
        }
        // The band (no wider than PHONE_KITSUNE_ASPECT), shrunk to PHONE_KITSUNE_SCALE in the
        // bottom-right corner.
        const bandHeight = safeViewportHeight * PHONE_KITSUNE_SHARE;
        const bandWidth = Math.min(width, bandHeight * PHONE_KITSUNE_ASPECT);
        const shownWidth = Math.round(bandWidth * PHONE_KITSUNE_SCALE);
        return { x: width - shownWidth, y: inset, width: shownWidth, height: Math.round(bandHeight * PHONE_KITSUNE_SCALE) };
      }
      const { scale } = experienceStage;
      return { x: (1 - scale) * width, y: 0, width: width * scale, height: height * scale };
    };
    // The kitsune's view at full size, which his camera and glow are sized to.
    const kitsuneFrame = () => {
      const { width, height } = kitsuneView(viewportWidth, viewportHeight);
      return mobileLayout ? { width, height } : { width: viewportWidth, height: viewportHeight };
    };
    // The pointer over the kitsune's view, -1 to 1 each way, or null when it's off the view.
    const kitsuneAt = (event) => {
      if (!kitsuneShown() || editingActive) return null;
      const view = kitsuneView(window.innerWidth, window.innerHeight);
      const x = (event.clientX - view.x) / view.width;
      const y = (window.innerHeight - event.clientY - view.y) / view.height;
      return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x: x * 2 - 1, y: y * 2 - 1 };
    };
    const kitsunePointer = (event) => {
      const at = kitsuneAt(event);
      if (!at) {
        kitsune?.pointer(null);
        return;
      }
      kitsune.pointer(at.x, at.y, event.timeStamp, experienceStage.hover);
    };
    // A click on the kitsune opens its lore; one on the store (or the rider in front of it) opens
    // the inspo. Clicks through the page's cards count; ones on anything that handles its own
    // click (links, buttons, fields, videos, photos that open) don't.
    const handleKitsuneClick = (event) => {
      if (event.target.closest('a, button, input, textarea, select, label, video, iframe, dialog, [role="button"], [role="dialog"], [contenteditable], .media-frame, .navbar, .scene-editor-panel, .kitsune-tuner, .scene-performance-control, .popup-backdrop')) return;
      // On phones there's no hover: a tap on the kitsune moves the role card on (Quests.jsx); the
      // lore opens from its own button.
      if (mobileLayout) {
        if (kitsuneShown() && !editingActive && phoneKitsuneTap(event)) tapKitsune();
        return;
      }
      const at = kitsuneAt(event);
      if (at && kitsune.hits(at.x, at.y)) openLore(event.clientX, event.clientY);
      else if (lawsonHit(event)) openInspo();
    };

    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    const petalWind = petalField.userData.wind;
    let lastWindFrameAt = performance.now();
    const handlePointerLeave = () => petalWind.leave();
    const startTime = performance.now();
    let animationFrame;
    let visible = !document.hidden;

    const handlePointerMove = (event) => {
      if (backgroundTap && Math.hypot(event.clientX - backgroundTap.x, event.clientY - backgroundTap.y) > 10) backgroundTap = null;
      if (mobileLayout || event.pointerType === 'touch') return;
      targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
      kitsune?.setSway(targetPointer.x, -targetPointer.y);
      if (event.pointerType === 'mouse') kitsunePointer(event);
      if (!reduceMotion && !editingActive && event.pointerType === 'mouse') {
        petalWind.move(targetPointer.x, -targetPointer.y, performance.now() / 1000, camera.aspect);
      }
    };
    let backgroundTap = null;
    const handleTapStart = (event) => {
      backgroundTap = null;
      if (!mobileLayout || reduceMotion || editingActive || !event.isPrimary || event.pointerType !== 'touch') return;
      if (event.target.closest('a, button, input, textarea, select, video, iframe, dialog, [role="button"], [contenteditable], .media-frame, .glass-effect, .glass-effect-2, .scene-editor-panel, .kitsune-tuner, .navbar')) return;
      backgroundTap = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), scroll: pageScrollY() };
    };
    const cancelTap = () => { backgroundTap = null; };
    const handleTapEnd = (event) => {
      const tap = backgroundTap;
      backgroundTap = null;
      if (!tap || event.pointerId !== tap.id || performance.now() - tap.at > 350 ||
          Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10 || Math.abs(pageScrollY() - tap.scroll) > 5) return;
      // Use the actual canvas rectangle: Safari's toolbar can change the visible
      // area while the stable background canvas remains taller than the screen.
      const bounds = renderer.domElement.getBoundingClientRect();
      petalWind.burst((event.clientX - bounds.left) / bounds.width * 2 - 1,
        1 - (event.clientY - bounds.top) / bounds.height * 2, camera.aspect);
    };
    let lastScrollY = pageScrollY();
    let lastScrollAt = performance.now();
    let scrollPitch = 0;
    let targetScrollPitch = 0;
    const handleScrollPitch = () => {
      if (!mobileLayout) return;
      const now = performance.now();
      const deltaY = pageScrollY() - lastScrollY;
      const deltaMs = Math.max(now - lastScrollAt, 1);
      lastScrollY = pageScrollY();
      lastScrollAt = now;
      targetScrollPitch = THREE.MathUtils.clamp(
        (deltaY / deltaMs) * (1000 / MOBILE_PITCH_SPEED),
        -1,
        1,
      );
    };
    const handleVisibility = () => {
      performanceMonitor.reset();
      visible = !document.hidden;
    };
    // svh/lvh remain stable while Safari expands/collapses its toolbar.
    const safeViewport = document.createElement('div');
    safeViewport.style.cssText = 'position:absolute;height:100svh;width:0;visibility:hidden;pointer-events:none';
    mount.appendChild(safeViewport);
    const measureStoreWidth = () => {
      if (!editableObjects.store) return;
      modelGroup.rotation.y = 0;
      modelGroup.updateMatrixWorld(true);
      modelCamera.copy(camera);
      modelCamera.position.copy(baseCameraPosition);
      modelCamera.lookAt(baseCameraTarget);
      modelCamera.aspect = referenceAspect;
      modelCamera.updateProjectionMatrix();
      modelCamera.updateMatrixWorld(true);
      // Only the store's horizontal span in the authored frame matters: the
      // frame itself is what gets pinned, so its crop is preserved as-is.
      const projectedStore = new THREE.Box2();
      editableObjects.store.traverse((object) => {
        if (!object.isMesh) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox;
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              const point = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld).project(modelCamera);
              projectedStore.expandByPoint(new THREE.Vector2(point.x, point.y));
            }
          }
        }
      });
      modelBounds = { storeMinX: projectedStore.min.x, storeMaxX: projectedStore.max.x };
      // One box around the store and the rider in front of it, in the model group's frame as posed,
      // for clicks on them.
      const toModels = modelGroup.matrixWorld.clone().invert();
      const box = new THREE.Box3();
      [editableObjects.store, editableObjects.rider].filter(Boolean).forEach((object) => object.traverse((mesh) => {
        if (!mesh.isMesh) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox.clone().applyMatrix4(toModels.clone().multiply(mesh.matrixWorld)));
      }));
      modelBox = box.isEmpty() ? null : box;
    };
    let viewportWidth = mount.clientWidth;
    let viewportHeight = mount.clientHeight;
    let safeViewportHeight = safeViewport.clientHeight || viewportHeight;
    let modelBottomInset = 0;
    const modelView = { x: 0, y: 0, width: 0, height: 0, scale: 1, storeWidth: 0 };
    let modelViewSignature = '';
    const visualViewport = window.visualViewport;
    const updateModelAnchor = () => {
      const visibleBottom = visualViewport
        ? visualViewport.height + visualViewport.offsetTop
        : window.innerHeight;
      modelBottomInset = mobileLayout ? Math.max(0, viewportHeight - visibleBottom) : 0;
    };
    updateModelAnchor();
    const handleResize = () => {
      performanceMonitor.reset();
      updateModelAnchor();
      const width = mount.clientWidth;
      // Toolbar changes move only the model anchor, not the background or scale.
      if (mobileLayout && width === viewportWidth) return;
      if (mobileLayout) {
        mount.style.height = '';
        mount.style.height = `${mount.clientHeight}px`;
      }
      const height = Math.max(mount.clientHeight, 1);
      if (width === viewportWidth && height === viewportHeight) return;
      viewportWidth = width;
      viewportHeight = height;
      safeViewportHeight = safeViewport.clientHeight || height;
      updateModelAnchor();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      petalField.material.uniforms.uAspect.value = camera.aspect;
      petalField.material.uniforms.uTanHalfFov.value = Math.tan(
        THREE.MathUtils.degToRad(camera.fov / 2),
      );
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(width, height);
      const frame = kitsuneFrame();
      if (mobileLayout) kitsune?.setPhoneView(frame.width / frame.height);
      else kitsune?.setAspect(frame.width / frame.height);
      kitsuneGlow?.setSize(frame.width, frame.height, tuning.glowScale);
      if (mobileLayout) frameMobileBackdrop();
      updateBackdropCover();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleKitsuneClick);
    window.addEventListener('pointerdown', handleTapStart, { passive: true });
    window.addEventListener('pointerup', handleTapEnd, { passive: true });
    window.addEventListener('pointercancel', cancelTap, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('blur', handlePointerLeave);
    const stopScrollPitch = onPageScroll(handleScrollPitch);
    window.addEventListener('resize', handleResize);
    visualViewport?.addEventListener('resize', updateModelAnchor, { passive: true });
    visualViewport?.addEventListener('scroll', updateModelAnchor, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    const stopScrollCancel = onPageScroll(cancelTap);

    let lastRenderedAt = 0;
    let lastPageScrollAt = -Infinity;
    let scrollFrame = 0;
    const stopScrollWatch = onPageScroll(() => { lastPageScrollAt = performance.now(); });
    // At most 60 frames a second (a 120 Hz display would otherwise draw the scene twice as often),
    // or 30 where this device has been found not to keep up (FRAME_JUDGE_*), or the preview's cap.
    let deviceCap = 60;
    try { if (localStorage.getItem(FRAME_CAP_KEY) === '30') deviceCap = 30; } catch { /* Storage unavailable: 60. */ }
    const capFor = () => tuning.frameCap ?? deviceCap;
    let judgeFrom = 0;
    let judgedFrames = 0;
    let lateFrames = 0;
    // Called with each drawn frame's gap from the last: drops this device to 30 if it can't keep 60.
    const judgeFrame = (now, gap) => {
      if (deviceCap !== 60 || tuning.frameCap != null || warmFrame < 4 || gap > 250) return;
      judgeFrom ||= now + FRAME_JUDGE_SETTLE_MS;
      if (now < judgeFrom || judgedFrames >= FRAME_JUDGE_FRAMES) return;
      judgedFrames += 1;
      if (gap > 1.5 * (1000 / 60)) lateFrames += 1;
      if (judgedFrames < FRAME_JUDGE_FRAMES || lateFrames <= FRAME_LATE_SHARE * FRAME_JUDGE_FRAMES) return;
      deviceCap = 30;
      frameInterval = 1000 / 30;
      setTargetFps(30);
      try { localStorage.setItem(FRAME_CAP_KEY, '30'); } catch { /* As above. */ }
    };
    let frameInterval = capFor() ? 1000 / capFor() : 0;
    setTargetFps(capFor() || null);
    // The preview's render settings, live (antialiasing waits for a reload).
    const petalCount = petalField.geometry.instanceCount;
    const applyTuning = () => {
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(viewportWidth, viewportHeight);
      const frame = kitsuneFrame();
      kitsuneGlow?.setSize(frame.width, frame.height, tuning.glowScale);
      petalField.geometry.instanceCount = Math.round(petalCount * tuning.petals);
      frameInterval = capFor() ? 1000 / capFor() : 0;
      setTargetFps(capFor() || null);
      if (mobileLayout) frameMobileBackdrop();
      updateBackdropCover();
    };
    if (SHOW_FRAME_METER) applyTuning();
    const stopTuning = onTuningChange(applyTuning);
    const profiler = createFrameProfiler(renderer.getContext());
    const animate = (now = performance.now()) => {
      animationFrame = window.requestAnimationFrame(animate);
      // A frame arriving a hair early (the display's timing wobbles) still counts: without the
      // slack, a 60 cap on a 60 Hz display would drop frames at random.
      if (!visible || now - lastRenderedAt < frameInterval - FRAME_SLACK_MS) return;
      // While the page scrolls (the preview's render settings): draw every other frame, or hold the
      // last one, leaving the GPU to the scrolling and the glass it moves over.
      if (tuning.scrolling !== 'full' && now - lastPageScrollAt < SCROLL_SETTLE_MS) {
        scrollFrame += 1;
        if (tuning.scrolling === 'paused' || scrollFrame % 2) return;
      }
      judgeFrame(now, now - lastRenderedAt);
      lastRenderedAt = now;
      const frameStart = performance.now();
      profiler.begin('update');

      // Watched only once warmed up: the warm-up's frames (behind the loading screen) are slow on purpose.
      if (mount.dataset.sceneLoaded === 'true' && warmFrame >= 4 && !editingActive && !captureMode) {
        if (performanceMonitor.sample(now)) lowPerformanceRef.current?.();
      } else performanceMonitor.reset();
      const elapsed = (performance.now() - startTime) / 1000;
      const motionTime = reduceMotion ? 0.5 : elapsed;
      pointer.lerp(targetPointer, 0.035);
      if (captureMode) pointer.set(0, 0);
      const windDt = (now - lastWindFrameAt) / 1000;
      if (mount.dataset.sceneLoaded === 'true') updateFades(Math.min(windDt, 0.05));
      warmUp();
      lastWindFrameAt = now;
      if (!reduceMotion) {
        if (petalWind.step(windDt, motionTime, camera.aspect)) {
          petalField.geometry.attributes.aWindMotion.needsUpdate = true;
        }
      }
      if (editingActive) {
        orbitControls.update();
        modelGroup.rotation.y = 0;
      } else if (mobileLayout) {
        const yaw = reduceMotion ? 0 : Math.sin((motionTime * Math.PI * 2) / MOBILE_YAW_PERIOD);
        if (reduceMotion) {
          targetScrollPitch = 0;
          scrollPitch = 0;
        } else {
          if (now - lastScrollAt > MOBILE_PITCH_SETTLE_MS) targetScrollPitch = 0;
          scrollPitch += (targetScrollPitch - scrollPitch) * (targetScrollPitch === 0 ? 0.06 : 0.18);
        }
        camera.position.set(
          baseCameraPosition.x + yaw * PARALLAX_CAMERA_SWAY.x,
          baseCameraPosition.y - scrollPitch * PARALLAX_CAMERA_SWAY.y
            + Math.sin(motionTime * 0.18) * PARALLAX_CAMERA_SWAY.bob,
          baseCameraPosition.z,
        );
        parallaxFocalPoint.set(
          baseCameraTarget.x - yaw * PARALLAX_FOCUS_SWAY.x,
          baseCameraTarget.y + scrollPitch * PARALLAX_FOCUS_SWAY.y,
          baseCameraTarget.z,
        );
        camera.lookAt(parallaxFocalPoint);
        modelGroup.rotation.y = yaw * 0.009;
      } else {
        camera.position.set(
          baseCameraPosition.x + pointer.x * PARALLAX_CAMERA_SWAY.x,
          baseCameraPosition.y - pointer.y * PARALLAX_CAMERA_SWAY.y
            + Math.sin(motionTime * 0.18) * PARALLAX_CAMERA_SWAY.bob,
          baseCameraPosition.z,
        );
        // Translate with the pointer, then counter-rotate around the scene's
        // saved focal point. This produces depth without losing the subject.
        parallaxFocalPoint.set(
          baseCameraTarget.x - pointer.x * PARALLAX_FOCUS_SWAY.x,
          baseCameraTarget.y + pointer.y * PARALLAX_FOCUS_SWAY.y,
          baseCameraTarget.z,
        );
        camera.lookAt(parallaxFocalPoint);
        modelGroup.rotation.y = pointer.x * 0.009;
      }
      petalField.material.uniforms.uTime.value = motionTime;
      petalField.material.uniforms.uAspect.value = camera.aspect;
      petalField.material.uniforms.uTanHalfFov.value = Math.tan(
        THREE.MathUtils.degToRad(camera.fov / 2),
      );
      updateBackdropCover();
      profiler.end('update');
      renderer.setViewport(0, 0, viewportWidth, viewportHeight);
      renderer.autoClear = true;
      if (editingActive) {
        camera.layers.enableAll();
        renderer.render(scene, camera);
      } else {
        // Background and petals fill the screen. The models render with the
        // authored camera and aspect into a viewport whose bottom-right corner
        // is pinned to the screen's bottom-right corner, so the editor's
        // framing and crop are reproduced exactly and only scale down.
        camera.layers.set(0);
        profiler.begin('sky');
        renderer.render(scene, camera);
        profiler.end('sky');
        const background = scene.background;
        scene.background = null;
        renderer.autoClear = false;
        renderer.clearDepth();
        const inset = mobileLayout ? Math.max(0, viewportHeight - safeViewportHeight) : 0;
        const view = sceneViewport(
          viewportWidth,
          viewportHeight,
          referenceAspect,
          modelBounds,
          inset,
          modelBottomInset,
          mobileLayout ? 0.9 : 0.6,
          modelView,
        );
        modelCamera.copy(camera);
        modelCamera.aspect = referenceAspect;
        modelCamera.layers.set(1);
        modelCamera.updateProjectionMatrix();
        // The store and rider, faded out while the kitsune shows. Clickable while mostly there.
        modelsDrawn = modelsReady && modelsAlpha > 0.5 ? view : null;
        profiler.begin('store & rider');
        if (!modelsReady || auditOff('store')) {
          // Still compiling (or not loaded): nothing to draw yet.
        } else if (modelsAlpha >= 1) {
          renderer.setViewport(view.x, view.y, view.width, view.height);
          renderer.render(scene, modelCamera);
        } else if (modelsAlpha > 0) {
          modelFade ??= createFadeLayer(renderer);
          modelFade.render(scene, modelCamera, view, modelsAlpha);
        }
        profiler.end('store & rider');
        if (kitsuneShown() && !auditOff('kitsune')) {
          if (!experienceStage.hover) kitsune.clearHover();
          // The role card's cycling tail lights up and fades out over its turn.
          kitsune.setHighlight(experienceStage.cycleTail, cycleGlow(now));
          profiler.begin('kitsune: tails physics');
          kitsune.update(Math.min(windDt, 0.05), now);
          chimes?.update(kitsune, kitsuneAlpha, Math.min(windDt, 0.05));
          profiler.end('kitsune: tails physics');
          const shown = kitsuneView(viewportWidth, viewportHeight);
          profiler.begin('kitsune: draw & glow');
          kitsuneGlow.render(shown.x, shown.y, shown.width, shown.height, kitsuneAlpha);
          profiler.end('kitsune: draw & glow');
        }
        // The tails' chimes fade out as soon as the page heads off the quests page, and back in on return.
        chimes?.setPresent(experienceStage.show === 'kitsune');
        renderer.setViewport(0, 0, viewportWidth, viewportHeight);
        renderer.clearDepth();
        camera.layers.set(2);
        profiler.begin('falling petals');
        if (!auditOff('petals')) renderer.render(scene, camera);
        profiler.end('falling petals');
        scene.background = background;
        if (import.meta.env.DEV) {
          const signature = `${view.x}|${view.y}|${view.width}|${view.height}`;
          if (signature !== modelViewSignature) {
            modelViewSignature = signature;
            mount.dataset.modelViewport = JSON.stringify(view);
          }
        }
      }
      // The frame into the page's copies of the backdrop, for its glass to blur (sceneMirror.jsx).
      profiler.begin('glass copy');
      drawSceneMirrors(renderer.domElement, mount.dataset.sceneLoaded === 'true');
      profiler.end('glass copy');
      profiler.endFrame(frameStart);
      markFrame(now);
      if (captureMode && captureRequested.current) {
        captureRequested.current = false;
        renderer.domElement.toBlob(async blob => {
          try {
            const response = await fetch(`/__scene-snapshot?kind=${mobileLayout ? 'mobile' : 'desktop'}`, { method: 'POST', body: blob });
            setCaptureStatus(response.ok ? 'Snapshot saved' : 'Snapshot failed');
          } catch { setCaptureStatus('Snapshot failed'); }
        }, 'image/webp', .88);
      }
    };

    animate();

    return () => {
      disposed = true;
      experienceStage.supported = false;
      modelFade?.dispose();
      kitsuneGlow?.dispose();
      kitsune?.dispose();
      chimes?.dispose();
      setTargetFps(null);
      stopTuning();
      stopScrollWatch();
      document.body.style.cursor = '';
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('click', handleKitsuneClick);
      closeLore();
      closeInspo();
      window.removeEventListener('pointerdown', handleTapStart);
      window.removeEventListener('pointerup', handleTapEnd);
      window.removeEventListener('pointercancel', cancelTap);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('blur', handlePointerLeave);
      stopScrollPitch();
      window.removeEventListener('resize', handleResize);
      visualViewport?.removeEventListener('resize', updateModelAnchor);
      visualViewport?.removeEventListener('scroll', updateModelAnchor);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopScrollCancel();
      orbitControls.removeEventListener('change', handleOrbitChange);
      transformControls.removeEventListener('objectChange', handleObjectChange);
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      transformControls.detach();
      transformControls.dispose();
      orbitControls.dispose();
      editorApiRef.current = null;
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value?.isTexture) value.dispose();
            });
            material.dispose();
          });
        }
      });
      environmentTarget?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      safeViewport.remove();
      mount.style.height = '';
      delete mount.dataset.modelViewport;
      delete mount.dataset.sceneLoaded;
      if (import.meta.env.DEV) delete window.__cherryScene;
    };
  }, [mobileLayout]);

  const toggleEditing = () => {
    const nextEditing = !editing;
    setEditing(nextEditing);
    editorApiRef.current?.setEditing(nextEditing);
    setEditorStatus(nextEditing ? 'Orbit to move the camera' : 'Editor closed');
  };

  const chooseSelection = (name) => {
    setSelection(name);
    if (name === 'focus') setTransformMode('translate');
    editorApiRef.current?.select(name);
    setEditorStatus(
      name === 'camera'
        ? 'Orbit to move the camera'
        : name === 'focus'
          ? 'Drag the focal point to change the parallax orbit'
          : `Drag the ${name} gizmo`,
    );
  };

  const chooseTransformMode = (mode) => {
    setTransformMode(mode);
    editorApiRef.current?.setTransformMode(mode);
  };

  const updatePoseValue = (section, index, value) => {
    editorApiRef.current?.update(section, index, value);
  };

  const updateFogDensity = (value) => {
    editorApiRef.current?.setFogDensity(value);
  };

  const updateBackdropFogDensity = (value) => {
    editorApiRef.current?.setBackdropFogDensity(value);
  };

  const copyPose = async () => {
    const pose = editorApiRef.current?.getPose();
    if (!pose) return;
    await navigator.clipboard.writeText(JSON.stringify(pose, null, 2));
    setEditorStatus('Pose JSON copied');
  };

  const savePose = () => {
    editorApiRef.current?.save();
    setEditorStatus('Pose saved in this browser');
  };

  const resetPose = () => {
    editorApiRef.current?.reset();
    setEditorStatus('Default pose restored');
  };

  return (
    <>
      {captureMode && sceneReady && <button style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 3000 }} onClick={() => { captureRequested.current = true; setCaptureStatus('Saving snapshot…'); }}>{captureStatus}</button>}
      <div ref={mountRef} className="cherry-blossom-scene" aria-hidden="true" />
      {SCENE_EDITOR_ENABLED && sceneReady && !onQuests && <button
        type="button"
        className="scene-editor-toggle"
        aria-pressed={editing}
        onClick={toggleEditing}
      >
        {editing ? 'Exit scene edit' : 'Edit 3D scene'}
      </button>}
      {SCENE_EDITOR_ENABLED && sceneReady && onQuests && <button
        type="button"
        className="scene-editor-toggle"
        aria-pressed={kitsuneEditing}
        onClick={() => setKitsuneEditing(!kitsuneEditing)}
      >
        {kitsuneEditing ? 'Exit scene edit' : 'Edit 3D scene'}
      </button>}
      {SCENE_EDITOR_ENABLED && onQuests && kitsuneEditing && (
        <div className="kitsune-tuner kitsune-tuner--editor">
          <Suspense fallback={null}><TailPoseTuner /><TailLightTuner /></Suspense>
        </div>
      )}

      {SCENE_EDITOR_ENABLED && sceneReady && editing && !onQuests && (
        <aside className="scene-editor-panel" aria-label="3D scene editor">
          <header>
            <div>
              <span>Scene posing mode</span>
              <strong>{OBJECT_LABELS[selection]}</strong>
            </div>
            <button type="button" aria-label="Close scene editor" onClick={toggleEditing}>×</button>
          </header>

          <div className="scene-editor-tabs" role="group" aria-label="Object selection">
            {['camera', 'focus', 'backdrop', 'store', 'rider'].map((name) => (
              <button
                type="button"
                key={name}
                className={selection === name ? 'is-active' : ''}
                onClick={() => chooseSelection(name)}
              >
                {TAB_LABELS[name]}
              </button>
            ))}
          </div>

          {selection !== 'camera' && selection !== 'focus' && (
            <div className="scene-editor-modes" role="group" aria-label="Transform mode">
              {['translate', 'rotate', 'scale'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={transformMode === mode ? 'is-active' : ''}
                  onClick={() => chooseTransformMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          <SceneVectorInput
            label="Position"
            values={poseReadout.position}
            step="0.05"
            onChange={(index, value) => updatePoseValue('position', index, value)}
          />

          {selection === 'camera' ? (
            <>
              <SceneVectorInput
                label="Center focal point"
                values={poseReadout.target}
                step="0.05"
                onChange={(index, value) => updatePoseValue('target', index, value)}
              />
              <label className="scene-editor-fov">
                <span>Field of view</span>
                <div>
                  <button
                    type="button"
                    className="scene-editor-stepper"
                    aria-label="Decrease field of view"
                    onClick={() => updatePoseValue('fov', 0, poseReadout.fov - 1)}
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="1"
                    value={poseReadout.fov}
                    onChange={(event) => updatePoseValue('fov', 0, Number(event.target.value))}
                  />
                  <output>{Math.round(poseReadout.fov)}°</output>
                  <button
                    type="button"
                    className="scene-editor-stepper"
                    aria-label="Increase field of view"
                    onClick={() => updatePoseValue('fov', 0, poseReadout.fov + 1)}
                  >
                    +
                  </button>
                </div>
              </label>
            </>
          ) : selection === 'focus' ? (
            <p className="scene-editor-help scene-editor-focus-help">
              This target controls where normal mouse parallax orbits and looks.
            </p>
          ) : (
            <>
              <SceneVectorInput
                label="Rotation (degrees)"
                values={poseReadout.rotation}
                step="1"
                onChange={(index, value) => updatePoseValue('rotation', index, value)}
              />
              <SceneVectorInput
                label="Scale"
                values={poseReadout.scale}
                step="0.05"
                onChange={(index, value) => updatePoseValue('scale', index, value)}
              />
            </>
          )}

          <label className="scene-editor-fov scene-editor-fog">
            <span>Scene fog</span>
            <div>
              <button
                type="button"
                className="scene-editor-stepper"
                aria-label="Decrease fog density"
                onClick={() => updateFogDensity(fogDensity - 0.002)}
              >
                −
              </button>
              <input
                type="range"
                min="0"
                max="0.12"
                step="0.001"
                aria-label="Fog density"
                value={fogDensity}
                onChange={(event) => updateFogDensity(Number(event.target.value))}
              />
              <output>{fogDensity.toFixed(3)}</output>
              <button
                type="button"
                className="scene-editor-stepper"
                aria-label="Increase fog density"
                onClick={() => updateFogDensity(fogDensity + 0.002)}
              >
                +
              </button>
            </div>
          </label>

          <label className="scene-editor-fov scene-editor-fog">
            <span>Backdrop fog</span>
            <div>
              <button
                type="button"
                className="scene-editor-stepper"
                aria-label="Decrease backdrop fog density"
                onClick={() => updateBackdropFogDensity(backdropFogDensity - 0.002)}
              >
                −
              </button>
              <input
                type="range"
                min="0"
                max="0.12"
                step="0.001"
                aria-label="Backdrop fog density"
                value={backdropFogDensity}
                onChange={(event) => updateBackdropFogDensity(Number(event.target.value))}
              />
              <output>{backdropFogDensity.toFixed(3)}</output>
              <button
                type="button"
                className="scene-editor-stepper"
                aria-label="Increase backdrop fog density"
                onClick={() => updateBackdropFogDensity(backdropFogDensity + 0.002)}
              >
                +
              </button>
            </div>
          </label>

          <p className="scene-editor-help">
            Left-drag orbits · right-drag pans · wheel zooms
          </p>
          <div className="scene-editor-actions">
            <button type="button" onClick={copyPose}>Copy JSON</button>
            <button type="button" onClick={savePose}>Save pose</button>
            <button type="button" onClick={resetPose}>Reset</button>
          </div>
          <p className="scene-editor-status" aria-live="polite">{editorStatus}</p>
        </aside>
      )}
    </>
  );
}
