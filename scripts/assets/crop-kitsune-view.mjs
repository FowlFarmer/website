// Crop the kitsune scene's figure and rock to what its camera can ever see, then blank the texture
// regions only the removed triangles used, so they compress to almost nothing.
//
// The camera holds one framing (kitsuneRig.js DEFAULT_CAMERA) and only turns with the mouse: -2.5°
// to 17.5° across, ±1.2° up and down, on any screen from 0.78:1 to 2.4:1. Every combination is
// sampled, and a triangle is kept if any sample could see it, with a buffer:
//   - it's inside the view (widened by VIEW_MARGIN) of at least one sample, and
//   - for the figure (always seen from behind), its front faces at least one sample's camera, give or
//     take FACING_BUFFER, so his front, which faces away from every camera, goes.
// Each mesh's world placement is copied from the running scene (/lab/kitsune?debug), so re-copy
// them if the placement, framing or cliff change.
//
// Reads the untouched originals in assets/kitsune/originals and writes public/models/kitsune.
//   node scripts/assets/crop-kitsune-view.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { compactPrimitive, dequantize, meshopt, prune, quantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { stat } from 'node:fs/promises';

const VIEW_MARGIN = 1.2; // clip space: 20% beyond each edge of the view
const FACING_BUFFER = 0.3; // keep faces up to ~107° from facing a camera
const TEXTURE_PADDING = 8; // texels kept around every surviving triangle
const DEFAULT_CAMERA = { position: [0.79, 1.479, 7.519], target: [-4.598, 3.677, -11.507] };
const YAWS = [-2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5];
const PITCHES = [-1.2, 0, 1.2];
const ASPECTS = [0.78, 1, 1.33, 1.6, 1.78, 2, 2.4];
// Phones show a crop of these views (kitsuneRig.js's PHONE_VIEW), so the same models serve them.

// World placements of each mesh in the running scene, keyed by node name: read with the original
// (uncompressed) models loaded, since compressing them folds an offset and scale into their nodes.
const PLACEMENTS = {
  keria: {
    '': [-0.181638, 0, 0.934447, 0, 0, 0.951936, 0, 0, -0.934447, 0, -0.181638, 0, -0.760563, -0.496936, -12.618116, 1],
  },
  cliff: {
    'Cliff_Stone': [-8.031453, 0, -6.535787, 0, 0, 10.354745, 0, 0, 6.535787, 0, -8.031453, 0, 1.754251, -8.908831, -5.685424, 1],
    'Alpine grass': [-5.157815, 0, -4.197296, 0, 0, 6.649839, 0, 0, 4.197296, 0, -5.157815, 0, 0.671113, -6.019449, -5.991154, 1],
    'Fallen cherry petals': [-4.823053, 0, -3.924875, 0, 0, 6.218238, 0, 0, 3.924875, 0, -4.823053, 0, 0.71258, -1.077643, -6.005257, 1],
  },
};

// Every camera the scene can show: kitsuneRig.js's framing, its field of view per aspect, and its
// mouse sway (turning about the target).
function cameras() {
  const offset = new THREE.Vector3().fromArray(DEFAULT_CAMERA.position).sub(new THREE.Vector3().fromArray(DEFAULT_CAMERA.target));
  const framings = [{ target: DEFAULT_CAMERA.target, pullbacks: [1], aspects: ASPECTS, yaws: YAWS, pitches: PITCHES }];
  const list = [];
  for (const framing of framings) {
    const target = new THREE.Vector3().fromArray(framing.target);
    for (const pullback of framing.pullbacks) {
      for (const aspect of framing.aspects) {
        for (const yaw of framing.yaws) {
          for (const pitch of framing.pitches) {
            const camera = new THREE.PerspectiveCamera(30, aspect, 0.05, 80);
            camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * Math.max(1, 0.78 / aspect)));
            camera.updateProjectionMatrix();
            const turned = offset.clone().multiplyScalar(pullback);
            const right = new THREE.Vector3().crossVectors(turned, camera.up).normalize();
            turned.applyAxisAngle(camera.up, THREE.MathUtils.degToRad(yaw)).applyAxisAngle(right, THREE.MathUtils.degToRad(pitch));
            camera.position.copy(target).add(turned);
            camera.lookAt(target);
            camera.updateMatrixWorld();
            list.push({
              position: camera.position.clone(),
              viewProjection: new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
            });
          }
        }
      }
    }
  }
  return list;
}

// Which triangles of a primitive any camera could see (world positions from `matrix`).
function visibleTriangles(primitive, matrix, views, checkFacing) {
  const position = primitive.getAttribute('POSITION');
  const indices = primitive.getIndices();
  const count = indices ? indices.getCount() : position.getCount();
  const world = new Float32Array(position.getCount() * 3);
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
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const keep = [];
  for (let t = 0; t < count; t += 3) {
    const [ia, ib, ic] = [vertexAt(t), vertexAt(t + 1), vertexAt(t + 2)];
    if (!inView[ia] && !inView[ib] && !inView[ic]) continue;
    if (checkFacing) {
      a.fromArray(world, ia * 3);
      b.fromArray(world, ib * 3);
      c.fromArray(world, ic * 3);
      normal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
      centre.copy(a).add(b).add(c).divideScalar(3);
      const faces = views.some(({ position: eye }) => normal.dot(toCamera.subVectors(eye, centre).normalize()) > -FACING_BUFFER);
      if (!faces) continue;
    }
    keep.push(ia, ib, ic);
  }
  return { keep, total: count / 3 };
}

// The UV → texel mapping of a texture slot (KHR_texture_transform, if any).
function uvTransform(info) {
  const transform = info?.getExtension('KHR_texture_transform');
  if (!transform) return (u, v) => [u, v];
  const [ox, oy] = transform.getOffset();
  const [sx, sy] = transform.getScale();
  const r = transform.getRotation();
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return (u, v) => [ox + cos * sx * u + sin * sy * v, oy - sin * sx * u + cos * sy * v];
}

// Mark every texel the kept triangles cover (plus padding) in a width × height mask.
function coverage(primitive, keep, info, width, height) {
  const uv = primitive.getAttribute(`TEXCOORD_${info?.getTexCoord() ?? 0}`);
  const toTexel = uvTransform(info);
  const mask = new Uint8Array(width * height);
  const element = [];
  const texel = (i) => {
    uv.getElement(i, element);
    const [u, v] = toTexel(element[0], element[1]);
    return [u * width, v * height];
  };
  for (let t = 0; t < keep.length; t += 3) {
    const [p, q, r] = [texel(keep[t]), texel(keep[t + 1]), texel(keep[t + 2])];
    const minX = Math.max(0, Math.floor(Math.min(p[0], q[0], r[0])));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(p[0], q[0], r[0])));
    const minY = Math.max(0, Math.floor(Math.min(p[1], q[1], r[1])));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(p[1], q[1], r[1])));
    const area = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        // Tiny or degenerate triangles: just their bounding box.
        if (Math.abs(area) < 1) { mask[y * width + x] = 1; continue; }
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((q[0] - px) * (r[1] - py) - (q[1] - py) * (r[0] - px)) / area;
        const w1 = ((r[0] - px) * (p[1] - py) - (r[1] - py) * (p[0] - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) mask[y * width + x] = 1;
      }
    }
  }
  // Grow the mask by the padding (a square dilation), so texture filtering at the edges is safe.
  let grown = mask;
  for (let pass = 0; pass < TEXTURE_PADDING; pass += 1) {
    const next = grown.slice();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (grown[y * width + x]) continue;
        if ((x > 0 && grown[y * width + x - 1]) || (x < width - 1 && grown[y * width + x + 1])
          || (y > 0 && grown[(y - 1) * width + x]) || (y < height - 1 && grown[(y + 1) * width + x])) next[y * width + x] = 1;
      }
    }
    grown = next;
  }
  return grown;
}

// Fill the texels outside `mask` with the average of those inside (flat, so they compress away).
async function blankOutside(texture, mask) {
  const { data, info } = await sharp(Buffer.from(texture.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0, 0];
  let inside = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) continue;
    for (let c = 0; c < 4; c += 1) sum[c] += data[i * 4 + c];
    inside += 1;
  }
  const fill = sum.map((s) => Math.round(s / Math.max(inside, 1)));
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) continue;
    for (let c = 0; c < 4; c += 1) data[i * 4 + c] = fill[c];
  }
  const image = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .removeAlpha().webp({ quality: 82 }).toBuffer();
  const before = texture.getImage().byteLength;
  texture.setImage(new Uint8Array(image)).setMimeType('image/webp');
  return { before, after: image.byteLength, kept: inside / mask.length };
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const views = cameras();

// The figure's textures are left exactly as they are: he uses most of them (~85%), so blanking saves
// little, and re-encoding them visibly softens his detail.
for (const [name, checkFacing, blankTextures] of [['keria', true, false], ['cliff', false, true]]) {
  const document = await io.read(`assets/kitsune/originals/${name}.glb`);
  const masks = new Map(); // texture → combined coverage mask
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const placement = PLACEMENTS[name][node.getName()];
    if (!placement) throw new Error(`No placement for ${name} node "${node.getName()}"`);
    const matrix = new THREE.Matrix4().fromArray(placement);
    for (const primitive of mesh.listPrimitives()) {
      const { keep, total } = visibleTriangles(primitive, matrix, views, checkFacing);
      console.log(`${name} "${node.getName()}": keeping ${keep.length / 3} of ${total} triangles (${((keep.length / 3 / total) * 100).toFixed(1)}%)`);
      const material = primitive.getMaterial();
      const slots = material ? [
        [material.getBaseColorTexture(), material.getBaseColorTextureInfo()],
        [material.getNormalTexture(), material.getNormalTextureInfo()],
        [material.getMetallicRoughnessTexture(), material.getMetallicRoughnessTextureInfo()],
        [material.getEmissiveTexture(), material.getEmissiveTextureInfo()],
        [material.getOcclusionTexture(), material.getOcclusionTextureInfo()],
      ] : [];
      for (const [texture, info] of slots) {
        if (!texture || !blankTextures) continue;
        const [width, height] = texture.getSize();
        const mask = coverage(primitive, keep, info, width, height);
        const combined = masks.get(texture);
        if (combined) for (let i = 0; i < mask.length; i += 1) combined[i] |= mask[i];
        else masks.set(texture, mask);
      }
      const indices = document.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep));
      primitive.setIndices(indices);
      compactPrimitive(primitive);
    }
  }
  for (const [texture, mask] of masks) {
    const { before, after, kept } = await blankOutside(texture, mask);
    console.log(`${name} texture ${texture.getSize().join('x')}: ${(kept * 100).toFixed(1)}% of texels in use, ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
  }
  if (name === 'keria') {
    // Compressed as optimize-scan.mjs does: the default meshopt settings round texture coordinates
    // to 12 bits, which smears the figure's lettering (his texture is tiled 16x through a transform).
    await document.transform(dequantize(), prune(), quantize({ quantizePosition: 16, quantizeTexcoord: 16, quantizeNormal: 12 }));
    document.createExtension(EXTMeshoptCompression)
      .setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  } else {
    // The cliff as optimize-kitsune-cliff.mjs compresses it.
    await document.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  }
  const output = `public/models/kitsune/${name}.glb`;
  await io.write(output, document);
  const [was, now] = [(await stat(`assets/kitsune/originals/${name}.glb`)).size, (await stat(output)).size];
  console.log(`${output}: ${(was / 1024 / 1024).toFixed(2)} MB → ${(now / 1024 / 1024).toFixed(2)} MB`);
}
