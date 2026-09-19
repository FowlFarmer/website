import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const EMPTY_POSE = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  target: [0, 1.88, -2.8],
  fov: 43,
};

const AXES = ['X', 'Y', 'Z'];
const DEFAULT_FOG_DENSITY = 0.032;
const DEFAULT_BACKDROP_FOG_DENSITY = 0.032;
const DEFAULT_SCENE_POSE = {
  camera: {
    position: [-0.053, 8.252, 29.71],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    target: [-9.679, 15.458, -1.807],
    fov: 31,
  },
  focus: {
    position: [-9.679, 15.458, -1.807],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    target: [-9.679, 15.458, -1.807],
    fov: 31,
  },
  backdrop: {
    position: [-13.966, 11.447, -27.561],
    rotation: [0, 20, 0],
    scale: [0.5, 0.5, 0],
    target: [-9.679, 15.458, -1.807],
    fov: 31,
  },
  store: {
    position: [-0.9, 6.508, -1.8],
    rotation: [0, 1.146, 0],
    scale: [17.568, 17.568, 17.568],
    target: [-9.679, 15.458, -1.807],
    fov: 31,
  },
  rider: {
    position: [-3.588, 7.761, 5.788],
    rotation: [0, -70.125, 0],
    scale: [2, 2, 2],
    target: [-9.679, 15.458, -1.807],
    fov: 31,
  },
  fogDensity: 0.016,
  backdropFogDensity: 0,
};
const OBJECT_LABELS = {
  camera: 'Camera',
  focus: 'Parallax focal point',
  backdrop: 'Mount Fuji backdrop',
  store: 'Convenience store',
  rider: 'Bicycle rider',
};
const TAB_LABELS = {
  camera: 'Camera',
  focus: 'Focus',
  backdrop: 'Backdrop',
  store: 'Store',
  rider: 'Rider',
};
const POSE_STORAGE_KEY = 'convenience-store-scene-pose-v5';
const PARALLAX_CAMERA_SWAY = { x: 0.78, y: 0.27, bob: 0.035 };
const PARALLAX_FOCUS_SWAY = { x: 0.33, y: 0.18 };
const BACKDROP_COVER_OVERSCAN = 1.045;
const BACKDROP_COVER_MAX_SCALE = 32;
const BACKDROP_COVER_POINTER_STEPS = [-1, 0, 1];
const BACKDROP_COVER_BOB_STEPS = [-1, 0, 1];

function SceneVectorInput({ label, values, step, onChange }) {
  const numericStep = Number(step);
  const nudge = (index, direction) => {
    const currentValue = Number.isFinite(values[index]) ? values[index] : 0;
    const nextValue = Number((currentValue + numericStep * direction).toFixed(3));
    onChange(index, nextValue);
  };

  return (
    <fieldset className="scene-editor-vector">
      <legend>{label}</legend>
      <div>
        {AXES.map((axis, index) => (
          <div className="scene-editor-axis-control" key={axis}>
            <span aria-hidden="true">{axis}</span>
            <button
              type="button"
              className="scene-editor-stepper"
              aria-label={`Decrease ${label} ${axis}`}
              onClick={() => nudge(index, -1)}
            >
              −
            </button>
            <input
              type="number"
              step={step}
              aria-label={`${label} ${axis}`}
              value={Number.isFinite(values[index]) ? values[index] : 0}
              onChange={(event) => onChange(index, Number(event.target.value))}
            />
            <button
              type="button"
              className="scene-editor-stepper"
              aria-label={`Increase ${label} ${axis}`}
              onClick={() => nudge(index, 1)}
            >
              +
            </button>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

const petalVertexShader = `
  uniform float uTime;
  uniform float uAspect;
  uniform float uTanHalfFov;
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aSpin;
  attribute float aTint;
  varying vec2 vUv;
  varying float vTint;
  varying float vGlow;
  varying float vFacing;

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
    vec3 center = vec3(
      (aOffset.x + horizontalDrift) * halfWidth,
      fall * halfHeight,
      -depth
    );

    // Keep the nearest flakes from filling the viewport while preserving
    // normal perspective for the rest of the field.
    float foregroundScale = smoothstep(1.25, 3.4, depth);
    vec3 petal = position * aScale * mix(0.56, 1.0, foregroundScale);
    vec3 petalNormal = normal;
    petal.xy = rotate2d(time * aSpin) * petal.xy;
    petalNormal.xy = rotate2d(time * aSpin) * petalNormal.xy;
    petal.yz = rotate2d(time * (0.82 + aSpin * 0.22)) * petal.yz;
    petalNormal.yz = rotate2d(time * (0.82 + aSpin * 0.22)) * petalNormal.yz;
    petal.xz = rotate2d(sin(time * 1.17) * 0.75) * petal.xz;
    petalNormal.xz = rotate2d(sin(time * 1.17) * 0.75) * petalNormal.xz;

    vec4 viewPosition = vec4(center + petal, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vUv = uv;
    vTint = aTint;
    vGlow = 1.0 - smoothstep(2.0, 55.0, depth);
    vFacing = abs(normalize(petalNormal).z);
  }
`;

const petalFragmentShader = `
  varying vec2 vUv;
  varying float vTint;
  varying float vGlow;
  varying float vFacing;

  void main() {
    vec3 blush = mix(vec3(0.98, 0.68, 0.76), vec3(1.0, 0.88, 0.91), vTint);
    float baseBlush = 1.0 - smoothstep(0.04, 0.52, vUv.y);
    float centralVein = exp(-abs(vUv.x - 0.5) * 19.0)
      * (1.0 - smoothstep(0.12, 0.88, vUv.y));
    float edgeLight = smoothstep(0.18, 0.48, abs(vUv.x - 0.5));
    float softTips = smoothstep(0.0, 0.055, vUv.y)
      * smoothstep(0.0, 0.045, 1.0 - vUv.y);
    float faceLight = mix(0.76, 1.06, smoothstep(0.08, 0.88, vFacing));

    vec3 color = mix(blush, vec3(0.92, 0.43, 0.57), baseBlush * 0.28);
    color = mix(color, vec3(0.91, 0.49, 0.61), centralVein * 0.18);
    color = mix(color, vec3(1.0, 0.94, 0.95), edgeLight * 0.12);
    gl_FragColor = vec4(color * faceLight, softTips * (0.82 + vGlow * 0.14));
  }
`;

function seededRandom(seed = 48271) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createPetalField(random, count) {
  const shape = new THREE.Shape();
  shape.moveTo(0.012, -0.62);
  shape.bezierCurveTo(-0.13, -0.57, -0.31, -0.32, -0.35, -0.04);
  shape.bezierCurveTo(-0.39, 0.24, -0.30, 0.50, -0.14, 0.59);
  shape.bezierCurveTo(-0.07, 0.63, -0.025, 0.57, 0.002, 0.52);
  shape.bezierCurveTo(0.035, 0.57, 0.095, 0.62, 0.17, 0.58);
  shape.bezierCurveTo(0.34, 0.48, 0.39, 0.21, 0.34, -0.07);
  shape.bezierCurveTo(0.29, -0.34, 0.14, -0.58, 0.012, -0.62);

  const petalShape = new THREE.ShapeGeometry(shape, 16);
  const petalPositions = petalShape.getAttribute('position');
  for (let index = 0; index < petalPositions.count; index += 1) {
    const x = petalPositions.getX(index);
    const y = petalPositions.getY(index);
    const sideCurl = Math.pow(Math.min(Math.abs(x) / 0.39, 1), 1.7) * 0.095;
    const tipCurl = Math.pow(Math.max((y - 0.28) / 0.34, 0), 2) * 0.055;
    petalPositions.setZ(index, sideCurl + tipCurl);
  }
  petalPositions.needsUpdate = true;
  petalShape.scale(0.16, 0.16, 0.16);
  petalShape.computeVertexNormals();

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
  petals.frustumCulled = false;
  petals.renderOrder = 4;
  return petals;
}

function prepareMaterials(root, maxAnisotropy) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = false;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      if (object.geometry.getAttribute('color')) material.vertexColors = true;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = Math.min(maxAnisotropy, 8);
      }
      material.needsUpdate = true;
    });
  });
}

function scaleAndGround(root, targetHeight) {
  root.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= bounds.min.y;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);
}

function SceneLoadingScreen({ ready }) {
  const auraRef = useRef(null);

  useEffect(() => {
    const aura = auraRef.current;
    if (!aura) return undefined;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let animationFrame;

    const handlePointerMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };
    const animateAura = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      aura.style.transform = `translate3d(${currentX - 48}px, ${currentY - 48}px, 0)`;
      animationFrame = window.requestAnimationFrame(animateAura);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    animateAura();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div
      className={`scene-loading-screen${ready ? ' is-ready' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={ready ? 'Scene ready' : 'Loading scene'}
    >
      <div ref={auraRef} className="scene-loading-aura" aria-hidden="true">
        <i />
        <i />
      </div>
      <span>loading...</span>
    </div>
  );
}

export default function CherryBlossomScene() {
  const mountRef = useRef(null);
  const editorApiRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState('camera');
  const [transformMode, setTransformMode] = useState('translate');
  const [poseReadout, setPoseReadout] = useState(EMPTY_POSE);
  const [fogDensity, setFogDensity] = useState(DEFAULT_FOG_DENSITY);
  const [backdropFogDensity, setBackdropFogDensity] = useState(DEFAULT_BACKDROP_FOG_DENSITY);
  const [editorStatus, setEditorStatus] = useState('Orbit to move the camera');
  const [sceneReady, setSceneReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  useEffect(() => {
    if (!sceneReady) return undefined;
    const hideTimer = window.setTimeout(() => setShowLoadingScreen(false), 480);
    return () => window.clearTimeout(hideTimer);
  }, [sceneReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const loadingStartedAt = performance.now();
    let readyTimer;

    const random = seededRandom();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb9c5ce);
    scene.fog = new THREE.FogExp2(0xd6c8ca, DEFAULT_FOG_DENSITY);

    const camera = new THREE.PerspectiveCamera(
      43,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      80,
    );
    camera.position.set(0, 2.6, 9.2);
    const baseCameraPosition = new THREE.Vector3(0, 2.6, 9.2);
    const baseCameraTarget = new THREE.Vector3(0, 1.88, -2.8);
    const parallaxFocalPoint = new THREE.Vector3();

    const orbitControls = new OrbitControls(camera, mount);
    orbitControls.enabled = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.075;
    orbitControls.screenSpacePanning = true;
    orbitControls.minDistance = 1.2;
    orbitControls.maxDistance = 35;
    orbitControls.target.set(0, 1.88, -2.8);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      mount.dataset.webglFallback = 'true';
      setSceneReady(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.1 : 1.55));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.transmissionResolutionScale = lowPower ? 0.5 : 1;
    mount.appendChild(renderer.domElement);

    const transformControls = new TransformControls(camera, renderer.domElement);
    const transformHelper = transformControls.getHelper();
    transformControls.enabled = false;
    transformHelper.visible = false;
    scene.add(transformHelper);

    const hemisphere = new THREE.HemisphereLight(0xb8d4ef, 0x48515a, 0.7);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffd9c4, 1.25);
    sun.position.set(-6, 11, 8);
    scene.add(sun);
    const roseFill = new THREE.PointLight(0xff9fb5, 12, 17, 2);
    roseFill.position.set(4.5, 5.2, 3.5);
    scene.add(roseFill);

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

    const petalField = createPetalField(random, lowPower ? 320 : 820);
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
    let backdropCoverState = '';

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

    const updateBackdropCover = () => {
      if (!backdropPlane || !editableObjects.backdrop) return;
      const bounds = backdropPlane.geometry.boundingBox;
      if (!bounds) return;

      editableObjects.backdrop.updateMatrixWorld(true);
      const nextState = [
        camera.aspect.toFixed(5),
        camera.fov.toFixed(4),
        ...baseCameraPosition.toArray().map((value) => value.toFixed(4)),
        ...baseCameraTarget.toArray().map((value) => value.toFixed(4)),
        ...editableObjects.backdrop.matrixWorld.elements.map((value) => value.toFixed(5)),
      ].join('|');
      if (nextState === backdropCoverState) return;

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

      backdropCoverState = nextState;
    };

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
        }
        orbitControls.update();
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

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.preload();
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);

    let disposed = false;
    const pmrem = new THREE.PMREMGenerator(renderer);
    let environmentTarget;
    new HDRLoader().load('/models/lawson/dawn-environment.hdr', (hdr) => {
      if (disposed) { hdr.dispose(); return; }
      environmentTarget = pmrem.fromEquirectangular(hdr);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.35;
      hdr.dispose();
      pmrem.dispose();
    }, undefined, () => pmrem.dispose());
    const textureLoader = new THREE.TextureLoader();
    Promise.all([
      textureLoader.loadAsync('/images/scene/fuji_hd.jpg'),
      loader.loadAsync('/models/lawson/lawson-mobile.glb'),
      loader.loadAsync('/models/cherry-blossom/bicycle-rider.glb'),
    ])
      .then(([backdropTexture, storeAsset, riderAsset]) => {
        if (disposed) return;

        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        backdropTexture.colorSpace = THREE.SRGBColorSpace;
        backdropTexture.anisotropy = Math.min(maxAnisotropy, 8);
        const backdropAspect = backdropTexture.image.width / backdropTexture.image.height;
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
          if (material.transmission > 0) {
            material.thickness = 0.025;
            material.ior = 1.46;
            material.roughness = material.name === 'Frosted lower panels' ? 0.52 : 0.045;
            material.envMapIntensity = 0.7;
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
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
            const light = new THREE.PointLight(0xe8f4ff, 24 * lightScale ** 2, 12 * lightScale, 2);
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

        initialPose = DEFAULT_SCENE_POSE;
        applyFullPose(initialPose);
        const savedPose = window.localStorage.getItem(POSE_STORAGE_KEY);
        if (savedPose) {
          try {
            applyFullPose(JSON.parse(savedPose));
          } catch {
            window.localStorage.removeItem(POSE_STORAGE_KEY);
          }
        }
        attachSelection(activeSelection);

        mount.dataset.sceneLoaded = 'true';
        readyTimer = window.setTimeout(
          () => setSceneReady(true),
          Math.max(0, 700 - (performance.now() - loadingStartedAt)),
        );
      })
      .catch((error) => {
        console.error('Unable to load the convenience store scene.', error);
        mount.dataset.assetFallback = 'true';
        readyTimer = window.setTimeout(
          () => setSceneReady(true),
          Math.max(0, 700 - (performance.now() - loadingStartedAt)),
        );
      });

    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    const startTime = performance.now();
    let animationFrame;
    let visible = !document.hidden;

    const handlePointerMove = (event) => {
      targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const handleVisibility = () => {
      visible = !document.hidden;
    };
    const handleResize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      petalField.material.uniforms.uAspect.value = camera.aspect;
      petalField.material.uniforms.uTanHalfFov.value = Math.tan(
        THREE.MathUtils.degToRad(camera.fov / 2),
      );
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.1 : 1.55));
      renderer.setSize(width, height);
      updateBackdropCover();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    let lastRenderedAt = 0;
    const frameInterval = lowPower ? 1000 / 30 : 0;
    const animate = (now = performance.now()) => {
      animationFrame = window.requestAnimationFrame(animate);
      if (!visible || now - lastRenderedAt < frameInterval) return;
      lastRenderedAt = now - ((now - lastRenderedAt) % (frameInterval || 1));

      const elapsed = (performance.now() - startTime) / 1000;
      const motionTime = reduceMotion ? 0.5 : elapsed;
      pointer.lerp(targetPointer, 0.035);
      if (editingActive) {
        orbitControls.update();
        modelGroup.rotation.y = 0;
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
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      window.clearTimeout(readyTimer);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
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
      dracoLoader.dispose();
      environmentTarget?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

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
      <div ref={mountRef} className="cherry-blossom-scene" aria-hidden="true" />
      {showLoadingScreen && <SceneLoadingScreen ready={sceneReady} />}
      {sceneReady && <button
        type="button"
        className="scene-editor-toggle"
        aria-pressed={editing}
        onClick={toggleEditing}
      >
        {editing ? 'Exit scene edit' : 'Edit 3D scene'}
      </button>}

      {sceneReady && editing && (
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
