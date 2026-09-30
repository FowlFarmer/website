# Website rider derivative

The original `bicycle-rider.glb` is archived in Git history at commit `381b4c8`.
It is no longer shipped in the public directory. The website loads
`bicycle-rider-mobile.glb`, reduced from 972,774 to 48,634 triangles (95% fewer).
Download size decreased from 5,089,288 to 1,021,752 bytes.

This uses UV-aware mesh simplification rather than voxel remeshing, preserving
the existing texture layout. The simplifier targets 5% of the geometry with a
relative error limit of 0.001. Geometry uses Meshopt; textures use WebP.

To reproduce, first recover the original from Git history, then run from the repository root:

```sh
git show 381b4c8:public/models/cherry-blossom/bicycle-rider.glb > /tmp/bicycle-rider-original.glb
npx --yes @gltf-transform/cli@4.5.0 optimize /tmp/bicycle-rider-original.glb public/models/cherry-blossom/bicycle-rider-mobile.glb --compress meshopt --texture-compress webp --simplify-ratio 0.05 --simplify-error 0.001 --palette false
```

The website now uses Meshopt for both models, avoiding the previous additional
Draco decoder download. Visual review is at website scale, not a guarantee of
equivalent detail for close-up renders. No physical-device FPS claim is made.

Phones and other low-power devices load `bicycle-rider-low.glb`: the same geometry with its three
2048px textures scaled to 1024px (about 64 MB of GPU memory down to 16 MB):

```sh
node scripts/assets/downscale-glb-textures.mjs public/models/cherry-blossom/bicycle-rider-mobile.glb public/models/cherry-blossom/bicycle-rider-low.glb 1024
```

Both are then cut to what the scene's camera can ever see (the far side of the rider and bike,
about a third of the triangles), with everything kept in exactly its original precision (16-bit
positions and texture coordinates, losslessly recompressed) and the textures untouched:

```sh
node scripts/assets/crop-store-view.mjs --write
node scripts/assets/downscale-glb-textures.mjs public/models/cherry-blossom/bicycle-rider-mobile.glb public/models/cherry-blossom/bicycle-rider-low.glb 1024
```

The uncut model is kept in `assets/store/originals/`. The store goes through the same script but
keeps every triangle: all of it is in view, and its materials are double-sided.

`bicycle-rider-512.glb` (textures fit to 512px) is only a trial, chosen from the frame meter's render
settings on previews:

```sh
node scripts/assets/downscale-glb-textures.mjs public/models/cherry-blossom/bicycle-rider-mobile.glb public/models/cherry-blossom/bicycle-rider-512.glb 512
```
