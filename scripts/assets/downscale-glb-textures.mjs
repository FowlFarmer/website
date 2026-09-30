// Write a copy of a .glb with its textures scaled down to fit a maximum size, geometry untouched
// (for low-power devices, where the model is drawn small and GPU memory is tight).
//   node scripts/assets/downscale-glb-textures.mjs <in.glb> <out.glb> <max size, e.g. 1024>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const [input, output, maxSize] = process.argv.slice(2);
const max = Number(maxSize);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});
const document = await io.read(input);
for (const texture of document.getRoot().listTextures()) {
  const image = sharp(Buffer.from(texture.getImage()));
  const { width, height } = await image.metadata();
  if (Math.max(width, height) <= max) continue;
  // The same format back; WebP normal and roughness maps stay near-lossless.
  const resized = await image.resize({ width: Math.min(width, max), height: Math.min(height, max), fit: 'inside' })
    .webp({ quality: 90 }).toBuffer();
  texture.setImage(new Uint8Array(resized)).setMimeType('image/webp');
  console.log(`${texture.getName() || 'texture'}: ${width}x${height} -> fit ${max}`);
}
await io.write(output, document);
console.log(`${output}: ${((await stat(input)).size / 1024).toFixed(0)} KB -> ${((await stat(output)).size / 1024).toFixed(0)} KB`);
