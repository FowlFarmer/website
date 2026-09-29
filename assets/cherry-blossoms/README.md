# Cherry blossom prop set

Four original, small-scale 3D assets inspired by the foreground blossoms and drifting petals in the supplied reference image:

| GLB | Intended use | Approximate size |
| --- | --- | --- |
| `open-blossom.glb` | Isolated five-petal flower with stamens | 0.25 m across |
| `three-blossom-sprig.glb` | Short flowering twig for rocky foreground | 0.37 m wide, 0.34 m tall |
| `opening-buds.glb` | Three closed buds on a branching stem | 0.17 m wide, 0.25 m tall |
| `fallen-petals.glb` | Ten loose petals for ground dressing | 0.4 m across |

The GLBs use meters, have their own origins, and contain no animation or external textures. Petals have a notched tip, a gently cupped surface, and pink-to-cream material bands. Each prop is separate and **is not loaded by the website**. `contact-sheet.png` is a render for review; `cherry-blossom-assets.blend` is the editable source.

To rebuild with Blender 4.5 or newer:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/create_cherry_blossom_assets.py
node scripts/assets/optimize-cherry-blossoms.mjs
```
