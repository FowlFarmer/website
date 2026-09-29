import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coverBackground, createGlowComposer } from './kitsuneHologram.js';
import { DEFAULT_PLACEMENT, createKitsune, loadKitsuneAssets } from './kitsuneRig.js';
import { closeLore, cycleGlow, experienceStage, openLore } from './experienceStage.js';

// Standalone kitsune scene for the lab page: the kitsune over the dusk Fuji backdrop with its own
// drifting petals, a free camera and the placement panel. It reports the tail under the pointer
// with `onHover` (-1 for none).
function petalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.translate(32, 32);
  context.fillStyle = '#fff';
  context.beginPath();
  context.moveTo(0, 26);
  context.bezierCurveTo(24, 8, 21, -22, 6, -23);
  context.lineTo(0, -16);
  context.lineTo(-6, -23);
  context.bezierCurveTo(-21, -22, -24, 8, 0, 26);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Petals drifting across the view, recycled when they leave the box around the figure.
function buildPetals(count, center) {
  const geometry = new THREE.PlaneGeometry(0.08, 0.08);
  const material = new THREE.MeshBasicMaterial({ map: petalTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: '#ffe9ef' });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const spawn = (petal, anywhere) => petal.position.set(
    center.x + (anywhere ? (Math.random() - 0.5) * 18 : -9 + Math.random() * 5),
    center.y + (anywhere ? Math.random() * 10 - 4 : 5 + Math.random() * 2),
    center.z + (Math.random() - 0.5) * 18,
  );
  const petals = Array.from({ length: count }, () => {
    const petal = {
      position: new THREE.Vector3(),
      speed: 0.12 + Math.random() * 0.18,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(2),
      phase: Math.random() * Math.PI * 2,
    };
    spawn(petal, true);
    return petal;
  });
  const dummy = new THREE.Object3D();
  const update = (time, seconds) => {
    petals.forEach((petal, index) => {
      petal.position.x += (0.35 + Math.sin(time * 0.6 + petal.phase) * 0.2) * petal.speed * seconds;
      petal.position.y -= petal.speed * seconds;
      petal.position.z += Math.cos(time * 0.5 + petal.phase) * 0.1 * seconds;
      if (petal.position.y < center.y - 6 || petal.position.x > center.x + 9) spawn(petal, false);
      dummy.position.copy(petal.position);
      dummy.rotation.set(time * petal.spin.x + petal.phase, time * petal.spin.y, time * petal.spin.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, update };
}

export default function KitsuneScene({ onHover }) {
  const mountRef = useRef(null);
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const placementRef = useRef(placement);
  placementRef.current = placement;
  const propsRef = useRef({});
  propsRef.current = { onHover };
  const actionsRef = useRef({});
  const [cameraReadout, setCameraReadout] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const canvas = renderer.domElement;

    const scene = new THREE.Scene();
    // The backdrop lives in the scene (not CSS) so the bloom composites over it correctly.
    const backdrop = new THREE.TextureLoader().load('/images/scene/fuji_hd.jpg', () => resize());
    backdrop.colorSpace = THREE.SRGBColorSpace;
    scene.background = backdrop;

    let kitsune = null;
    let controls = null;
    let held = null;
    const synced = new THREE.Vector3();
    let glow = null;
    let petals = null;
    let placed = null;
    let disposed = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loadKitsuneAssets(loader).then((assets) => {
      // A torn-down scene (React remounts effects in development) must not build on its loads.
      if (disposed) return;
      kitsune = createKitsune(assets, { shadows: true, onHover: (index) => {
        canvas.style.cursor = index >= 0 ? 'pointer' : '';
        propsRef.current.onHover?.(index);
      } });
      scene.add(kitsune.root);
      glow = createGlowComposer(renderer, scene, kitsune.camera);
      // Free camera while the scene is being tuned: drag to rotate, scroll to zoom, right-drag
      // (or shift/cmd-drag, or the arrow keys) to pan. It moves the kitsune camera's held pose,
      // through a stand-in camera: the controls move their camera the moment you scroll or drag,
      // and the mouse sway rewrites the real one every frame, which would undo that.
      held = kitsune.camera.clone();
      held.position.copy(kitsune.base);
      controls = new OrbitControls(held, canvas);
      controls.enableDamping = true;
      controls.screenSpacePanning = true;
      controls.keyPanSpeed = 20;
      controls.listenToKeyEvents(window);
      controls.target = kitsune.target;
      const home = { position: kitsune.base.clone(), target: kitsune.target.clone() };
      actionsRef.current = {
        focus: () => kitsune.lookAtHim(),
        reset: () => {
          kitsune.base.copy(home.position);
          kitsune.target.copy(home.target);
        },
      };
      petals = buildPetals(260, kitsune.focus());
      scene.add(petals.mesh);
      // The terrain and figure are static. Cache their shadows while the tails keep moving.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      resize();
    });

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height);
      glow?.setSize(width, height);
      kitsune?.setAspect(width / height);
      if (backdrop.image) coverBackground(backdrop, width / height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const viewAt = (event) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1, y: -((event.clientY - bounds.top) / bounds.height) * 2 + 1 };
    };
    const handlePointerMove = (event) => {
      if (!kitsune) return;
      if (event.buttons) {
        kitsune.pointer(null);
        return;
      }
      const at = viewAt(event);
      kitsune.pointer(at.x, at.y, event.timeStamp);
    };
    const handlePointerLeave = () => kitsune?.pointer(null);
    // A click (not the end of a camera drag) on the kitsune opens its lore.
    let pressedAt = null;
    const handlePointerDown = (event) => { pressedAt = { x: event.clientX, y: event.clientY }; };
    const handleClick = (event) => {
      if (!kitsune || !pressedAt || Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 6) return;
      const at = viewAt(event);
      if (kitsune.hits(at.x, at.y)) openLore(event.clientX, event.clientY);
    };
    const handleWindowPointer = (event) => {
      kitsune?.setSway((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
    };
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('pointermove', handleWindowPointer);

    let frame = 0;
    let readoutTime = 0;
    let previous = performance.now();
    const loop = (now) => {
      frame = window.requestAnimationFrame(loop);
      const seconds = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!kitsune) return;
      // The controls work on the held camera; the sway is laid over it afterwards.
      // Take up the held pose only when something else moved it (Reset camera, Look at him).
      if (!kitsune.base.equals(synced)) held.position.copy(kitsune.base);
      held.fov = kitsune.camera.fov;
      held.updateMatrix();
      controls.update();
      kitsune.base.copy(held.position);
      synced.copy(held.position);
      if (placed !== placementRef.current) {
        kitsune.setPlacement(placementRef.current);
        renderer.shadowMap.needsUpdate = true;
        placed = placementRef.current;
      }
      if (now - readoutTime > 250) {
        readoutTime = now;
        const round = (vector) => vector.toArray().map((value) => +value.toFixed(3));
        setCameraReadout({ position: round(kitsune.base), target: round(kitsune.target), fov: +kitsune.camera.fov.toFixed(2) });
      }
      // The role card's cycling tail lights up and fades out over its turn.
      kitsune.setHighlight(experienceStage.cycleTail, cycleGlow(now));
      kitsune.update(seconds, now);
      petals.update(now / 1000, seconds);
      glow.render();
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('pointermove', handleWindowPointer);
      closeLore();
      glow?.dispose();
      controls?.stopListenToKeyEvents();
      controls?.dispose();
      kitsune?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  const slider = (key, label, min, max, step, unit) => (
    <label key={key}>
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={placement[key]}
        onChange={(event) => setPlacement({ ...placement, [key]: Number(event.target.value) })}
      />
      <input
        type="number" min={min} max={max} step={step} value={placement[key]}
        onChange={(event) => setPlacement({ ...placement, [key]: Number(event.target.value) })}
      />
      <small>{unit}</small>
    </label>
  );
  const settings = JSON.stringify({ placement, camera: cameraReadout });

  return (
    <>
      <div ref={mountRef} className="kitsune-scene" />
      <div className="kitsune-tuner">
        <strong>Kitsune</strong>
        {slider('x', 'Across', -15, 15, 0.01, 'm')}
        {slider('z', 'Back', -15, 15, 0.01, 'm')}
        {slider('y', 'Height', -10, 10, 0.01, 'm')}
        {slider('yaw', 'Turn', -180, 180, 1, '°')}
        <strong>Camera</strong>
        <p>Drag to rotate · right-drag or shift-drag to pan · scroll to zoom · arrow keys pan</p>
        {cameraReadout && (
          <p className="kitsune-tuner-readout">
            position {cameraReadout.position.join(', ')}<br />
            target {cameraReadout.target.join(', ')}<br />
            fov {cameraReadout.fov}°
          </p>
        )}
        <div className="kitsune-tuner-buttons">
          <button type="button" onClick={() => actionsRef.current.focus?.()}>Look at him</button>
          <button type="button" onClick={() => actionsRef.current.reset?.()}>Reset camera</button>
          <button type="button" onClick={() => setPlacement(DEFAULT_PLACEMENT)}>Reset him</button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(settings);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? 'Copied' : 'Copy settings'}
          </button>
        </div>
      </div>
    </>
  );
}
