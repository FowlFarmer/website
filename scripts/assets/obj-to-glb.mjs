// Convert an untextured sculpt (OBJ) into a small web glb: positions only (colour comes from a
// shader), centred on its footprint with its base at y = 0, simplified and meshopt-compressed.
// Usage: node scripts/assets/obj-to-glb.mjs <source.obj> <output.glb> [ratio=0.1]
import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, quantize, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [source, output, ratioArgument = '0.1'] = process.argv.slice(2);
if (!source || !output) throw new Error('Usage: obj-to-glb.mjs <source.obj> <output.glb> [ratio]');
const ratio = Number(ratioArgument);

const vertices = [];
const indices = [];
for (const line of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  const [kind, ...fields] = line.trim().split(/\s+/);
  if (kind === 'v') vertices.push(fields.slice(0, 3).map(Number));
  if (kind === 'f') {
    // Fan-triangulate polygons; OBJ indices are 1-based and may be negative (relative).
    const corners = fields.map((field) => {
      const index = parseInt(field, 10);
      return index < 0 ? vertices.length + index : index - 1;
    });
    for (let corner = 1; corner + 1 < corners.length; corner += 1) indices.push(corners[0], corners[corner], corners[corner + 1]);
  }
}

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
vertices.forEach((vertex) => vertex.forEach((value, axis) => {
  min[axis] = Math.min(min[axis], value);
  max[axis] = Math.max(max[axis], value);
}));
const offset = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
const positions = new Float32Array(vertices.flatMap((vertex) => vertex.map((value, axis) => value - offset[axis])));

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const document = new Document();
const buffer = document.createBuffer();
const primitive = document.createPrimitive()
  .setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer))
  .setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer));
const mesh = document.createMesh('rock').addPrimitive(primitive);
document.createScene().addChild(document.createNode('rock').setMesh(mesh));

await document.transform(
  weld({ tolerance: 0 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: true }),
  prune(),
  quantize({ quantizePosition: 16 }),
);
document.createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(output, document);

const size = max.map((value, axis) => (value - min[axis]).toFixed(2)).join(' × ');
console.log(`${output}: ${(primitive.getIndices().getCount() / 3).toLocaleString()} triangles, ${size} units`);
