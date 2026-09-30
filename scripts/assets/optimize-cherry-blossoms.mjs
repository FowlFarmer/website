// Run after the Blender source script to reduce draw calls in the standalone GLBs.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { dedup, flatten, join, prune } from '@gltf-transform/functions';

const directory = resolve('assets/cherry-blossoms');
const io = new NodeIO();
for (const filename of [
  'open-blossom.glb',
  'three-blossom-sprig.glb',
  'opening-buds.glb',
  'fallen-petals.glb',
]) {
  const path = resolve(directory, filename);
  const document = await io.readBinary(new Uint8Array(await readFile(path)));
  await document.transform(
    dedup({ propertyTypes: [PropertyType.MATERIAL] }),
    flatten(),
    join({ keepNamed: false }),
    prune(),
  );
  await writeFile(path, await io.writeBinary(document));
  console.log(`Optimized ${filename}`);
}
