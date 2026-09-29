# Kitsune cliff

The ledge at `/lab/kitsune` is kitbashed from two photoscanned rock faces and baked in Blender.

- `scans/rock_face_01`, `scans/rock_face_02`: Poly Haven scans by Dario Barresi, CC0
  (https://polyhaven.com/a/rock_face_01, https://polyhaven.com/a/rock_face_02), 2k glTF.
- `cliff.blend`: the baked scene (rock, grass, petals, lights, the website's camera).
- `cliff-lit.png`: the baked lighting texture, full precision, before WebP compression.

`scripts/assets/build-kitsune-cliff.py` does everything:

1. Assembles copies of the scans (`PIECES`): face-up and flattened for the top he sits on,
   upright for the sheer face dropping away on the left. A skirt traced under the rock tops
   fills any gap between the shells.
2. Grades the scans toward cool granite and grows moss in crevices and lichen on the tops.
3. Adds grass clumps where the rock steps down, and drifts of fallen petals.
4. Bakes the dusk lighting (low sun ahead and to the right, sky fill, his shadow) into one
   texture for the rock and into vertex colours for the grass and petals.
5. Exports `public/models/kitsune/cliff.glb`; `kitsuneCliff.js` shows it unlit.

The figure is only needed as a shadow caster. Blender can't read the site's meshopt-compressed
`keria.glb`, so decode a plain copy first (gltf-transform: read with the meshopt decoder,
`dequantize()`, drop the meshopt and quantization extensions, write).

```sh
# Quick look from the website's camera (transparent background):
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/assets/build-kitsune-cliff.py -- preview /tmp/cliff.png /tmp/keria_plain.glb
# Bake and export, then compress:
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/assets/build-kitsune-cliff.py -- bake /tmp/keria_plain.glb
node scripts/assets/optimize-kitsune-cliff.mjs
```

Coordinates in the script are the website's cliff-local frame: the seat is the origin, X runs
across the ledge (right on screen), Y is up, Z points back toward the camera.
