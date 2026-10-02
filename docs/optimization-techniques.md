# Website optimization techniques

How the portfolio site (React + Vite + three.js) was made lighter and smoother: what each technique does, why it works, and the numbers where we measured them. Everything was measured on an Apple M4, so slower machines gain more.

---

## 1. Cutting 3D geometry the camera can never see

**Files:** `scripts/assets/crop-kitsune-view.mjs` (reads `assets/kitsune/originals/`, writes `public/models/kitsune/`)

The kitsune scene's camera never moves freely. It holds one framing and only turns with the mouse, −2.5° to 17.5° across and ±1.2° up and down, on screens from 0.78:1 (tall) to 2.4:1 (ultrawide). Most of the rock and part of the figure are therefore never on screen, but they were still downloaded, decoded and sent to the GPU every frame.

**How it works:**

1. **Sample every possible camera.** The script rebuilds the scene's camera for every combination of 7 screen shapes × 9 yaw angles × 3 pitch angles (189 cameras), using the exact maths the site uses: same framing, field of view per aspect, and turn about the target.
2. **Put each mesh where it sits in the scene.** Each mesh's world matrix is copied from the running scene (read through the `?debug` hook), so the test sees the model exactly as rendered.
3. **Keep a triangle if any camera could see it, with a buffer.**
   - **In view:** at least one of its corners lands inside some camera's view, widened by 20% on every edge (a clip-space test: `|x|, |y| ≤ 1.2·w`).
   - **Facing a camera (figure only):** its front side faces at least one camera, give or take a buffer, keeping faces up to about 107° from facing the camera, roughly 17° past side-on. Surfaces facing away from every camera position are removed. The winding was checked against the stored vertex normals first (99% agreed), so "front" really is front.
4. **Rebuild the mesh** from only the kept triangles, then drop the vertices nothing uses anymore.

**Results:**

| Model | Triangles before → after | File |
|---|---|---|
| Rock (stone) | 142,853 → 24,172 (17%) | 2.68 MB → 1.20 MB (whole rock file) |
| Figure | 130,858 → 91,041 (70%) | 2.30 MB → 2.01 MB |

The figure keeps more because he's turned about 100° to the side. The camera sees his side, and only the part only a reverse view would show is gone.

**How it was checked:** screenshots at both ends of the mouse turn on a wide screen, and a view from directly opposite the camera: the rock shows cut edges behind the ledge, and the figure is hollow.

**Rerun it** whenever his placement, the camera framing or the rock changes, after re-copying the world matrices from `/lab/kitsune?debug`.

---

## 2. Blanking unused texture areas

**File:** the same crop script

A model's texture is like a sticker sheet: each part of the surface takes its colour from its own patch of one image. After the crop, only about 18% of the rock's 4096×4096 image was used by surviving triangles.

**How it works:**
1. For each kept triangle, map its texture coordinates onto the image, accounting for any texture transform (offset and scale), and fill that triangle in a coverage mask.
2. Grow the mask by 8 pixels, so texture filtering at the edges never samples blanked pixels.
3. Paint everything outside the mask one flat colour (the average of what's inside) and re-encode as WebP.

The image keeps its dimensions, but a big flat area compresses to almost nothing: **1,060 KB → 385 KB**. Nothing on screen changes, because those pixels no longer paint anything.

**Limits:**
- **Download only:** this doesn't save GPU memory. The image is still 4096² once loaded, about 85 MB uncompressed. Saving memory would need the visible 18% repacked into a smaller image.
- **Not for the figure:** his surviving triangles still used 85% of his textures, so blanking saved about 30 KB. The re-encoding also visibly softened his detail (see section 3), so his textures are left byte-for-byte original.

---

## 3. Compression that doesn't wreck textures

**Files:** `scripts/assets/optimize-scan.mjs`, `scripts/assets/crop-kitsune-view.mjs`

Models are compressed with meshopt (`EXT_meshopt_compression`), which rounds positions, normals and texture coordinates to fewer bits. The defaults round texture coordinates to 12 bits. That's fine for most models, but not for AI-generated scans like the figure (Meshy):
- **Many pieces:** Meshy lays the texture out in many small pieces.
- **Tiled texture:** it applies a texture transform that repeats the texture about 16× across the coordinates.

So 12-bit rounding moves the lettering (the "KERIA" print and the LCK logo) onto the wrong pixels, and they smear. The standard pipeline also **welds vertices across texture seams**, which drags coordinates across piece boundaries.

**The fix:**
- **Precision:** fully unpack, then re-quantize at 16-bit positions, 16-bit texture coordinates and 12-bit normals, then meshopt-compress.
- **Seams:** when simplifying, weld only exact duplicates (`tolerance: 0`) and lock borders.
- **Textures:** never re-encode already-compressed textures. Compressing a WebP again stacks the losses.

The rock is fine with the defaults and keeps them, which saves about 240 KB compared with 16-bit.

**Lesson:** this caused the "textures look like shit again" regression. The crop script first used the default compression and re-encoded his textures, and fixing both restored him.

---

## 4. Drawing identical props in one call (instancing)

**File:** `src/components/experience/kitsuneRig.js` (`scatterBlossoms`)

Thirty-four cherry blossom props are scattered on the ledge: 16 fallen petals, 9 open blossoms, 5 opening buds and 4 sprigs. Each was a `clone(true)` of its model. Clones share geometry and materials, so memory is the same, but each copy is still its own object. The GPU got one draw call per part of each copy, about 220 per frame, each with CPU setup: an on-screen check, matrix updates, uniform uploads and geometry binding.

**The fix:** one `InstancedMesh` per part of each prop, holding every copy's transform (its spot on the rock × the part's placement inside the prop). All copies of a part draw in one call.

**Result:** about **220 → 28 draw calls per frame**, with the same triangles and the same seeded spots. This is a steady saving every frame, not a one-off: probably a millisecond or two per frame on a laptop, and it matters most on weak CPUs.

---

## 5. Precomputing the calligraphy petals (baking)

**Files:** `src/components/calligraphyPetals.js`, `scripts/dev/calligraphyBakePlugin.mjs`, `public/calligraphy/petals-{0,1,2}.json`

Hovering a character of 朱加宇 bursts it into petals that fly out and spell its meaning, and scrolling flies the name into the menu bar. Preparing that ran in the browser after every page load:
- **Large petals:** random points inside the brush strokes, each tested against the glyph outline.
- **Small petals:** the meaning words drawn on a hidden canvas and read back pixel by pixel. A distance pass and even dart-throwing then place petals along the letter strokes, turned to follow each stroke.
- **Cutting:** every glyph drawn at 6× resolution, and each pixel assigned to its nearest petal (a weighted Voronoi, or power diagram), giving each piece a 48-direction outline so ink can morph into petal and back.
- **Menu-bar pieces:** the same cutting again for the characters that fly into the bar.

That's hundreds of thousands of point tests plus slow canvas read-backs, **about 1.8 s of main-thread work in three blocks of 0.4–0.8 s**. It was scheduled for when the browser was idle, but each block still froze clicks and scrolling while it ran.

**The fix:**
1. **Pure functions:** the preparation moved into pure functions (`prepareGlyphPetals`, `prepareNavPieces`). Everything is in the characters' own drawing units, so it doesn't depend on screen size.
2. **Browser bake:** in dev, `await window.__bakeCalligraphy()` runs them in the browser (real canvas text rendering, with the real font) three times, and posts each result to a local-only dev-server endpoint that writes the JSON.
3. **Runtime:** the page fetches one of the three variants at random, so the layout still varies between visits, and unpacks it in a few milliseconds.
4. **Compact format:** every field is a whole number, positions in hundredths of a unit and outline radii in tenths. Each radius is stored as the step from the previous one, so neighbouring values are small and compress well. That took a variant from 122 KB to **86 KB gzipped** (76 KB with brotli), with a worst-case error of about a tenth of a pixel.
5. **Safety:** each bake stores a fingerprint of everything it was made from: the glyph data, the words, the font, every constant and the file format. If anything changed, the bake is ignored and the petals are computed live as before, with a dev console warning to rebake.

**Result:** the three post-load freezes are gone. The only runtime cost is a 14 ms fetch.

---

## 6. Shipping one font for everyone (Inter)

**Files:** `src/main.jsx`, every font rule in the CSS

The site shipped no fonts. It named Helvetica Neue and used whatever each device had:
- **Mac:** Helvetica Neue.
- **Windows:** Arial.
- **Android:** Roboto.
- **Cards:** these named only `Helvetica` at weight 100, which fell back unpredictably and couldn't be thin on Windows.

**The fix:** self-host Inter as a variable font (`@fontsource-variable/inter`, a single file covering weights 100–900) and point every font rule at it. The browser downloads about 48 KB for basic Latin, plus a small extra file for the accents in "Zhū Jiā Yǔ", split by `unicode-range` so unused scripts never download.

This matters for performance work too: the calligraphy bake draws letters with the site font, so a single shipped font makes the bake correct on every device.

---

## 7. Keeping the page scroll smooth over a 3D canvas

**Files:** `src/components/CherryBlossomScene.jsx`, `src/components/experience/KitsuneScene.jsx`

- **Wheel listener:** three.js `OrbitControls` registers a non-passive wheel listener, so the browser must wait for JavaScript before every scroll. The page then only scrolls once the wheel stops, and jumps. On the site, the controls are now **disconnected unless the scene editor is open**. Only the `/lab/kitsune` tuner keeps them.
- **Lab camera:** the lab's camera controls move a stand-in camera the mouse sway never touches. Previously the sway rewrote the real camera every frame and undid each scroll or drag. This is a correctness fix, but it's the same "don't fight the render loop" idea.

---

## 8. Loading and preparing 3D work off the critical path

**Files:** `CherryBlossomScene.jsx`, `kitsuneRig.js`, `kitsuneHologram.js`

- **Preloading the kitsune:** on the homepage, the kitsune scene loads 2.5 s after the Lawson scene finishes, when the browser is idle. Its shaders are then compiled in the background (`renderer.compileAsync`) and the glow pass runs once off screen (`warm()`), so switching to /quests doesn't stall on compilation.
- **Cached shadows:** the rock and figure never move, so the shadow map is rendered once (`shadowMap.autoUpdate = false`) instead of every frame, while the tails keep animating.
- **Fading layers:** each scene renders into its own layer and fades between targets over 450 ms, so a scene that's fully faded out can be skipped.
- **Faster blossom scatter:** dropping the blossoms onto the rock first raycast against every rock triangle: **1,230 ms**. Bucketing the rock's triangles into a grid under the scatter ring and testing only the local bucket brought it to **about 20 ms**.
- **Tail hover:** tails are picked against a simplified outline shell, and the lore click tests one plain box around the body and resting tails, instead of the full meshes.

---

## 9. Loading heavy page content only when it's needed

**Files:** `src/components/LazyPdf.jsx`, `src/components/ProjectFader.jsx`

- **PDFs:** each inline PDF runs the browser's whole PDF viewer. `LazyPdf` shows a still image of the first page (`*_preview.webp`) and only mounts the real viewer once it comes within 300 px of the screen.
- **Project cycling:** `ProjectFader` pauses its auto-cycling while off screen or hovered, so hidden cards don't keep re-rendering.

---

## 10. How the audit was done

The audit used a production build (`vite build` + `vite preview`), because dev mode inflates JavaScript cost. The methods were:

- **Bundle composition:** decoding the source maps to total the bytes each library or source file contributes. This found `RegionIcons.jsx`, the traced emblem outlines at 152 KB raw (59 KB gzipped), in the main bundle on every page.
- **Main-thread stalls:**
  - Long Animation Frame entries (`PerformanceObserver`, type `long-animation-frame`) list every frame over 50 ms and the script that caused it.
  - Their code offsets were mapped back to source lines through the source maps, which pinpointed `CalligraphyName.jsx:664`, the scene setup effect, and the shader-compile frame.
- **Sampled profiling:** the JS Self-Profiling API needs a `Document-Policy: js-profiling` header, so a temporary preview config added it. A profiler started from the first line of the page gives time per function, including native WebGL calls such as shader compile and texture upload.
- **Per-frame cost:**
  - Wrapping `requestAnimationFrame` timed CPU per frame.
  - Wrapping the WebGL2 draw functions counted draw calls and triangles.
  - GPU time needs `EXT_disjoint_timer_query_webgl2` and a visible page. The preview pane was hidden, so GPU numbers are still unmeasured.
- **Pitfalls hit:**
  - **Hidden pane:** a hidden pane throttles or pauses frames, which also tripped the site's automatic "3D off" switch.
  - **Warm shader cache:** Chrome caches compiled shaders, so only the first load shows cold-start costs.
  - **Real GPU:** the WebGL renderer string confirmed a real GPU, not software.

---

## 11. Smooth page transitions (one persistent fade)

**File:** `src/App.jsx`

- **One fading element:** route changes used framer-motion to mount a new animated `<main>` per page, and it let two stray frames through: the new page at full opacity before its fade-in began, and a frame at 0 as it ended. Now one `<main>` stays on the page. It fades out with a plain CSS transition, the page is swapped while it's invisible (scrolled to the top at that moment), and it fades back in.
- **Swap on the fade's end:** the swap waits for the fade-out's `transitionend`, with a timer as fallback. A busy frame can start the fade late, and a fixed 350 ms timer then swapped at 76% opacity.
- **Scene follows the URL:** the scene switches between the kitsune and the store on the click, in parallel with the page fade, instead of when the page mounts or unmounts.
- **Navbar hand-off:** arriving home, the navbar takes the homepage's "name, not bar" shape immediately, so the homepage taking over changes nothing visible.

## 12. Lazy images, resized images

**Files:** the card components, `Gallery.jsx`, `Contact.jsx`, `Self.jsx`, `public/`

- **Lazy loading:** 49 images got `loading="lazy" decoding="async"`, so gallery images several screens down no longer compete with the 3D assets on load.
- **Resizing:** images far larger than they're shown were resized to about 3.75× their on-screen size at a 1024 px window, which is enough for a 1920 px screen at 2× pixel density. PNG photos became WebP, keeping transparency. Examples:
  - The bugshot logo went from 1536 px to 746 px, 120 KB → 28 KB.
  - Two hackathon logos went from 73 KB to 5 KB and from 106 KB to 10 KB.
  - A 52 px icon went from 89 KB to 7 KB.
  - In total about 1 MB became about 370 KB.

## 13. Splitting the code: the quests page is its own download

**File:** `src/App.jsx`

- **Split:** the quests page (its cards, the gallery, the traced region emblems, and framer-motion, which only it uses) is now loaded with `React.lazy`. The homepage's main bundle went from **219 KB → 99 KB gzipped**.
- **No wait on arrival:** the homepage prefetches the quests file when idle, and a click toward /quests fetches it at once, while the old page fades out, so it's ready at the swap.

## 14. A smaller lighting environment

**Files:** `scripts/assets/downscale-hdr.mjs`, `public/models/lawson/dawn-environment.hdr`

- **Downscaled:** the store's 1024×512 HDR environment (1.44 MB) was halved to 512×256 (363 KB). The script reads Radiance RGBE, averages 2×2 blocks in linear light and re-encodes it run-length compressed.
- **Checked numerically:** the store was rendered offscreen under both maps and the pixels compared. At the site's 0.18 environment strength, the mean difference is under 0.2/255, with small spots up to 17/255 on the glass reflections.

## 15. The 3D scene: load order, background shader compile, debounced rebuilds

**File:** `src/components/CherryBlossomScene.jsx`

- **Kitsune first on /quests:** arriving straight on /quests, the backdrop loads alone so the kitsune can load first. The store, rider and their lighting (about 2.5 MB) follow once the kitsune has been showing a while and the page is idle, or at once when heading home. The store's fade-in waits until it's actually there.
- **Background shader compile:** the store and rider are compiled with `renderer.compileAsync` (parallel compile) before they're first drawn, instead of on their first frame, which froze a cold first visit for about 2 s. The lighting environment is awaited first, since it changes which shaders they compile to. The compile camera uses the models' render layer, so lights match the real draw.
- **Debounced layout switch:** crossing the phone/desktop width rebuilds the whole scene (about 2.5 s). It now waits until the window has settled on one side (400 ms) rather than rebuilding on every crossing during a drag. Adapting the running scene instead would mean restructuring all of its setup, which isn't worth it for something that only happens when a desktop window is resized.

## 16. Lighter textures for low-power devices

**Files:** `scripts/assets/downscale-glb-textures.mjs`, `public/models/cherry-blossom/bicycle-rider-low.glb`

- **Quarter-size textures:** phones and other low-power devices load the rider with its three 2048² textures scaled to 1024², cutting GPU memory from about 64 MB to 16 MB (and the download from 998 KB to 830 KB). It's drawn small there.
- **Kitsune unchanged:** its large textures stay, because it's only shown on desktop.

---

## Still on the list

| Issue | Why it's left |
|---|---|
| GPU cost per frame (glow, glass blur) | Needs measuring with the page visible; the preview pane was hidden |
| Scene setup (~1.5 s: 3D context creation, sizing, texture reads) | Mostly browser and driver work in creating the WebGL context; little to spread out |
