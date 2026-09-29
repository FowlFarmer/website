// Shrink a textured AI-generated scan (Meshy, Tripo) for the web without tearing its texture.
// Their UV atlases are fragmented and carry KHR_texture_transform, so the stock optimize preset
// (welding across seams, 12-bit texcoords) smears decals and lettering. Instead: decode to
// floats, weld only exact duplicates, simplify with seam borders locked, keep 16-bit UVs.
// Usage: node scripts/assets/optimize-scan.mjs <source.glb> <output.glb> [ratio=0.05]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, dequantize, prune, quantize, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [source, output, ratioArgument = '0.05'] = process.argv.slice(2);
if (!source || !output) throw new Error('Usage: optimize-scan.mjs <source.glb> <output.glb> [ratio]');
const ratio = Number(ratioArgument);

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(source);
const steps = [dequantize()];
if (ratio < 1) {
  steps.push(
    weld({ tolerance: 0 }),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0005, lockBorder: true }),
  );
}
steps.push(dedup(), prune(), quantize({ quantizePosition: 16, quantizeTexcoord: 16, quantizeNormal: 12 }));
await document.transform(...steps);
document.createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, document);

const triangles = document.getRoot().listMeshes()
  .flatMap((mesh) => mesh.listPrimitives())
  .reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0);
console.log(`${output}: ${triangles.toLocaleString()} triangles`);
