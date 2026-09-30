// Crop the Lawson scene's store and rider to what its camera can ever see, without touching the
// precision of anything kept: vertices stay in exactly the formats they ship in (the store's
// positions are full floats, as z-fighting between its sign layers needs; the rider's are 16-bit),
// and the result is meshopt-compressed losslessly (no requantizing, no lossy filters). Textures are
// left as they are.
//
// The camera holds the scene's saved pose (CherryBlossomScene.jsx DEFAULT_SCENE_POSE) and only
// sways: the pointer on desktop, and on phones the slow drift and the scroll's tilt, each -1 to 1,
// move it PARALLAX_CAMERA_SWAY and its aim PARALLAX_FOCUS_SWAY, bob it up and down, and turn the
// models a little; the models always render at the pose's aspect. Every combination is sampled,
// and a triangle is kept if any sample could see it, with a buffer:
//   - it's inside the view (widened by VIEW_MARGIN) of at least one sample, and
//   - if its material is one-sided (the rider), its front faces at least one sample's camera, give
//     or take FACING_BUFFER. Double-sided materials (all of the store's) keep both sides.
// Each mesh's world placement is copied from the running scene; re-copy it if the pose changes.
//
// Reads the untouched models in assets/store/originals and writes public/models.
//   node scripts/assets/crop-store-view.mjs --write   (without --write it only reports)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { compactPrimitive, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { stat } from 'node:fs/promises';

const VIEW_MARGIN = 1.2; // clip space: 20% beyond each edge of the view
const FACING_BUFFER = 0.3; // keep faces up to ~107° from facing a camera
const POSE = {
  aspect: 1.7683956574185766,
  fov: 32,
  position: [-2.632, 8.496, 31.296],
  target: [-11.179, 15.989, -1.807],
};
const CAMERA_SWAY = { x: 0.78, y: 0.27, bob: 0.035 };
const FOCUS_SWAY = { x: 0.33, y: 0.18 };
const MODEL_TURN = 0.009; // radians of model turn at full sway
const STEPS = [-1, -0.5, 0, 0.5, 1];
// World matrices of the meshes in the running scene (every store mesh shares one).
const PLACEMENTS = {
  store: [0.672355, 0, -0.01345, 0, 0, 0.67249, 0, 0, 0.01345, 0, 0.672355, 0, -0.883127, 6.468, -2.368705, 1],
  rider: [0.249323, 0, 0.689687, 0, 0, 0.733369, 0, 0, -0.689687, 0, 0.249323, 0, -3.589634, 7.559427, 5.788812, 1],
};
const MODELS = [
  { name: 'store', file: 'lawson-mobile.glb', output: 'public/models/lawson/lawson-mobile.glb' },
  { name: 'rider', file: 'bicycle-rider-mobile.glb', output: 'public/models/cherry-blossom/bicycle-rider-mobile.glb' },
];

// Every camera the scene can show: the pose swayed across its whole range. The models' small turn
// is folded in as the camera turning the other way about the world's origin (the models' group).
function cameras() {
  const views = [];
  for (const x of STEPS) for (const y of STEPS) for (const bob of [-1, 0, 1]) {
    const camera = new THREE.PerspectiveCamera(POSE.fov, POSE.aspect, 0.05, 400);
    camera.position.fromArray(POSE.position).add(new THREE.Vector3(x * CAMERA_SWAY.x, -y * CAMERA_SWAY.y + bob * CAMERA_SWAY.bob, 0));
    camera.lookAt(new THREE.Vector3().fromArray(POSE.target).add(new THREE.Vector3(-x * FOCUS_SWAY.x, y * FOCUS_SWAY.y, 0)));
    camera.updateMatrixWorld();
    const unturn = new THREE.Matrix4().makeRotationY(-x * MODEL_TURN);
    const view = camera.matrixWorldInverse.clone().multiply(new THREE.Matrix4().makeRotationY(x * MODEL_TURN));
    views.push({
      viewProjection: camera.projectionMatrix.clone().multiply(view),
      position: camera.position.clone().applyMatrix4(unturn),
    });
  }
  return views;
}

function visibleTriangles(primitive, matrix, views, checkFacing) {
  const position = primitive.getAttribute('POSITION');
  const indices = primitive.getIndices();
  const count = indices ? indices.getCount() : position.getCount();
  const world = new Float64Array(position.getCount() * 3);
  const inView = new Uint8Array(position.getCount());
  const element = [];
  const point = new THREE.Vector3();
  const clip = new THREE.Vector4();
  for (let i = 0; i < position.getCount(); i += 1) {
    position.getElement(i, element);
    point.fromArray(element).applyMatrix4(matrix);
    point.toArray(world, i * 3);
    for (const { viewProjection } of views) {
      clip.set(point.x, point.y, point.z, 1).applyMatrix4(viewProjection);
      if (clip.w > 0 && Math.abs(clip.x) <= VIEW_MARGIN * clip.w && Math.abs(clip.y) <= VIEW_MARGIN * clip.w) {
        inView[i] = 1;
        break;
      }
    }
  }
  const vertexAt = (i) => (indices ? indices.getScalar(i) : i);
  const [a, b, c, normal, centre, toCamera] = Array.from({ length: 6 }, () => new THREE.Vector3());
  const keep = [];
  for (let t = 0; t < count; t += 3) {
    const [ia, ib, ic] = [vertexAt(t), vertexAt(t + 1), vertexAt(t + 2)];
    // Straddling the view counts too: a big triangle can cross it with every corner outside.
    if (!inView[ia] && !inView[ib] && !inView[ic]) {
      a.fromArray(world, ia * 3); b.fromArray(world, ib * 3); c.fromArray(world, ic * 3);
      const box = new THREE.Box3().setFromPoints([a, b, c]);
      const crosses = views.some(({ viewProjection }) => {
        const frustum = new THREE.Frustum().setFromProjectionMatrix(viewProjection);
        return frustum.intersectsBox(box);
      });
      if (!crosses) continue;
    }
    if (checkFacing) {
      a.fromArray(world, ia * 3); b.fromArray(world, ib * 3); c.fromArray(world, ic * 3);
      normal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
      centre.copy(a).add(b).add(c).divideScalar(3);
      const faces = views.some(({ position: eye }) => normal.dot(toCamera.subVectors(eye, centre).normalize()) > -FACING_BUFFER);
      if (!faces) continue;
    }
    keep.push(ia, ib, ic);
  }
  return { keep, total: count / 3 };
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const views = cameras();
const write = process.argv.includes('--write');

for (const { name, file, output } of MODELS) {
  const input = `assets/store/originals/${file}`;
  const document = await io.read(input);
  const matrix = new THREE.Matrix4().fromArray(PLACEMENTS[name]);
  let kept = 0;
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const checkFacing = !primitive.getMaterial()?.getDoubleSided();
      const result = visibleTriangles(primitive, matrix, views, checkFacing);
      kept += result.keep.length / 3;
      total += result.total;
      const IndexArray = primitive.getAttribute('POSITION').getCount() > 65535 ? Uint32Array : Uint16Array;
      primitive.setIndices(document.createAccessor().setType('SCALAR').setArray(new IndexArray(result.keep)));
      compactPrimitive(primitive);
    }
  }
  console.log(`${name}: keeping ${kept} of ${total} triangles (${((kept / total) * 100).toFixed(1)}%)`);
  // Nothing to cut (the store: every part is in view, and double-sided): its file stays as it is.
  if (!write || kept === total) continue;
  await document.transform(prune());
  // Lossless: meshopt's plain codec over the data exactly as it is, no quantizing or filters.
  document.createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(output, document);
  console.log(`${output}: ${((await stat(input)).size / 1024).toFixed(0)} KB -> ${((await stat(output)).size / 1024).toFixed(0)} KB`);
}
