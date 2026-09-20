// Source stays outside public/: never overwrite the archival GLB or Blender file.
// Usage: node scripts/assets/optimize-lawson.mjs /absolute/path/lawson.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, weld, prune, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the full-resolution lawson.glb source path.');
const output = path.resolve('public/models/lawson/lawson-mobile.glb');
if (path.resolve(source) === output) throw new Error('Source and output must differ.');
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(source);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const triangles = () => root.listMeshes().reduce((n, mesh) => n + mesh.listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0), 0);
const before = triangles();

// The original print atlas serves both tiny packages and large posters. Split
// its disconnected label quads by physical size, preserving each label's UVs.
const printed = root.listMaterials().find(m => m.getName() === 'Printed Japanese retail campaigns');
const productTexture = printed.getBaseColorTexture().clone().setName('Product labels 12x16 per tile');
const productMaterial = printed.clone().setName('Small product labels').setBaseColorTexture(productTexture);
let productTriangles = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMaterial() !== printed) continue;
    const pos = prim.getAttribute('POSITION');
    const indices = prim.getIndices().getArray();
    const parent = Array.from({ length: pos.getCount() }, (_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < indices.length; i += 3) {
      parent[find(indices[i + 1])] = find(indices[i]);
      parent[find(indices[i + 2])] = find(indices[i]);
    }
    const bounds = new Map();
    for (let i = 0; i < pos.getCount(); i++) {
      const id = find(i), point = pos.getElement(i, []);
      const box = bounds.get(id) || { min: [...point], max: [...point] };
      point.forEach((v, a) => { box.min[a] = Math.min(box.min[a], v); box.max[a] = Math.max(box.max[a], v); });
      bounds.set(id, box);
    }
    const small = [], large = [];
    for (let i = 0; i < indices.length; i += 3) {
      const b = bounds.get(find(indices[i]));
      const bucket = Math.max(...b.max.map((v, a) => v - b.min[a])) < .45 ? small : large;
      bucket.push(indices[i], indices[i + 1], indices[i + 2]);
    }
    const setIndices = (p, values) => p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(values)).setBuffer(buffer));
    if (small.length) {
      const products = prim.clone().setMaterial(productMaterial);
      setIndices(products, small); compactPrimitive(products); mesh.addPrimitive(products);
      productTriangles += small.length / 3;
    }
    setIndices(prim, large); compactPrimitive(prim);
  }
}

// Replace the tiny beveled package solids with closed boxes. Their printed
// faces remain separate and untouched. At background scale the bevels are
// subpixel, while each former package used dozens of triangles.
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  if (!/^(Packaging \d|Poster cream)/.test(p.getMaterial().getName())) continue;
  const pos = p.getAttribute('POSITION'), ix = p.getIndices().getArray();
  const parent = Array.from({ length: pos.getCount() }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const coincident = new Map();
  for (let i = 0; i < pos.getCount(); i++) {
    const key = pos.getElement(i, []).map(v => Math.round(v * 100000)).join(',');
    if (coincident.has(key)) parent[find(i)] = find(coincident.get(key));
    else coincident.set(key, i);
  }
  for (let i = 0; i < ix.length; i += 3) {
    parent[find(ix[i + 1])] = find(ix[i]); parent[find(ix[i + 2])] = find(ix[i]);
  }
  const boxes = new Map();
  for (let i = 0; i < pos.getCount(); i++) {
    const id = find(i), v = pos.getElement(i, []);
    const box = boxes.get(id) || { min: [...v], max: [...v] };
    v.forEach((n, a) => { box.min[a] = Math.min(box.min[a], n); box.max[a] = Math.max(box.max[a], n); });
    boxes.set(id, box);
  }
  const vertices = [], normals = [], indices = [];
  const faces = [[0, 1, 1, 2], [0, -1, 2, 1], [1, 1, 2, 0], [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 1, 0]];
  for (const box of boxes.values()) for (const [axis, sign, u, v] of faces) {
    const offset = vertices.length / 3;
    for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const point = [0, 0, 0], normal = [0, 0, 0];
      point[axis] = sign > 0 ? box.max[axis] : box.min[axis];
      point[u] = a ? box.max[u] : box.min[u]; point[v] = b ? box.max[v] : box.min[v];
      normal[axis] = sign; vertices.push(...point); normals.push(...normal);
    }
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  for (const semantic of p.listSemantics()) p.setAttribute(semantic, null);
  p.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vertices)).setBuffer(buffer));
  p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer));
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer));
}
await doc.transform(weld());

// Preserve the source's physical glazing and emissive light fixtures.
// The renderer scales transmission resolution on phones instead of removing it.
const textures = [];
for (const texture of root.listTextures()) {
  const name = texture.getName();
  const isProduct = texture === productTexture;
  const isPoster = texture === printed.getBaseColorTexture();
  const isWordmark = /wordmark/i.test(name);
  const isBanner = /campaign-banners/i.test(name);
  // Both print atlases are 4x2 tile grids. At background scale a product
  // label is a few pixels and a poster a few dozen, so shrink each tile to
  // 12x16 and 42x56 (integer grid boundaries avoid bleed between tiles).
  const width = isProduct ? 48 : isPoster ? 168 : isWordmark ? 1536 : isBanner ? 640 : 256;
  const input = texture.getImage();
  const image = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: isProduct || isPoster ? 90 : 86 }).toBuffer();
  const meta = await sharp(image).metadata();
  texture.setImage(image).setMimeType('image/webp');
  textures.push({ name, width: meta.width, height: meta.height, bytes: image.length });
}
// Keep float positions: millimetre-spaced fascia layers otherwise z-fight.
await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder, target: 'size' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await mkdir(path.dirname(output), { recursive: true });
await io.write(output, doc);
const report = { source: path.basename(source), bytes: (await stat(output)).size, originalTriangles: before, triangles: triangles(), productLabelTriangles: productTriangles, materials: root.listMaterials().length, textures };
await writeFile(path.join(path.dirname(output), 'optimization-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
