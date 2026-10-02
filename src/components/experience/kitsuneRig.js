import * as THREE from 'three';
import { kitsuneTails } from '../../data/experience.js';
import { applyColorTuning, hologramMaterial } from './kitsuneHologram.js';
import { REFERENCE_LENGTH, createTailPhysics } from './kitsunePhysics.js';
import { createTailCompute } from './kitsuneCompute.js';
import { buildCliff } from './kitsuneCliff.js';
import {
  OUTLINE_RINGS, OUTLINE_SIDES, createTailSkin, measureBody, prepareTailSource, tailHomeSpine,
} from './kitsuneTails.js';

// The kitsune: the figure on a rock ledge, seen from behind, with six tails rooted at the
// tailbone, and the camera that frames them. The tails are physics chains: they sway, catch gusts
// from the mouse, and collide with each other, the figure and the ledge. The tails are holograms;
// the rock carries its baked lighting. It brings no renderer, backdrop or petals of its own, so it
// can sit in any scene: the standalone lab or the homepage's Lawson scene.
const MODEL_URL = `/models/kitsune/${new URLSearchParams(window.location.search).get('model') || 'keria'}.glb`;
const TAIL_URL = '/models/kitsune/tail.glb';
const CLIFF_URL = '/models/kitsune/cliff.glb';
// Small cherry blossom props for the ledge (assets/cherry-blossoms): open flowers, sprigs, buds and
// fallen petals, in metres.
const BLOSSOM_URLS = ['open-blossom', 'three-blossom-sprig', 'opening-buds', 'fallen-petals']
  .map((name) => `/models/kitsune/blossoms/${name}.glb`);
// How many of each prop to scatter on the ledge, and how much to scale them: the models are true to
// size, so they're drawn larger to read at the camera's distance.
const BLOSSOM_SCATTER = [
  { prop: 3, count: 16, scale: [1.8, 2.6] }, // fallen petals
  { prop: 0, count: 9, scale: [1.6, 2.2] }, // open blossoms
  { prop: 2, count: 5, scale: [1.6, 2.2] }, // opening buds
  { prop: 1, count: 4, scale: [1.5, 2.0] }, // sprigs
];
// The ring around his seat they're scattered in (metres), clear of where he sits.
const BLOSSOM_RING = [0.55, 3.2];
const DEBUG = new URLSearchParams(window.location.search).has('debug');

// Tails are much larger than the seated figure (≈1.5 units tall). The first STALK of each is a
// long tapered stalk running back from the tailbone before the tail rises.
const TAIL_LENGTH = 6.6;
const TAIL_GIRTH = 0.52;
const STALK = 0.24;
const NODES = 22;
// One tail per role, left to right = newest to oldest (the scene sits on the right of the page).
// Emphasised roles glow a little brighter at rest and on hover.
const EMPHASIS = { glow: 1.25, hover: 1.25 };
const TAIL_ROLES = kitsuneTails.map(({ hologram, emphasis }) => ({
  palette: hologram, glow: 1, hover: 1, ...(emphasis ? EMPHASIS : {}),
}));
// Per colour: `strength` scales its glow (for black, its opacity); `hover` is how many times
// brighter (darker, for black) it gets when its tail is hovered. White is held back so it doesn't
// outshine the coloured tails. Tuned by eye in the scene.
export const COLOR_TUNING = {
  '#ff2238': { strength: 1.5, hover: 2.1 }, // Tesla red
  '#050505': { strength: 1, hover: 1.9 }, // black
  '#ffffff': { strength: 0.35, hover: 2 }, // white
  '#3fc4e8': { strength: 0.8, hover: 1.8 }, // WATonomous teal
  '#8f8fe6': { strength: 1, hover: 2 }, // Independent Robotics periwinkle
  '#ff2331': { strength: 1, hover: 3 }, // Rapyuta red
};
// Where the tails sit relative to him, all moved as one piece: metres across (x), up (y) and back
// (z) in his own frame, and a turn in degrees about his tailbone (yaw about his up, pitch about
// his side, roll about his back). Tuned live in the scene editor (TailPoseTuner.jsx).
export const TAIL_POSE = { x: -0.13, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
const liveKitsunes = new Set();
export function setTailPose(patch) {
  Object.assign(TAIL_POSE, patch);
  liveKitsunes.forEach((kitsune) => kitsune.applyTailPose());
}
function tailPoseMatrix(frame, pose) {
  const basis = new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.back);
  const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(pose.pitch), THREE.MathUtils.degToRad(pose.yaw), THREE.MathUtils.degToRad(pose.roll), 'YXZ',
  ));
  const move = frame.side.clone().multiplyScalar(pose.x).addScaledVector(frame.up, pose.y).addScaledVector(frame.back, pose.z);
  return new THREE.Matrix4().makeTranslation(frame.anchor.x + move.x, frame.anchor.y + move.y, frame.anchor.z + move.z)
    .multiply(basis).multiply(turn).multiply(basis.clone().invert())
    .multiply(new THREE.Matrix4().makeTranslation(-frame.anchor.x, -frame.anchor.y, -frame.anchor.z));
}

// The phone layout's view (CherryBlossomScene.jsx): a crop of desktop's view at rest, `zoom` times
// closer, centred at (x, y) (across from the centre and down from the top, in units of desktop's
// view height). Only ever a crop, so it shows nothing desktop can't: the models are cut down to
// what desktop sees. The 3D-off stills' phone placement (layout.json) is the same crop.
export const PHONE_VIEW = { x: 0.4287, y: 0.6, zoom: 1.25 };
// The widest desktop view it stays within (crop-kitsune-view.mjs's widest).
const PHONE_VIEW_BOUNDS = 2.4;

// Every tail material in use, so the light tuner (TailLightTuner.jsx) can change them live.
const liveTailMaterials = new Set();
export function setColorTuning(color, patch) {
  Object.assign(COLOR_TUNING[color], patch);
  liveTailMaterials.forEach((material) => applyColorTuning(material, COLOR_TUNING));
}
// Six tails evenly spread across the fan, leaving a gap over his head. Neighbours bend the same
// way across the fan with a gradually shifting phase (combed, never crossing), and alternate in
// lean and depth S-curve (+ arcs back toward the viewer, - forward) so the fan has real depth.
const TAILS = [
  { fan: -1.3, lean: 0.34, length: 0.86, sway: 0.2, swayPhase: 0.0, depth: 0.36, depthPhase: 0.2 },
  { fan: -0.8, lean: 0.6, length: 0.96, sway: 0.2, swayPhase: 0.3, depth: -0.34, depthPhase: 1.3 },
  { fan: -0.28, lean: 0.3, length: 1.0, sway: 0.2, swayPhase: 0.6, depth: 0.4, depthPhase: 2.2 },
  // WATonomous: its top curls in toward him rather than out over the IR tail beside it.
  { fan: 0.28, lean: 0.56, length: 0.98, sway: 0.2, swayPhase: 0.9, depth: -0.36, depthPhase: 0.7, curl: -0.1 },
  { fan: 0.8, lean: 0.32, length: 0.94, sway: 0.2, swayPhase: 1.2, depth: 0.38, depthPhase: 1.8 },
  { fan: 1.3, lean: 0.58, length: 0.84, sway: 0.2, swayPhase: 1.5, depth: -0.3, depthPhase: 2.6 },
].map((tail) => ({ ...tail, length: tail.length * TAIL_LENGTH, root: (tail.fan / 1.25) * 0.16 }));

// Where he sits on the rock, relative to where the model puts him: metres across (x), up (y) and
// back toward the camera (z), and a turn in degrees.
export const DEFAULT_PLACEMENT = { x: -0.94, y: -0.49, z: -10.94, yaw: -101 };
// The framing: behind him and off to his left, so he sits on the right of a wide screen with the
// sky and Fuji open for the role cards on the left.
export const DEFAULT_CAMERA = { position: [0.79, 1.479, 7.519], target: [-4.598, 3.677, -11.507] };
// Mouse sway: how far the camera turns about its target with the pointer at the window's edge
// (radians), and how quickly it follows. Across, it runs evenly from -2.5° at the left edge to 17.5°
// at the right, so the rightmost tails come into view.
const SWAY_YAW_LEFT = THREE.MathUtils.degToRad(-2.5);
const SWAY_YAW_RIGHT = THREE.MathUtils.degToRad(17.5);
const SWAY_PITCH = THREE.MathUtils.degToRad(1.2);
const SWAY_EASE = 3;

export function loadKitsuneAssets(loader) {
  return Promise.all([MODEL_URL, TAIL_URL, CLIFF_URL, ...BLOSSOM_URLS].map((url) => loader.loadAsync(url)));
}

// A seeded random source, so the blossoms land in the same places every visit.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The rock's surface under the ring around `seat`, for dropping props onto: its triangles (world
// space) filed by where they sit into a grid of `cell`-metre squares, so a ray down only tests the
// few triangles in its square instead of the whole rock.
function rockGrid(cliff, seat, reach, cell) {
  const grid = new Map();
  const key = (x, z) => `${Math.floor((x - seat.x) / cell)},${Math.floor((z - seat.z) / cell)}`;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  cliff.updateMatrixWorld(true);
  cliff.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry.attributes.position;
    const index = object.geometry.index;
    const count = index ? index.count : position.count;
    const vertex = (i, target) => target.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(object.matrixWorld);
    for (let i = 0; i < count; i += 3) {
      vertex(i, a);
      vertex(i + 1, b);
      vertex(i + 2, c);
      const minX = Math.min(a.x, b.x, c.x);
      const maxX = Math.max(a.x, b.x, c.x);
      const minZ = Math.min(a.z, b.z, c.z);
      const maxZ = Math.max(a.z, b.z, c.z);
      if (maxX < seat.x - reach || minX > seat.x + reach || maxZ < seat.z - reach || minZ > seat.z + reach) continue;
      const triangle = [a.clone(), b.clone(), c.clone()];
      for (let x = Math.floor((minX - seat.x) / cell); x <= Math.floor((maxX - seat.x) / cell); x += 1) {
        for (let z = Math.floor((minZ - seat.z) / cell); z <= Math.floor((maxZ - seat.z) / cell); z += 1) {
          const k = `${x},${z}`;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(triangle);
        }
      }
    }
  });
  const ray = new THREE.Ray();
  const hit = new THREE.Vector3();
  // The highest point of rock straight below (x, z), or null off the ledge.
  return (x, z) => {
    const triangles = grid.get(key(x, z));
    if (!triangles) return null;
    ray.set(new THREE.Vector3(x, seat.y + 50, z), new THREE.Vector3(0, -1, 0));
    let best = null;
    triangles.forEach(([p, q, r]) => {
      if (ray.intersectTriangle(p, q, r, false, hit) && (!best || hit.y > best.y)) best = hit.clone();
    });
    return best;
  };
}

// Scatter the blossom props on the rock around `seat` (world space): each at a seeded spot in the
// ring around him, dropped onto the rock below it (spots off the ledge are skipped), turned at
// random and sized a little apart. Returns a group of them, one instanced mesh per part of each prop
// (all copies of a part draw in one call).
function scatterBlossoms(propScenes, cliff, seat) {
  const group = new THREE.Group();
  group.name = 'Blossoms';
  const random = seeded(0x5a4ba);
  const rockBelow = rockGrid(cliff, seat, BLOSSOM_RING[1] + 0.2, 0.25);
  BLOSSOM_SCATTER.forEach(({ prop, count, scale }) => {
    const source = propScenes[prop].scene;
    const spots = [];
    for (let attempt = 0; attempt < count * 4 && spots.length < count; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = BLOSSOM_RING[0] + Math.sqrt(random()) * (BLOSSOM_RING[1] - BLOSSOM_RING[0]);
      const point = rockBelow(seat.x + Math.cos(angle) * distance, seat.z + Math.sin(angle) * distance);
      if (!point) continue;
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
      const size = THREE.MathUtils.lerp(scale[0], scale[1], random());
      spots.push(new THREE.Matrix4().compose(point, turn, new THREE.Vector3(size, size, size)));
    }
    if (!spots.length) return;
    source.updateMatrixWorld(true);
    const fromSource = source.matrixWorld.clone().invert();
    source.traverse((part) => {
      if (!part.isMesh) return;
      const inProp = fromSource.clone().multiply(part.matrixWorld);
      const copies = new THREE.InstancedMesh(part.geometry, part.material, spots.length);
      copies.name = part.name;
      spots.forEach((spot, index) => copies.setMatrixAt(index, spot.clone().multiply(inProp)));
      copies.computeBoundingSphere();
      group.add(copies);
    });
    group.userData.placed = (group.userData.placed ?? 0) + spots.length;
  });
  group.traverse((object) => {
    if (!object.isMesh) return;
    // Lit only by the kitsune's own lights, whatever scene it's in.
    object.material.fog = false;
    object.material.envMapIntensity = 0;
    object.material.toneMapped = false;
  });
  return group;
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

// Build the kitsune from its loaded assets. Everything is in `root` (on `layer`, lit only by its own
// lights). `camera` frames it; `base` and `target` are the camera's held pose, which the mouse sway
// turns away from each frame. `onHover` hears the tail under the pointer (-1 for none).
// `highlightBoost`: how many times brighter the highlighted tail (setHighlight) glows at its peak.
export function createKitsune([figureScene, tailScene, cliffScene, ...blossomScenes], { layer = 0, shadows = false, onHover, highlightBoost = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'Kitsune';

  const sun = new THREE.DirectionalLight(0xffc4b8, 3.2);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 40 });
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  root.add(sun, sun.target, new THREE.HemisphereLight(0xb9c9ff, 0x302d43, 1.25));

  // Keria and his tails, moved as one by the placement. The tail physics runs in this group's own
  // frame, so it doesn't care where the group is.
  const kitsune = new THREE.Group();
  root.add(kitsune);
  kitsune.add(figureScene.scene);
  let figure = null;
  const figureMeshes = [];
  figureScene.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (!figure) figure = child;
    figureMeshes.push(child);
  });
  const frame = measureBody(figure);
  figureScene.scene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = shadows;
    child.receiveShadow = shadows;
    // Lit only by the kitsune's own lights, whatever scene it's in.
    child.material.fog = false;
    child.material.envMapIntensity = 0;
    child.material.toneMapped = false;
  });
  sun.target.position.copy(frame.torso);
  sun.position.copy(frame.torso).addScaledVector(frame.forward, 4).addScaledVector(frame.side, 7).addScaledVector(frame.up, 6);

  let sourceGeometry = null;
  tailScene.scene.updateMatrixWorld(true);
  tailScene.scene.traverse((child) => {
    if (child.isMesh && !sourceGeometry) sourceGeometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
  });
  const source = prepareTailSource(sourceGeometry);
  const tailMaterials = [];
  const tailGroup = new THREE.Group();
  tailGroup.name = 'Tails';
  tailGroup.matrixAutoUpdate = false;
  kitsune.add(tailGroup);
  const rigs = TAILS.map((tail, index) => {
    const spine = tailHomeSpine({ frame, stalk: STALK, ...tail });
    const home = Array.from({ length: NODES }, (_, node) => spine.getPointAt(node / (NODES - 1)));
    const skin = createTailSkin(source, {
      nodes: NODES, length: spine.getLength(), stalk: STALK, girth: TAIL_GIRTH, reference: frame.side, markingSeed: index + 1,
    });
    const material = hologramMaterial({
      palette: TAIL_ROLES[index].palette, markings: skin.markings, tuning: COLOR_TUNING, phase: index * 1.9,
    });
    liveTailMaterials.add(material);
    const mesh = new THREE.Mesh(skin.geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    tailGroup.add(mesh);
    tailMaterials.push(material);
    return { skin, home, phase: index * 1.37 };
  });
  const scale = TAIL_LENGTH / REFERENCE_LENGTH;
  const skins = rigs.map((rig) => rig.skin);
  // The physics, and the posing of the tail meshes, run off the page's thread (kitsuneCompute.js).
  const physics = createTailCompute({ source, tails: rigs, skins, frame, scale });
  // The tail pose moves the tails as one piece (meshes and hover shells) relative to him; their
  // physics runs as before inside it.
  const tailPoseHandle = {
    applyTailPose: () => {
      tailGroup.matrix.copy(tailPoseMatrix(frame, TAIL_POSE));
      tailGroup.matrixWorldNeedsUpdate = true;
    },
  };
  tailPoseHandle.applyTailPose();
  liveKitsunes.add(tailPoseHandle);
  const hoverShells = physics.chains.map(buildHoverShell);
  hoverShells.forEach((shell) => tailGroup.add(shell));
  physics.ready.then(() => hoverShells.forEach((shell, index) => shell.userData.update(physics.chains[index])));

  const cliff = buildCliff(cliffScene, frame);
  cliff.traverse((child) => {
    if (child.isMesh) { child.material.fog = false; child.material.toneMapped = false; }
  });
  root.add(cliff);

  const focus = frame.anchor.clone().addScaledVector(frame.back, 0.25 * scale).addScaledVector(frame.up, 0.22 * TAIL_LENGTH);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const base = new THREE.Vector3().fromArray(DEFAULT_CAMERA.position);
  const target = new THREE.Vector3().fromArray(DEFAULT_CAMERA.target);
  camera.position.copy(base);
  camera.lookAt(target);
  camera.layers.set(layer);

  let colliders = null;
  if (DEBUG) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({ color: '#ff3355', depthTest: false }));
    marker.position.copy(frame.anchor);
    marker.renderOrder = 99;
    kitsune.add(marker, new THREE.ArrowHelper(frame.forward, frame.torso, 0.8, 0x33ff88));
    // Each tail's low-poly collision shell, drawn as a wireframe: its rings and the lines joining
    // ring corners along the tail.
    const edges = physics.chains.length * (OUTLINE_RINGS * OUTLINE_SIDES + (OUTLINE_RINGS - 1) * OUTLINE_SIDES);
    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges * 6), 3).setUsage(THREE.DynamicDrawUsage));
    colliders = new THREE.LineSegments(shellGeometry, new THREE.LineBasicMaterial({ color: '#ffcc33', transparent: true, opacity: 0.7 }));
    colliders.frustumCulled = false;
    kitsune.add(colliders);
    window.__kitsune = { root, camera, base, target, frame, physics, skins, THREE, freshPhysics: () => createTailPhysics({ tails: rigs, frame, scale }) };
  }
  root.traverse((object) => object.layers.set(layer));

  // Turn about his own seat, not the world origin.
  const setPlacement = ({ x, y, z, yaw }) => {
    const pivot = focus.clone().setY(0);
    kitsune.rotation.y = THREE.MathUtils.degToRad(yaw);
    kitsune.position.copy(pivot).sub(pivot.clone().applyEuler(kitsune.rotation)).add(new THREE.Vector3(x, y, z));
    kitsune.updateMatrixWorld(true);
  };
  setPlacement(DEFAULT_PLACEMENT);

  // Cherry blossoms on the ledge around where he sits.
  root.updateMatrixWorld(true);
  const seat = kitsune.localToWorld(new THREE.Vector3(frame.torso.x, frame.ground, frame.torso.z));
  const scatterStart = performance.now();
  const blossoms = scatterBlossoms(blossomScenes, cliff, seat);
  if (DEBUG) console.log('blossoms', { placed: blossoms.userData.placed, drawCalls: blossoms.children.length, ms: Math.round(performance.now() - scatterStart), seat: seat.toArray().map((v) => +v.toFixed(2)) });
  blossoms.traverse((object) => object.layers.set(layer));
  root.add(blossoms);

  // Keep at least the width of view of a 0.78 aspect.
  const setAspect = (aspect) => {
    camera.aspect = aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * Math.max(1, 0.78 / aspect)));
    camera.updateProjectionMatrix();
  };
  // The phone layout's view (PHONE_VIEW), for a view of `aspect`.
  const setPhoneView = (aspect) => {
    setAspect(PHONE_VIEW_BOUNDS);
    const fullHeight = 1000;
    const fullWidth = fullHeight * PHONE_VIEW_BOUNDS;
    let height = fullHeight / PHONE_VIEW.zoom;
    let width = height * aspect;
    if (width > fullWidth) { width = fullWidth; height = width / aspect; }
    const x = THREE.MathUtils.clamp(fullWidth / 2 + PHONE_VIEW.x * fullHeight - width / 2, 0, fullWidth - width);
    const y = THREE.MathUtils.clamp(PHONE_VIEW.y * fullHeight - height / 2, 0, fullHeight - height);
    camera.setViewOffset(fullWidth, fullHeight, x, y, width, height);
  };

  // Mouse wind: the pointer's path, projected onto a plane through the tails facing the camera,
  // leaves gusts moving at the pointer's world speed. Hover (unless `hover` is off): the nearest
  // tail whose low-poly shell the pointer's ray crosses. `x` and `y` are the pointer over the
  // kitsune's view (-1 to 1); off the view (null) the pointer is gone.
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(layer);
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  let lastHit = null;
  let lastTime = 0;
  let hovered = -1;
  // A tail lit from outside (the role card's cycle), and how much (0 to 1).
  let highlighted = -1;
  let highlightAmount = 0;
  const setHighlight = (index, amount) => {
    highlighted = index;
    highlightAmount = Number.isFinite(amount) ? amount : 0;
  };
  const setHovered = (index) => {
    if (index === hovered) return;
    hovered = index;
    onHover?.(hovered);
  };
  const pointer = (x, y, timeStamp, hover = true) => {
    if (x === null) {
      lastHit = null;
      setHovered(-1);
      return;
    }
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);
    const [nearest] = hover ? raycaster.intersectObjects(hoverShells, false) : [];
    setHovered(nearest ? hoverShells.indexOf(nearest.object) : -1);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hit).negate(), kitsune.localToWorld(focus.clone()));
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    // The physics lives in the kitsune group's frame.
    kitsune.worldToLocal(hit);
    const time = timeStamp / 1000;
    if (lastHit && time - lastTime > 0.001 && time - lastTime < 0.2) {
      physics.gust(hit, hit.clone().sub(lastHit).divideScalar(time - lastTime));
    }
    lastHit = hit.clone();
    lastTime = time;
  };
  // Whether a point on the kitsune's view (-1 to 1) lands on him, for the lore popup: one plain box
  // around his body and his tails' resting fan, in the kitsune group's own frame. (Hovering a tail
  // still picks it by its shell.)
  const box = new THREE.Box3();
  kitsune.updateMatrixWorld(true);
  const toKitsune = kitsune.matrixWorld.clone().invert();
  figureMeshes.forEach((mesh) => {
    mesh.geometry.computeBoundingBox();
    box.union(mesh.geometry.boundingBox.clone().applyMatrix4(toKitsune.clone().multiply(mesh.matrixWorld)));
  });
  // The tails at rest, once the physics has settled them (off the page's thread, kitsuneCompute.js).
  physics.ready.then(() => physics.chains.forEach(({ corners }) => corners.forEach((ring) => ring.forEach((corner) => box.expandByPoint(corner)))));
  const localRay = new THREE.Ray();
  const hits = (x, y) => {
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);
    localRay.copy(raycaster.ray).applyMatrix4(kitsune.matrixWorld.clone().invert());
    return localRay.intersectsBox(box);
  };

  // The pointer across the whole window, -1 to 1 each way, drives the mouse sway.
  const sway = new THREE.Vector2();
  const swayGoal = new THREE.Vector2();
  const setSway = (x, y) => swayGoal.set(x, y);

  // `still` holds the tails where they are (the glow still eases), for baking stills of them.
  const update = (step, now, { still = false } = {}) => {
    // A bad or backwards step (a stalled or restarted clock) must not reach the physics or the glow:
    // one invalid value in the tails' light is smeared over the whole picture by the bloom.
    const seconds = Number.isFinite(step) ? Math.max(step, 0) : 0;
    // Mouse sway: the camera turns a little about its target, following the pointer.
    sway.lerp(swayGoal, Math.min(seconds * SWAY_EASE, 1));
    const offset = base.clone().sub(target);
    const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
    const yaw = THREE.MathUtils.lerp(SWAY_YAW_LEFT, SWAY_YAW_RIGHT, (sway.x + 1) / 2);
    offset.applyAxisAngle(camera.up, yaw).applyAxisAngle(right, sway.y * SWAY_PITCH);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    if (!still) {
      physics.update(seconds);
      hoverShells.forEach((shell, index) => shell.userData.update(physics.chains[index]));
    }
    tailMaterials.forEach((material, index) => {
      material.uniforms.time.value = now / 1000;
      // Emphasised tails glow more at rest, and take a bigger share of the hover boost.
      const { glow: restGlow, hover: hoverShare } = TAIL_ROLES[index];
      const { uniforms } = material;
      uniforms.hoverShare.value = hoverShare;
      const target = index === hovered ? 1 : index === highlighted ? highlightAmount : 0;
      uniforms.hoverAmount.value += (target - uniforms.hoverAmount.value) * Math.min(seconds * 6, 1);
      if (!Number.isFinite(uniforms.hoverAmount.value)) uniforms.hoverAmount.value = 0;
      const boost = index === highlighted && index !== hovered ? 1 + (highlightBoost - 1) * uniforms.hoverAmount.value : 1;
      uniforms.intensity.value = restGlow * boost;
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
  };

  // Point the camera at him wherever he now sits, keeping its distance and angle.
  const lookAtHim = () => {
    const at = kitsune.localToWorld(focus.clone());
    base.add(at.clone().sub(target));
    target.copy(at);
  };

  const dispose = () => {
    physics.dispose();
    liveKitsunes.delete(tailPoseHandle);
    root.traverse((object) => {
      object.geometry?.dispose();
      const materials = object.material ? [object.material].flat() : [];
      materials.forEach((material) => {
        liveTailMaterials.delete(material);
        Object.values(material).forEach((value) => { if (value?.isTexture) value.dispose(); });
        material.dispose();
      });
    });
  };

  return {
    root, camera, base, target, setPlacement, setAspect, setPhoneView, pointer, hits, setSway, update, lookAtHim, dispose,
    // The tails' invisible hover shells, in tail order (for baking the stills' hover map).
    hoverShells,
    clearHover: () => setHovered(-1),
    setHighlight,
    focus: () => kitsune.localToWorld(focus.clone()),
    // The tails' physics and their length, for the chimes (kitsuneChimes.js); `ready` once the
    // tails are settled.
    physics,
    ready: physics.ready,
    tailLength: TAIL_LENGTH,
  };
}
