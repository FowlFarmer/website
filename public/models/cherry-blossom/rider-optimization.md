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
