// Run after build-kitsune-cliff.py. The editable source stays in assets/kitsune/cliff.blend.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { stat } from 'node:fs/promises';

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const output = 'public/models/kitsune/cliff.glb';
const document = await io.read(output);
await document.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(output, document);
console.log(`Cliff GLB: ${((await stat(output)).size / 1024 / 1024).toFixed(2)} MB`);
