# The Kitsune Scene: Stack, Trade-offs and How We Got Here

*Holographic nine-tailed-fox tails for the Experience section of the portfolio site.*
*Current state: committed to `devel` as `bc382f3`, live at `/lab/kitsune`.*

---

## 1. What it is

The Experience section is being rebuilt around one image: a 3D model of Theodore, seated and seen from behind, with **six holographic fox tails** fanning out from his tailbone. Each tail is one role. Tails are ordered **newest → oldest, left → right**:

| Tail | Role | Hologram palette |
|---|---|---|
| 1 | Tesla Autopilot (incoming) | Tesla red |
| 2 | Mundane.co | tuxedo: 65% black, 35% white |
| 3 | Tesla (Jan–Apr 2026) | Tesla red |
| 4 | WATonomous | teal |
| 5 | Independent Robotics | periwinkle |
| 6 | Rapyuta Robotics | 60% white, 30% black, 10% red |

The tails are much larger than the figure (≈6.6 units vs ≈1.5 seated), sway gently, blow around in wind from the mouse, collide with each other and the body, glow like translucent crystal (K/DA Ahri was the reference), and brighten on hover. On the final page the 3D scene sits on the **right**, with role content on the left.

The environment is still a grey placeholder cliff over a dusk Fuji photo. The next step is a stylised procedural rock outcrop (see §9).

---

## 2. The stack at a glance

```
public/models/kitsune/
  keria.glb   2.4 MB   seated figure (Meshy scan, 131k tris, textured)
  tail.glb     30 KB   one sculpted fox tail (Meshy, 4.3k tris, untextured)

src/data/experience.js          roles + each role's `hologram` palette
src/components/KitsuneLab.jsx   route shell for /lab/kitsune
src/components/experience/
  KitsuneScene.jsx    scene, camera, loaders, tail layout, hover, wind input, render loop
  kitsuneTails.js     body measurement, tail home curves, sculpt prep, skinning, collision shell
  kitsunePhysics.js   Verlet chains, springs, constraints, two-layer collisions, gusts, settle
  kitsuneHologram.js  hologram shader + material, bloom composer, backdrop crop
  experience.css      full-screen stage (and older concept styles)

scripts/assets/optimize-scan.mjs   shrink AI scans without tearing their textures
```

Per frame:

```
pointer move ──► ray vs hover shells ──► hovered tail
             └─► ray vs camera-facing plane ──► gust (position, velocity)

physics.update(dt)       fixed 120 Hz steps: forces → Verlet → 4× (lengths, bends, cores, shells, body)
skin.update(chain)       per tail: smooth chain → frames → bend mesh (CPU)
hover shells update      rebuilt from the physics shell corners
material uniforms        time, rest glow, hover amount (eased)
composer.render()        scene (backdrop + figure + cliff + petals + tails) → bloom → output
```

---

## 3. Assets and the model pipeline

### 3.1 The figure

AI image → Meshy image-to-3D → GLB. We went through three figures:

1. **The bicycle rider** (Tripo, already on the site). Good for testing shaders, but its baked lighting and thin bike geometry fight anime shading.
2. **"Quiet Reverie"** (Meshy, seated, cosy sweater). Used for the first tail layouts.
3. **Keria** (Meshy, seated on the ground, LCK Keria jacket). This is the current model.

Meshy output is about 2.2M triangles and 42–46 MB, far too heavy for the web.

**The texture-tearing problem.** The stock `gltf-transform optimize` preset shredded the jacket lettering ("KERIA" torn into jagged fragments). We isolated it with a controlled comparison from a fixed close-up camera:

| Variant | Result |
|---|---|
| Original 46 MB | clean |
| Stock optimise, 5% simplify, WebP textures | torn |
| Same, original textures | torn (so WebP wasn't the cause) |
| Stock optimise, *no* simplification | torn (so simplification wasn't the cause either) |
| **Decode → exact weld → simplify with locked seams → 16-bit UVs** | **clean, even at 5%** |

Meshy UV atlases are fragmented and carry `KHR_texture_transform`. The preset welded vertices across UV seams and quantised texture coordinates to 12 bits, which shifted decals by whole texels. `scripts/assets/optimize-scan.mjs` does it carefully instead:

```
dequantize() → weld({ tolerance: 0 }) → simplify({ ratio, error: 0.0005, lockBorder: true })
             → quantize({ position: 16, texcoord: 16, normal: 12 }) → meshopt
```

Result: **46 MB → 2.4 MB, 131k triangles, visually indistinguishable** from the original up close.

```bash
node scripts/assets/optimize-scan.mjs ~/Downloads/model.glb public/models/kitsune/model.glb 0.05
```

### 3.2 The tail

One Meshy tail (text-to-image of a nearly straight fox brush, then image-to-3D). It was untextured, 2.19M triangles, and its vertices weren't shared between triangles (flat normals), so plain simplification barely helped. Two pipeline bugs came up along the way:

- Simplifying without decoding the quantised positions first collapsed the tail flat in two axes. Fixed by running `dequantize()` first.
- Its normals prevented welding. Fixed by dropping normals, welding, simplifying, and recomputing normals at load.

It went 21.9k tris → **4,330 tris / 30 KB** once we realised the hologram hides fine fur detail. The loosened simplifier error (0.006) was needed to get below ~8k.

**Orientation:** the sculpt runs *tip → root along +z*; the flat-cut root is the thin end. We initially mounted it backwards.

---

## 4. Measuring the body

Nothing about the figure is hard-coded; `measureBody(mesh)` derives a body frame at load from about 50k sampled vertices:

- **Ground and height:** the lowest and highest vertex. Loops only: an earlier `Math.min(...spread)` blew the call stack on the full-resolution mesh.
- **Torso centre:** the mean of the shoulder band, 55–70% of the height up.
- **Forward:** the mean direction from the torso to the low vertices that reach furthest out, which are the legs. The Keria model is rotated about **39°** off the world axes; building the first tails on world −Z is why they looked "stuck into his right side".
- **Tailbone anchor:** the rearmost point on the centreline just above the seat, nudged 5% of the height inward so root caps hide in the jacket.
- **Collision volumes:** a torso capsule (hips → shoulders, r = 0.15 × height) and a head sphere (r = 0.09 × height).

The scene, the camera, the cliff and the tails all derive from this frame, so swapping the model re-fits everything.

---

## 5. Tail layout (the "home pose")

`tailHomeSpine()` traces each tail by *steering a direction* along its length rather than placing control points directly, which gives smooth, controllable 3D curves.

- **The stalk (first 24% of the length):** the long bottom of the S. It leaves the tailbone heading **back and slightly down**, spreading sideways toward its side of the fan (`sin(fan) × 0.9`), so tails separate before they get thick.
- **The body:** it rises into the fan. `fan` is the angle from vertical toward the figure's side; `lean` tilts it toward the viewer.
- **Two independent S-waves** make it three-dimensional:
  - `sway`: across the fan. Neighbours bend the **same way** with gradually shifting phase ("combed"), so they never cross.
  - `depth`: toward the viewer (+) or forward over the shoulders (−), **alternating** between neighbours so the fan has real depth.
- **Tip:** it curls outward; the widest tails droop.
- **Roots:** each tail starts at its own point on a ±0.16-unit arc across the tailbone.

| Tail | fan | lean | length | sway / phase | depth / phase |
|---|---|---|---|---|---|
| 1 | −1.30 | 0.34 | 0.86 | 0.2 / 0.0 | +0.36 / 0.2 |
| 2 | −0.80 | 0.60 | 0.96 | 0.2 / 0.3 | −0.34 / 1.3 |
| 3 | −0.28 | 0.30 | 1.00 | 0.2 / 0.6 | +0.40 / 2.2 |
| 4 | +0.28 | 0.56 | 0.98 | 0.2 / 0.9 | −0.36 / 0.7 |
| 5 | +0.80 | 0.32 | 0.94 | 0.2 / 1.2 | +0.38 / 1.8 |
| 6 | +1.30 | 0.58 | 0.84 | 0.2 / 1.5 | −0.30 / 2.6 |

*(Lengths are multiples of TAIL_LENGTH = 6.6.)*

---

## 6. Skinning: bending one sculpt along a chain

`prepareTailSource()` reads the sculpt **once**. For every vertex it stores:

- `along`: how far down the tail it is (0 root → 1 tip);
- its offset from the tail's core, per 48 bins along the length. Offsets are mirrored in x, because running the length backwards mirrors the mesh;
- its normal expressed in the tail's local frame (tangent, side, up).

`createTailSkin()` then fits it to a chain of **22 points**, applying a shape remap:

- **Tapered stalk:** the first 18% of the sculpt is stretched over the first 24% of the chain and narrowed to 20% girth at the root. It's a long stalk out of the tailbone, with no extra geometry.
- **Pointy tip:** from 78% of the length on, girth narrows to 8% at the very tip.

Per frame, `update(chainPoints)` does only interpolation. Nothing is rebuilt:

1. **Taubin smoothing** of the chain (3 passes of +0.5 then −0.53), so solver jitter doesn't reach the mesh but length and shape are preserved.
2. **Frames** by parallel transport of a reference side vector: minimal twist, no Frenet flips.
3. **Curvature** per point (second difference across the tangent), averaged with neighbours.
4. **Per vertex:** a Catmull-Rom position along the chain, the frame interpolated and **renormalised** (so the tail doesn't thin between points), and then **curvature-aware compression**. On the inside of a bend, the offset toward the bend's centre is eased with `limit × tanh(offset / limit)`, where `limit = 0.85 / curvature`, so fur can't cross the bend's centre and fold through itself. The outside is untouched.
5. The normal is rotated by the same frame; no `computeVertexNormals` per frame.

**Pinching, measured** as folded triangles above the sculpt's own baseline (a perfectly straight tail already has 12.4%, from overlapping fur locks):

| | at rest | peak of a strong sweep |
|---|---|---|
| Linear frames, no compression | — | (the visibly "pinchy" version) |
| + curvature compression + bend constraint | +0.17% | +0.43% |
| **+ Taubin smoothing + curvature averaging** | **+0.06%** | **+0.12%** |

---

## 7. Physics

`createTailPhysics()` treats each tail as a **Verlet chain of 22 points** stepped at a fixed **120 Hz**; the accumulator is capped at 8 steps so a background tab doesn't explode. The first two points are pinned to the tailbone.

### Forces

- **Home springs** pull each point toward its settled home: stiffness 22 at the root, easing to 1.5 at the tip (`(1 − u)^2.2`). They're soft enough that tails ease back rather than bounce.
- **Ambient sway:** a slow push across the fan and in depth, out of phase between tails and growing toward the tip (strength 0.22 × scale, rate 0.35).
- **Mouse gusts:** the pointer's path is projected onto a camera-facing plane through the fan. Each move leaves a gust with the pointer's world velocity (capped at 2.5 × scale), a Gaussian radius of 0.75 × scale, and a 1.6 s life with exponential decay. Gain is 0.4, weighted toward the tip.
- **Damping:** velocity × (1 − 0.045) per step. Heavy and calm.

All distances scale with `TAIL_LENGTH / 3.3`, so the tails behave the same at any size.

### Constraints (4 iterations per step)

1. **Segment lengths:** stiff.
2. **Bending:** points two links apart can't come closer than 92% of their home distance, so the chain curves but never kinks.
3. **Core capsules (tail vs tail):** a capsule along each centreline at 65% of the shell's mean radius. Closest points between segment pairs (Ericson), guarded against zero-length segments. **This layer exists because shells alone can be fooled:** when two tails' centres cross, the "shallowest way out" for a shell corner can be straight through the other tail. Cores can't be fooled, and they're what made settling converge.
4. **Low-poly shells (tail vs tail surface contact):** 12 rings × 8 sides per tail, radii from the sculpt's **95th-percentile** fur distance per sector, following its real, lopsided cross-section and pointed tip. Consecutive rings form convex segments. Shell corners **and** the midpoints between rings are tested against other tails' segments and pushed out along the shallowest face. A bounding-sphere broad phase skips distant pairs. The first 3 rings (the stalks at the tailbone) don't collide.
5. **Body and ground:** shell corners are pushed out of the torso capsule, the head sphere and the ground.

### Settle and stability

- **Settle at load:** constraints only, uncapped, run until the deepest overlap is under 0.002 × scale. That becomes the true home pose, so tails never fight their own springs at rest. Currently **63 passes, ~36 ms**.
- **Contacts are soft at runtime:** each pass resolves 40% of an overlap, capped at 0.015 × scale, and **moves the previous position with the point**. In Verlet, a bare position correction is a velocity kick, and repeated small contact pushes were the jitter. Contacting points also lose 12% of their speed (friction).
- **NaN safety:** the shader guards its inputs and clamps its output, and any chain holding a non-finite value snaps back to its home. A single NaN pixel makes bloom flash the whole screen.

### Stability, measured

| Check | Before fixes | Now |
|---|---|---|
| Max tip speed at idle | 4.07 m/s | ~0.1 m/s |
| Jolts in the first 3 s after load | 1,119 | **0** |
| Settle | failed after 2,000 passes | **63 passes** |
| Visible vertices inside another tail at rest (of 9,348 sampled) | 543, up to 17 cm | **11, up to 3.6 cm** (fur brushing) |

---

## 8. The hologram

### Shader (`kitsuneHologram.js`)

- **Fresnel rim glow:** faces pointing at you are nearly clear; silhouettes glow.
- **A lightsaber core** (`facing^7`) on light colours: a hot, near-white centre.
- **Life:** slow energy bands along the length, a faint sparkle, and a whiter, brighter tip.
- **A soft root fade:** the six stalks overlap at the tailbone, and without it their light piled into a white blowout.
- **Coat markings:** each vertex gets a static `marking` value, two-octave value noise over the sculpt's *rest* shape with its own seed per tail, so patches ride with the fur. Palette entries have a `share`; cut-offs are placed at the quantiles of that tail's marking values, so shares are exact (verified: Mundane 65/35, Rapyuta 60/30/10).
- **Per-layer gain (0.2):** the fur is many overlapping locks, so a pixel crosses several surfaces; each adds a little.

### Blending: black holograms

Premultiplied blending (`ONE, ONE_MINUS_SRC_ALPHA`):

- **RGB adds light**, the glow;
- **alpha dims what's behind**, so dark colours (black, navy) become **tinted dark glass** with a faint edge sheen.

Pure additive blending can't show black, which is why early palettes had to "lift" navy and fake black with bands.

### Tuning (per colour, chosen by eye with a temporary slider panel)

| Colour | Strength | Hover |
|---|---|---|
| Tesla red `#ff2238` | 1.5 | 2.1× |
| Black `#050505` | 1.0 | 1.9× (darker) |
| White `#ffffff` | 0.35 | 2.0× |
| WATonomous teal `#3fc4e8` | 0.8 | 1.8× |
| IR periwinkle `#8f8fe6` | 1.0 | 2.0× |
| Rapyuta red `#ff2331` | 1.0 | 3.0× |

- **Strength** scales glow for light colours and opacity for dark ones.
- **Hover** multiplies the same way, so hovered black gets blacker.
- **Tesla tails** additionally get 1.25× rest glow and 1.25× hover share.

### Hover and bloom

- **Hover picking:** an invisible mesh per tail built from its low-poly collision shell (12 × 8 corners), updated from the physics each frame. It's far cheaper than raycasting the rendered mesh. Hover amount eases in and out.
- **Bloom:** `UnrealBloomPass(strength 0.55, radius 0.5, threshold 0.9)`. The Fuji backdrop moved **into the scene** (`scene.background` with a CSS-`cover`-style crop) so bloom composites correctly; it was previously a CSS image behind a transparent canvas.

---

## 9. Trade-offs

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| Tail shape | One sculpted Meshy tail, bent | Procedural tubes | Tubes read as tentacles or leaves however they were tuned; silhouette detail comes from a sculpt |
| Tail detail | 4.3k tris | 21.9k | The hologram hides fur detail; fewer layers means less glow stacking and cheaper skinning |
| Skinning | CPU, precomputed | GPU vertex shader | Simpler to build and debug. **Cost: ~8 ms per frame measured with the 21.9k-tri tail** (not yet re-measured at 4.3k). GPU skinning is the planned fix |
| Collision | Core capsules + low-poly shells | Spheres only; mesh–mesh | Spheres were bigger than the pointed tip (pushed tails apart before they touched); mesh–mesh is expensive with no clean push direction; cores fix deep crossings |
| Shell resolution | 12 rings | 24 rings | 24 rings: settle never converged, 20 overlapping vertices up to 6.5 cm, physics 5.1 ms vs ~1.4 ms |
| Chain resolution | 22 points + Taubin smoothing | 44 points | 44: 1,413-pass settle (1.8 s), more overlap, several times the cost, and *more* pinching (tighter curls allowed) |
| Physics feel | Soft springs, heavy damping | Stiffer, livelier | The user asked for slow, heavy, ethereal motion |
| Multi-colour | Static coat markings | Flowing bands; reaction fronts | Bands weren't legibly multi-colour; animated "chemical reaction" fronts drew too much attention to the two oldest roles |
| Black | Dark-glass premultiplied blending | Additive with dark bands | Additive can't show black; the user wanted real black holograms |
| White | Strength 0.35 | A global brightness cap | The cap was opaque and also dimmed teal; per-colour strength is explicit |
| Texture fidelity | Custom optimise script | gltf-transform preset | The preset tears Meshy UVs |
| Environment (next) | Procedural stylised rock | AI-generated rock scan; patio/pier | Scanned rock decimates badly and looks AI-generated; the procedural rock needs no textures, a few thousand tris, and matches the faceted crystal look |

---

## 10. How we got here (discovery log)

1. **Experience concepts.** Three scroll-driven prototypes (growing branch, petal type, ema wall) were built and judged "mid": decorative wrappers around the same card with no signature moment. This led to concepts anchored in the user's own story; the **nine-tailed fox** won, because a kitsune earns tails with age, so one tail per role.
2. **Shader lab** (`/lab/shaders`). A/B comparison of anime shading styles on the rider model. It exposed baked scan lighting, and a **KHR_texture_transform bug** in our shaders (camo-patterned sweater).
3. **Concept art → model.** Prompts for ChatGPT concept art and Meshy references: back view, seated, cozy fit, then the Keria jacket.
4. **First tails.** Tube tails, then fur shells, logos on fox-fires (rejected as corny), then the per-company colours idea.
5. **"Poorly put together."** Honest reset: tails were built on world axes while the body was rotated 39°, and the anime shader was blotchy on noisy scan normals. Shaders were dropped to focus on **shape and placement first**; the body frame was then measured from the mesh.
6. **Shape.** Resting fan (a cushion), then a raised fan (a peacock or leaves), then a sculpted tail (finally fox-like; initially mounted backwards), then 6 tails with 3D S-curves, then doubled size, a long stalk, pointy tips and combed spreads.
7. **Texture quality.** "The downscaled model's textures look dogshit" led to the controlled comparison in §3.1 and `optimize-scan.mjs`.
8. **Physics.** Spheres, then a low-poly mesh collider at the user's request; it moved "unnaturally", which turned out to be oversized tip spheres. Then the spazzing: collision velocity kicks, an unconverged settle, and deep crossings fooling the shells, fixed with soft contacts, a converging settle and core capsules. Then pinching, fixed with curvature compression, the bend constraint and smoothing. Two resolution experiments (24 rings, 44 points) both made things worse and were reverted.
9. **Hologram.** First pass blew out to white (fur layers × additive × both faces × bloom), then per-layer gain, front faces only and softer bloom; the tail was then decimated 5×. A full-screen flash turned out to be NaN smeared by the bloom and was guarded. Colours went from Tesla red, to per-company palettes, to bands, to reaction fronts, to static coat markings. Black holograms came from premultiplied blending. A temporary slider panel settled per-colour strength and hover, which were then baked in.
10. **Environment.** Concept art A (patio/pier) vs B (mountain rock). B has more impact; the user worried about performance and the AI look of rock scans. The resolution is a **procedural stylised rock**: faceted, coloured by slope, no textures.

### Methodology notes

- **The preview pane throttles `requestAnimationFrame` during script evaluation, and screenshots lag.** Visual checks used long waits and re-shots; physics was measured by stepping a **fresh physics instance headlessly** (`window.__kitsune.freshPhysics()` in `?debug`).
- Metrics used throughout: tip speed and acceleration spikes (jolts), settle passes and depth, rendered vertices inside another tail's shell, folded triangles vs a straight-tail baseline, and ms per frame for physics and skinning.
- React StrictMode mounts effects twice in development; a disposed instance's loader once hijacked the debug hook. Loads now bail if the scene was torn down.

---

## 11. Open items / next steps

1. **Environment:** procedural stylised rock outcrop (faceted, slope-coloured grass/rock, blossom and grass cards, soft contact shadow), replacing the grey cliff; framing for the right-hand column.
2. **GPU skinning:** upload 22 chain points per tail and bend in the vertex shader, taking CPU skinning to ~0.
3. **Re-measure skinning** with the 4.3k-tri tail.
4. **Roles:** add Mundane.co and Tesla Autopilot to `experience.js` (dates, headline, location, images); their palettes currently live in `KitsuneScene.jsx`.
5. **Page integration:** the Experience section on `/self`, with the scene on the right and content on the left, reacting to the hovered or active tail.
6. **Mobile:** tail count, bloom and physics budgets, and touch in place of hover.
7. **Clean-up:** the older concept prototypes (`/lab/experience`, `/lab/shaders`) are uncommitted; delete or keep as reference.
