# Performance pass, October 2026

What changed to make the site faster without changing how it looks, how each change was checked, and what it bought, measured against the site as it was before (`dcaba15`). It follows on from [optimization-techniques.md](optimization-techniques.md); the kitsune scene itself is described in [kitsune-writeup.md](kitsune-writeup.md).

The rule throughout: **no visible change**. Every change below was checked to be identical (bit for bit where the maths allows, pixel by pixel where it doesn't) before it shipped.

---

## Results

Production builds of both versions, side by side on an Apple M4 (Chrome, 1440×900 window at 2× density), the tests alternating between the two versions so the machine's drift hits both equally. Three rounds each for frame rates, two for freezes.

### Frame rate

| Test | Before | After |
|---|---|---|
| Quests page, frame rate unlimited (how much work a frame is) | 101 fps (9.8 ms median) | **111 fps** (8.8 ms median) |
| Home page, frame rate unlimited | 166 fps | 172 fps (within noise) |
| Quests page, CPU slowed 4× (a weak laptop or phone) | 47 fps, p95 frame **34 ms** (visible stutter) | **60 fps** (the cap), p95 **17.5 ms** |

### Main-thread time per frame (the thread scrolling and clicks share)

| Test | Before | After |
|---|---|---|
| Kitsune tail physics, quests page | 2.8–7.9 ms | **0.1 ms** |
| The whole 3D scene's main-thread work, CPU slowed 4× | 19.7 ms | **2.6 ms** |

On a fast Mac the quests page was mostly held back by the GPU, so the frame-rate gain there is modest. On a slower CPU the old site couldn't keep up at all (every other frame missed) and now holds 60 fps with room to spare.

### Freezes while loading (frames over 50 ms, first 15 s)

| Page | Before (two loads) | After (two loads) |
|---|---|---|
| Home, worst freeze | 664 ms, 196 ms | **167 ms, 107 ms** |
| Home, total frozen | 1,754 ms, 552 ms | 728 ms, 550 ms |
| Quests, worst freeze | 195 ms, 202 ms | **107 ms, 169 ms** |
| Quests, total frozen | 643 ms, 863 ms | 523 ms, 615 ms |

Freezes vary a lot between loads (network, caches), so read these as direction rather than exact gains. The clearest change is the home page's worst freeze: the kitsune loading in the background used to stall it for 200–660 ms.

### First-load JavaScript

| | Before | After |
|---|---|---|
| Main bundle | 445 KB (148 KB gzipped) | **402 KB (136 KB gzipped)** |

---

## The changes

### 1. The glass under the navbar: a thin cover instead of a full copy of the scene

**Files:** `src/components/sceneMirror.jsx`, `src/App.jsx`, `src/App.css` (`.nav-fade-cover`)

The page fades out under the navbar. That fade was a CSS mask on the whole scrolling page, and a mask cuts everything inside it off from what's behind, so the glass cards had nothing to blur. The fix had been to copy the entire 3D canvas into the page every frame, behind the cards: a full-screen copy, plus a second set of the backdrop's layers to composite.

Now the page has no mask. Instead, a strip of the backdrop 62 px tall (70 px on phones) is laid over the top of the page, faded in exactly where the mask used to fade the page out. Mathematically that's the same picture: the page fading out over the scene equals the scene fading in over the page. The glass now blurs the real backdrop, and only the strip is copied each frame, about 7% of the screen.

- **Checked:** screenshots with 3D off, old against new: the top 70 rows identical to the pixel. With 3D on, no seam where the strip meets the live scene.
- **Not changed:** the phone quests page keeps its own masked area and full copy (its bottom fade covers most of the screen, so a strip wouldn't save anything), as do pages without the 3D scene.

### 2. No copy while the cover is invisible

**File:** `src/components/sceneMirror.jsx`

Copying any part of the 3D canvas makes the browser take a snapshot of all of it (about 1 ms a frame). The strip is only visible while the navbar fade is on, so the copy now stops when it isn't, for example on the landing view and while the lore is open, and resumes the frame it's needed.

### 3. Tail physics 2.4× faster, same motion to the last bit

**File:** `src/components/experience/kitsunePhysics.js`

The tail solver tests every pair of tail segments for contact, four times per physics step, two to four steps per frame: about 6,600 pair tests per pass. Three kinds of waste:

- **Garbage:** every test made a new array (`[s, t]`), every inner loop a new closure, every contact a few small arrays. Now results go into reused storage.
- **No quick reject for the cores:** each segment pair ran the exact closest-points test. Now each segment keeps a bounding sphere (its middle, half its length plus its core's radius), and pairs whose spheres don't meet are skipped. Those pairs could never have touched, so the results are unchanged. The spheres are kept current as contacts move points mid-pass (`moved`). That rule is written in the code, because breaking it would lose contacts silently.
- **The same normals worked out again and again:** each test point rebuilt the eight face normals of the segment it was tested against. The shells don't move during a pass, so each segment's normals are now worked out once per pass.

**Checked:** old and new physics run side by side on the same 600 frames of scripted wind: largest difference in any tail point **0**, all 2,478 chime impacts identical. **2.45 → 1.04 ms** per frame, and the settle at load runs about twice as fast.

### 4. The physics on its own thread

**Files:** `src/components/experience/kitsuneCompute.js`, `kitsuneCompute.worker.js`

The physics now runs in a web worker. The page sends each frame's time and the new wind gusts, and the worker answers with the tails' positions, their collision shells and the chime impacts. Its buffers are handed back each frame, so nothing is allocated. On the page, a stand-in with the physics' own interface keeps the chimes, hover picking and debug tools working unchanged. The tails are drawn one frame (about 16 ms) behind the physics.

- **Checked:** in lockstep against the physics on the page: identical positions, meshes and chime impacts.
- **Fallback:** if the worker can't start, the physics runs on the page as before.

### 5. The tails posed on the GPU

**Files:** `src/components/experience/kitsuneTails.js` (`frameNodes`), `kitsuneHologram.js` (the tails' vertex shader)

Every frame the CPU bent each tail's mesh along its chain: about 13,000 vertices, then 310 KB uploaded to the GPU. Now the worker sends just each tail's 22 chain frames (point, curvature, tangent, side, up and bend direction, 352 numbers a tail). The tails' vertex shader places every vertex from them with the same maths: Catmull-Rom between chain points, the frame between them, and offsets eased toward a bend's centre.

**Checked:** one frozen instant rendered both ways. 19 of about 380,000 tail pixels differ, all on silhouette edges, where 32-bit GPU rounding moves an edge by a fraction of a pixel. The shader is now the only copy of this maths.

### 6. The kitsune loads without the big freeze

**Files:** `src/components/CherryBlossomScene.jsx` (`uploadGradually`), `kitsuneHologram.js` (`compile`)

On the home page the kitsune loads in the background, and that froze the page for about 280 ms at once. Two causes:

- **Glow shaders:** its glow's shaders (the bloom passes) compiled synchronously on its first draw. They now compile ahead, with the scene's (in parallel, off the page's thread where the browser can).
- **Textures:** all of its textures went to the GPU in one frame. They now go one per frame.

### 7. Lighter framer-motion

**Files:** `src/App.jsx`, the faders (here and in `jias-react-components`)

- **A stray import:** the Spotify widget had `import { i } from "framer-motion/client"`, unused, almost certainly an editor auto-import. It pulled in framer's entire component catalogue.
- **Lite components:** the faders now use framer's lightweight `m` components, imported as `motion`, under `LazyMotion` with only the animation features they use (`domAnimation`).
- **Strict mode:** `strict` makes a full `motion` component throw, rather than quietly bringing everything back. Layout animations or drag would need `domMax` added first.

---

## Measured and not done

| Idea | Why not |
|---|---|
| Merge the Lawson store's meshes | It's already one mesh per material (32 and 32); merging further needs texture atlasing, which changes the look |
| Halve the cliff's 4096² texture | Rendering with the GPU forbidden from its top level changed 3,889 pixels (up to 29/255) on a 1440 screen and 31,522 (up to 63/255) on a 2560 one: anisotropic filtering uses the full detail on the steep faces |
| Compressed GPU textures (KTX2) | The near-lossless kind would turn the cliff's 394 KB WebP into an estimated 4–8 MB download; the small kind visibly loses quality |
| Turn off three.js shader error checks | Made no difference to the freeze; reverted |
| Draw the whole 3D scene on a worker (OffscreenCanvas) | After the changes above, the scene's own main-thread work is about 1–2 ms a frame, and the remaining lag is GPU-bound, which a worker doesn't help. It would remove two one-time load freezes (about 100 ms building the kitsune, about 115 ms uploading the cliff texture) for a large, risky rewrite of the scene. Shelved |

---

## How things were measured

- **Cost by switching off:** each part can be turned off from the address (`?off=glass,petals,kitsune,store,mask`) or the frame meter's panel. The change in total frame time is a part's real cost.
- **Frame rate unlimited:** Chrome with `--disable-gpu-vsync --disable-frame-rate-limit` draws as fast as it can, so frame time shows how much work a frame is. It looks juddery to watch; that's the test, not the site.
- **Weak CPU:** Chrome DevTools' CPU throttling (4×), in place of a slow device.
- **Freezes:** Long Animation Frames (`PerformanceObserver`, frames over 50 ms, with the scripts behind them), from `window.__perfReport()`.
- **Identical results:** old and new physics in lockstep on scripted wind; frozen frames rendered both ways and diffed with `readRenderTargetPixels`; screenshots diffed row by row.

### Pitfalls

- **The meter's per-stage GPU column is unreliable on a Mac.** Apple GPUs run work in batches when something forces it, so each stage's timer picks up queued work from earlier stages. That's why "falling petals" showed 8 ms while switching the petals off changed nothing. The stages can add up to more than the whole frame. Use switching off, not that column, to cost a part.
- **Covered windows:** a covered or background window is capped and throttled. Benchmark windows have to stay visible.
- **Machine drift:** heat and other apps move results by 10–40% over minutes. Alternate old and new, and repeat.
- **The browser pane:** the site open in the desktop app's browser pane competes for the same GPU.
