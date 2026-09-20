# Lawson website asset

`lawson-mobile.glb` is the web-only derivative of the photo-referenced Lawson.
The archival files remain untouched at `/Users/theodore/Desktop/Lawson_ThreeJS/`:

- `lawson-source.blend`: editable full-detail Blender scene and packed textures.
- `lawson.glb`: full-resolution interchange export.
- `lawson-web.glb`: original detailed standalone preview export.

Regenerate from the repository root:

```sh
npm run optimize:lawson -- /absolute/path/to/lawson.glb
```

The optimizer splits small package labels from the shared poster atlas, resizes
product tiles to 12x16 and poster tiles to 42x56, reduces surface maps to 256px,
and preserves more resolution for the logo and standing banners. Tiny beveled
package solids become closed boxes; their printed faces and all facade/sign
geometry remain. Full float positions prevent z-fighting between sign layers.
Meshopt compresses geometry; WebP compresses textures. The runtime requires the
Three.js MeshoptDecoder.

The web copy retains physical glass transmission and frosted lower panes.
The viewer's dawn HDR environment supplies reflections, with four interior lights
and a softer exterior key light. Mobile transmission renders at half resolution.
There is no full-screen bloom or shadow map pass. The HDR is Poly Haven's
Kiara 1 Dawn environment (CC0), shared with the original standalone viewer.
Touch devices use the low-power rendering path (1.1 pixel ratio cap, native antialiasing,
30 fps cap); hidden tabs pause rendering. The original scene pose is retained by
normalizing the model to the old building's local width, including saved poses.
The previous separate sign overlay is removed because the model has its own.

`optimization-report.json` records actual output dimensions and geometry counts.
Validated in desktop and 390x844 browser viewports; this is not a physical iPhone
GPU benchmark. The pre-existing bicycle rider and other website assets are not
included in the Lawson model's size/triangle figures.
