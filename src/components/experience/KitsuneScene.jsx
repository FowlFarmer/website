import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { experiences } from '../../data/experience.js';
import { coverBackground, createGlowComposer, hologramMaterial } from './kitsuneHologram.js';
import { REFERENCE_LENGTH, createTailPhysics } from './kitsunePhysics.js';
import {
  OUTLINE_RINGS, OUTLINE_SIDES, createTailSkin, measureBody, prepareTailSource, tailHomeSpine,
} from './kitsuneTails.js';

// Standalone kitsune scene: the seated figure on a grey cliff, seen from behind, with six tails
// rooted at the tailbone, over the dusk Fuji backdrop. The tails are physics chains: they sway,
// catch gusts from the mouse, and collide with each other, the figure and the cliff. Plain
// materials for now; the holographic look comes later.
const MODEL_URL = `/models/kitsune/${new URLSearchParams(window.location.search).get('model') || 'keria'}.glb`;
const TAIL_URL = '/models/kitsune/tail.glb';
const DEBUG = new URLSearchParams(window.location.search).has('debug');

// Tails are much larger than the seated figure (≈1.5 units tall). The first STALK of each is a
// long tapered stalk running back from the tailbone before the tail rises.
const TAIL_LENGTH = 6.6;
const TAIL_GIRTH = 0.52;
const STALK = 0.24;
const NODES = 22;
// Tail palettes, left to right = newest to oldest (the scene sits on the right of the page).
// Roles in the experience data use their `hologram` palette; Mundane isn't in it yet.
// TODO: move Tesla Autopilot and Mundane onto roles in data/experience.js once their details are in.
// Tuxedo cat: mostly black fur with white patches.
const MUNDANE = [{ color: '#050505', share: 0.65 }, { color: '#ffffff', share: 0.35 }];
const hologramOf = (id) => experiences.find((role) => role.id === id).hologram;
// Tesla is the headline: its tails glow a little brighter at rest and on hover.
const TESLA_EMPHASIS = { glow: 1.25, hover: 1.25 };
const TAIL_ROLES = [
  // Tesla is always Tesla red, Autopilot included.
  { palette: hologramOf('tesla'), ...TESLA_EMPHASIS },
  { palette: MUNDANE },
  { palette: hologramOf('tesla'), ...TESLA_EMPHASIS },
  { palette: hologramOf('watonomous') },
  { palette: hologramOf('independent-robotics') },
  { palette: hologramOf('rapyuta') },
].map(({ glow = 1, hover = 1, ...role }) => ({ ...role, glow, hover }));
// Per colour: `strength` scales its glow (for black, its opacity); `hover` is how many times
// brighter (darker, for black) it gets when its tail is hovered. White is held back so it doesn't
// outshine the coloured tails. Tuned by eye in the scene.
const COLOR_TUNING = {
  '#ff2238': { strength: 1.5, hover: 2.1 }, // Tesla red
  '#050505': { strength: 1, hover: 1.9 }, // black
  '#ffffff': { strength: 0.35, hover: 2 }, // white
  '#3fc4e8': { strength: 0.8, hover: 1.8 }, // WATonomous teal
  '#8f8fe6': { strength: 1, hover: 2 }, // Independent Robotics periwinkle
  '#ff2331': { strength: 1, hover: 3 }, // Rapyuta red
};
// Six tails evenly spread across the fan, leaving a gap over his head. Neighbours bend the same
// way across the fan with a gradually shifting phase (combed, never crossing), and alternate in
// lean and depth S-curve (+ arcs back toward the viewer, - forward) so the fan has real depth.
const TAILS = [
  { fan: -1.3, lean: 0.34, length: 0.86, sway: 0.2, swayPhase: 0.0, depth: 0.36, depthPhase: 0.2 },
  { fan: -0.8, lean: 0.6, length: 0.96, sway: 0.2, swayPhase: 0.3, depth: -0.34, depthPhase: 1.3 },
  { fan: -0.28, lean: 0.3, length: 1.0, sway: 0.2, swayPhase: 0.6, depth: 0.4, depthPhase: 2.2 },
  { fan: 0.28, lean: 0.56, length: 0.98, sway: 0.2, swayPhase: 0.9, depth: -0.36, depthPhase: 0.7 },
  { fan: 0.8, lean: 0.32, length: 0.94, sway: 0.2, swayPhase: 1.2, depth: 0.38, depthPhase: 1.8 },
  { fan: 1.3, lean: 0.58, length: 0.84, sway: 0.2, swayPhase: 1.5, depth: -0.3, depthPhase: 2.6 },
].map((tail) => ({ ...tail, length: tail.length * TAIL_LENGTH, root: (tail.fan / 1.25) * 0.16 }));

function buildCliff(frame) {
  const radius = 3.2;
  const height = 6;
  const geometry = new THREE.CylinderGeometry(radius * 0.92, radius * 1.3, height, 22, 10);
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const noise = Math.sin(point.x * 2.7 + point.y * 1.9) * 0.14 + Math.sin(point.z * 3.3 - point.y * 2.4) * 0.1;
    if (point.y > height / 2 - 0.001) {
      point.y += noise * 0.06;
    } else {
      const radial = new THREE.Vector2(point.x, point.z);
      radial.setLength(radial.length() * (1 + noise));
      point.set(radial.x, point.y, radial.y);
    }
    position.setXYZ(index, point.x, point.y, point.z);
  }
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  const cliff = new THREE.Mesh(faceted, new THREE.MeshStandardMaterial({ color: '#8d8c95', roughness: 0.95, flatShading: true }));
  // The front edge sits just past his feet, so he looks out over the drop.
  cliff.position.copy(frame.torso).addScaledVector(frame.forward, 0.75 * frame.height - radius * 0.92);
  cliff.position.y = frame.ground - height / 2;
  return cliff;
}

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

// An invisible mesh over a tail's low-poly collision shell, for hover picking: the rings joined
// into quads, closed at the tip. It follows the physics every frame.
function buildHoverShell(chain) {
  const rings = chain.corners.length;
  const sides = chain.corners[0].length;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(rings * sides * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  const index = [];
  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = ring * sides + side;
      const b = ring * sides + ((side + 1) % sides);
      index.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.visible = false;
  mesh.userData.update = ({ corners }) => {
    corners.forEach((ring, r) => ring.forEach((corner, s) => position.setXYZ(r * sides + s, corner.x, corner.y, corner.z)));
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  };
  mesh.userData.update(chain);
  return mesh;
}

export default function KitsuneScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
    // Free camera while the scene is being tuned: drag to rotate, scroll to zoom, right-drag
    // (or shift/cmd-drag, or the arrow keys) to pan.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.keyPanSpeed = 20;
    controls.listenToKeyEvents(window);

    // The backdrop lives in the scene (not CSS) so the bloom composites over it correctly.
    const backdrop = new THREE.TextureLoader().load('/images/scene/fuji_hd.jpg', () => resize());
    backdrop.colorSpace = THREE.SRGBColorSpace;
    scene.background = backdrop;
    const glow = createGlowComposer(renderer, scene, camera);

    const sun = new THREE.DirectionalLight(0xfff0f4, 2.4);
    sun.position.set(-3, 5, 3);
    scene.add(sun, new THREE.HemisphereLight(0xd6d9ff, 0x4b4150, 1.4));

    let petals = null;
    let physics = null;
    const tailMaterials = [];
    let hoverShells = [];
    let hovered = -1;
    let skins = [];
    let colliders = null;
    let focus = null;
    let disposed = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    Promise.all([loader.loadAsync(MODEL_URL), loader.loadAsync(TAIL_URL)]).then(([figureScene, tailScene]) => {
      // A torn-down scene (React remounts effects in development) must not build on its loads.
      if (disposed) return;
      scene.add(figureScene.scene);
      let figure = null;
      figureScene.scene.traverse((child) => { if (child.isMesh && !figure) figure = child; });
      const frame = measureBody(figure);

      let sourceGeometry = null;
      tailScene.scene.updateMatrixWorld(true);
      tailScene.scene.traverse((child) => {
        if (child.isMesh && !sourceGeometry) sourceGeometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
      });
      const source = prepareTailSource(sourceGeometry);
      const rigs = TAILS.map((tail, index) => {
        const spine = tailHomeSpine({ frame, stalk: STALK, ...tail });
        const home = Array.from({ length: NODES }, (_, node) => spine.getPointAt(node / (NODES - 1)));
        const skin = createTailSkin(source, {
          nodes: NODES, length: spine.getLength(), stalk: STALK, girth: TAIL_GIRTH, reference: frame.side, markingSeed: index + 1,
        });
        const material = hologramMaterial({
          palette: TAIL_ROLES[index].palette, markings: skin.markings, tuning: COLOR_TUNING, phase: index * 1.9,
        });
        const mesh = new THREE.Mesh(skin.geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = 5;
        scene.add(mesh);
        tailMaterials.push(material);
        return { skin, home, phase: index * 1.37 };
      });
      const scale = TAIL_LENGTH / REFERENCE_LENGTH;
      physics = createTailPhysics({ tails: rigs, frame, scale });
      skins = rigs.map((rig) => rig.skin);
      hoverShells = physics.chains.map(buildHoverShell);
      hoverShells.forEach((shell) => scene.add(shell));
      skins.forEach((skin, index) => skin.update(physics.chains[index].points));

      scene.add(buildCliff(frame));

      // Behind him, a little to his left and above, taking in the whole fan.
      focus = frame.anchor.clone().addScaledVector(frame.back, 0.25 * scale).addScaledVector(frame.up, 0.42 * TAIL_LENGTH);
      controls.target.copy(focus);
      camera.position.copy(focus)
        .addScaledVector(frame.back, 2.6 * TAIL_LENGTH)
        .addScaledVector(frame.up, 0.35 * TAIL_LENGTH)
        .addScaledVector(frame.side, -0.5 * TAIL_LENGTH);
      controls.update();
      petals = buildPetals(260, focus);
      scene.add(petals.mesh);

      if (DEBUG) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({ color: '#ff3355', depthTest: false }));
        marker.position.copy(frame.anchor);
        marker.renderOrder = 99;
        scene.add(marker, new THREE.ArrowHelper(frame.forward, frame.torso, 0.8, 0x33ff88));
        // Each tail's low-poly collision shell, drawn as a wireframe: its rings and the lines
        // joining ring corners along the tail.
        const edges = physics.chains.length * (OUTLINE_RINGS * OUTLINE_SIDES + (OUTLINE_RINGS - 1) * OUTLINE_SIDES);
        const shellGeometry = new THREE.BufferGeometry();
        shellGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges * 6), 3).setUsage(THREE.DynamicDrawUsage));
        colliders = new THREE.LineSegments(shellGeometry, new THREE.LineBasicMaterial({ color: '#ffcc33', transparent: true, opacity: 0.7 }));
        colliders.frustumCulled = false;
        scene.add(colliders);
        window.__kitsune = { scene, camera, controls, frame, physics, THREE, freshPhysics: () => createTailPhysics({ tails: rigs, frame, scale }) };
        console.log('body frame', {
          torso: frame.torso.toArray().map((v) => +v.toFixed(3)),
          anchor: frame.anchor.toArray().map((v) => +v.toFixed(3)),
          forward: frame.forward.toArray().map((v) => +v.toFixed(3)),
        });
      }
    });

    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      glow.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      if (backdrop.image) coverBackground(backdrop, camera.aspect);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    // Mouse wind: the pointer's path, projected onto a plane through the tails facing the
    // camera, leaves gusts moving at the pointer's world speed.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    let lastHit = null;
    let lastTime = 0;
    const handlePointerMove = (event) => {
      if (!physics || !focus || event.buttons) {
        lastHit = null;
        return;
      }
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      // Hover: the nearest tail whose low-poly shell the pointer's ray crosses.
      const [nearest] = raycaster.intersectObjects(hoverShells, false);
      hovered = nearest ? hoverShells.indexOf(nearest.object) : -1;
      renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : '';
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hit).negate(), focus);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const time = event.timeStamp / 1000;
      if (lastHit && time - lastTime > 0.001 && time - lastTime < 0.2) {
        physics.gust(hit, hit.clone().sub(lastHit).divideScalar(time - lastTime));
      }
      lastHit = hit.clone();
      lastTime = time;
    };
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    let frame = 0;
    let previous = performance.now();
    const loop = (now) => {
      frame = window.requestAnimationFrame(loop);
      const seconds = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      controls.update();
      petals?.update(now / 1000, seconds);
      if (physics) {
        physics.update(seconds);
        skins.forEach((skin, index) => skin.update(physics.chains[index].points));
        hoverShells.forEach((shell, index) => shell.userData.update(physics.chains[index]));
        tailMaterials.forEach((material, index) => {
          material.uniforms.time.value = now / 1000;
          // Emphasised tails glow more at rest, and take a bigger share of the hover boost.
          const { glow: restGlow, hover: hoverShare } = TAIL_ROLES[index];
          const { uniforms } = material;
          uniforms.intensity.value = restGlow;
          uniforms.hoverShare.value = hoverShare;
          uniforms.hoverAmount.value += ((index === hovered ? 1 : 0) - uniforms.hoverAmount.value) * Math.min(seconds * 6, 1);
        });
        if (colliders) {
          const array = colliders.geometry.attributes.position.array;
          let o = 0;
          const write = (a, b) => {
            array[o] = a.x; array[o + 1] = a.y; array[o + 2] = a.z;
            array[o + 3] = b.x; array[o + 4] = b.y; array[o + 5] = b.z;
            o += 6;
          };
          physics.chains.forEach(({ corners }) => corners.forEach((ring, index) => ring.forEach((corner, side) => {
            write(corner, ring[(side + 1) % OUTLINE_SIDES]);
            if (index + 1 < corners.length) write(corner, corners[index + 1][side]);
          })));
          colliders.geometry.attributes.position.needsUpdate = true;
        }
      }
      glow.render();
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      glow.dispose();
      controls.stopListenToKeyEvents();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="kitsune-scene" />;
}
