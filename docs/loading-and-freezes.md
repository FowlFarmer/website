# Loading and freezes: engineering notes, October 2026

How the site went from "loads, then stutters" to "loading screen, then nothing stutters": the principles, the architecture, every interactive test run and its data, the mistakes made along the way, and why each decision went the way it did. It follows the frame-rate work in [performance-pass-2026-10.md](performance-pass-2026-10.md).

---

## 1. The principles

These come from the site's owner, and everything below is shaped by them.

1. **No freezes after the loading screen, in any interaction, ever.** First impressions are what visitors remember. A stall in the first seconds reads as "janky site", however smooth it is a minute later. A longer load is the better trade.
2. **The first thing anyone sees is the loading screen.** No flash of the scene, the page or a blue placeholder before it.
3. **Nothing on the loading screen may lag.** It's itself a first impression.
4. **A slow connection still gets a good site.** If 3D won't arrive soon, show 3D off rather than an endless loading screen, and let 3D finish in the background.

"Freeze" started out meaning a frame over 50 ms, the browser's Long Animation Frame threshold. That was challenged: a 50 ms frame is about three missed frames at 60 fps, and that's visible. The bar became **every frame**: any gap over 25 ms counts, meaning even a single dropped frame at 60 fps. The longest frame is reported.

---

## 2. Where we started

A scripted interaction run on the site before this work (production build), with each freeze tagged by the action it happened during:

| Action | Freezes (Long Animation Frames) |
|---|---|
| Load, idle | 67, 54, 67, 86, **185 ms** (three.js shader compile `ve` 178 ms) |
| Scrolling home | 182 ms (browser, no script) |
| Click through to quests | **66 ms**, every run, both before and after the earlier performance pass |
| Scrolling quests | 151 ms |

Load timing from the owner's own visits: on a hotspot, a blue screen and the home card, then the loading screen for about 15 s, then the scene. On a fresh visit the scene sometimes flashed for a few frames before the loading screen came up.

### Why the switch to quests froze

A CPU profile of the click: about 55 ms in three.js's `getProgram` and `getProgramInfoLog`, which means a shader being compiled on first use. The kitsune's materials had been precompiled for drawing to the screen, but they're actually drawn into the glow's offscreen buffer, and that needs a different shader variant. Anything like that (a shader variant, a texture upload, a buffer allocation) that's left for the first switch turns into a freeze.

---

## 3. The architecture

### 3.1 The loading screen lives in `index.html`

**Files:** `index.html` (`#boot-loader`, inline styles), `src/bootLoader.js`

- **First paint:** the loading screen's markup and CSS are inline in the HTML, so it paints before any script loads. The old loader was a React component inside the 3D scene's lazy chunk. By the time it mounted, the browser had already painted the page underneath, which was the flash.
- **Holds:** `bootLoader.js` keeps it up while anything holds it, by name: `holdLoader(name, weight)` and `releaseLoader(name)`. It fades out once nothing does.
  - `app`: the first React render
  - `quests code`: the quests page's chunk
  - `page code`: any lazy page's chunk, via `PageLoading`, the Suspense fallback
  - `scene`: the 3D scene fully ready, or with 3D off the still backdrop (and the 2D kitsune's stills when 3D is off from the start)
- **Coming back:** `showLoader()` brings it back up instantly, at 0%, when 3D is switched on.
- **Safety net:** a 45 s timeout lets go of anything still holding, with a console warning.

### 3.2 A circle that can't lag

The circle that followed the pointer was moved by JavaScript, so it stuttered whenever the main thread was busy, which is exactly while loading. It's now a **CSS cursor image** (an inline SVG ring), drawn by the operating system, so it moves exactly with the mouse whatever the page is doing. The petals that orbited it now orbit the percentage, on CSS animations, which run on the compositor rather than the main thread.

The trade-off: it no longer trails behind the mouse with easing, and a cursor image can't animate.

### 3.3 The percentage and the stage

- **Percentage:** each part reports a fraction and a weight (`reportProgress`).
  - Downloads count real bytes as they arrive.
  - Setup steps (building, compiling, warm-up) are weighted by their measured time on the same scale.
  - The page's own parts are small fixed shares.
  - The 3D's share is reserved from the start. Without that, the count hit 100% at 0.3 s and sat there, because only the page's small parts were known yet. An early version also held the count at 99% until the end, which looked corny. Both are gone: it now reaches 100% as the work finishes.
- **Stage:** a word or two under the percentage for what's happening, updated instantly with no throttling, on purpose.
  - The steps: `starting`, `backdrop`, `3D code`, `page code`, `store shaders`, `kitsune build`, `tail physics`, `kitsune shaders`, `glow shaders`, `textures`, `glow`, then the warm-up frames.
  - During downloads it names the file with the most left to download. The first version let each download name itself as its bytes came in, and parallel downloads fought over the label.

### 3.4 Everything heavy happens behind it

**Files:** `src/components/CherryBlossomScene.jsx`

- **One load:** the store, rider, lighting and kitsune all load up front, whichever page you arrive on. Before, the kitsune loaded about 3 s after the home page appeared, which froze it for 200–660 ms. On /quests the store loaded later, which changed the lighting and recompiled shaders.
- **The kitsune compiles after the lighting,** since the lighting changes which shader variants the materials compile to.
- **Warm-up frames:** once everything is built, a few real frames are drawn behind the loader in every state the page will show. Whatever the precompile missed happens there, not on the first switch.
  - The store at full strength, with the kitsune at full strength through its glow
  - Both at 0.5: the store's fade layer and the glow mid-fade
  - The page's real state
- **The frame-rate watch** (the one that switches 3D off when frames are slow) starts only after the warm-up, since warm-up frames are slow on purpose.

### 3.5 Downloads apart from the scene

**Files:** `src/components/sceneFiles.js`, `src/components/experience/kitsuneFiles.js`

The 3D scene only exists while 3D is on, so the downloads had to live outside it in order to keep going behind 3D off.
- **Downloading:** `sceneFiles.js` fetches the scene's files with streaming byte counts and keeps them in memory.
- **Handing over:** the scene puts each file into three.js's cache under three's own keys (`file:<url>` for models and lighting, `image:<url>` for the backdrop photo). three.js's loaders then read from memory.
- **No re-downloads:** switching 3D off and on, or a rebuild across the phone/desktop breakpoint, rebuilds from memory. Tested: 0 files fetched again, rebuilt in 0.54–0.59 s.
- **Small main bundle:** the main bundle doesn't import three.js. `sceneFiles.js` keeps raw buffers, and only the scene (which loads three.js anyway) hands them over. The main bundle went from 402 to 409 KB.

### 3.6 Deciding whether to wait for 3D

**Files:** `src/components/SceneBackground.jsx`

A flat "6 s from page start" timer was the first version. It measured the wrong thing: about 1.3 s of a fresh load was just connecting to the server, and ~0.6 s was the page's code, neither of which says anything about whether 3D is affordable. It also decided too late for a hopeless connection, and too early for a nearly-finished one. The design now:

1. **Still first.** The still backdrop loads before anything 3D, so 3D off is always ready to settle for.
2. **Then the 3D downloads and code start,** the moment the still is in.
3. **Speed check after 2 s of downloading.** The speed is measured over the second half of that window, because in the first half the line is also carrying the 3D code. If the rest would arrive within the next 6 s, the loader waits for 3D. If not, it settles for 3D off at once.
4. **Hard cap: 10 s from page start.** Whatever happens, it's 3D off by then.
5. **Downloads continue behind 3D off.** The 3D button shows only the percentage (a progress bar for screen readers) and isn't clickable. When the files are in, the button comes back with "the live scene is ready". Switching on then just builds.
6. **Low-end devices** (2 GB of memory or less, or 2 CPU cores or fewer) start with 3D off and download nothing. The button still turns 3D on.
7. **Settling for 3D off isn't remembered.** The next visit tries again.
8. **Switching 3D on by hand has no time limit.** The visitor asked for it.
9. **Save-Data and 2G** were proposed as instant 3D off and dropped at the owner's call. They get the same speed check as everyone.

### 3.7 The 2D kitsune's stills

**Files:** `src/components/experience/kitsuneStills.js`

The quests page with 3D off shows pre-rendered stills of the kitsune (14 layers plus a hover map, 1.86 MB). They used to load on the first visit there and fade in. Now:
- **3D off from the start** (the saved choice or a low-end device): they load behind the loader on any page. Tested: all 16 files in before the loader lifts, on /self and /quests, with no 3D downloads.
- **After settling for 3D off:** they start at once, beside the rest of the 3D download.
- **When 3D loads fine:** they follow after the 3D files, so switching 3D off later is instant.

They aren't loaded first for everyone because that would delay 3D by about 2 s at 8 Mbit/s.

---

## 4. Interactive testing: methods

Everything ran in real Chrome through Playwright on an Apple M4, 1440×900 at 2× density (the 3D canvas at the site's 1.5× cap), against **production builds** served by `vite preview`, with each test opening a fresh browser.

| Test | What it does |
|---|---|
| **Scripted interaction** | Waits for the loader to lift, idles 5 s, then: hovers each calligraphy character until it blooms, wheel-scrolls home down 120 ticks and back up, clicks "look at my work", sweeps the mouse across the tails three times, wheel-scrolls quests down and up. Each action is a tagged phase. |
| **Every frame** | A `requestAnimationFrame` recorder from the first script, counting every gap after the loader lifts: frames over 25 ms and 33 ms, the longest, p99, and which phase each happened in. |
| **Long Animation Frames** | `PerformanceObserver` with the scripts behind each frame over 50 ms (the site's own `__perfReport`). Counted separately for before and after the loader lifts. |
| **CPU profiles** | Chrome DevTools Protocol sampling around one action (the click to quests). |
| **Loader timeline** | Every frame from the first, what's on top at the centre of the screen and the percentage and stage text, to prove the loader is the first paint. |
| **Connection speeds** | DevTools network throttling at 1.5, 4 and 8 Mbit/s: when the loader lifts, into 3D on or off, the 3D button's percentage, the notices, then switching 3D on and counting re-fetches. |
| **Fresh loads, live site** | `tzhu.dev/lab/performance/...` (stage timings on in production), a new Chrome profile per run (no cache, no saved shaders): navigation timing, every resource, the stage milestones. |
| **Every entry page** | 11 addresses × desktop and phone × 3D on and off: loader first, lifts, lands on the right page, no errors. |

---

## 5. Interactive testing: data

### 5.1 Freezes after the loader lifts

Production build, scripted interaction:

| | Before | After |
|---|---|---|
| Freezes over 50 ms after load | 4–8 per run, up to 185 ms | **0** (two runs) |
| The same, behind the loader | n/a | 6–8 (moved there on purpose) |
| Click through to quests | 66 ms freeze every time | nothing |

Every frame, after the loader, one run of 2,529 frames:

| Measure | Result |
|---|---|
| Longest frame | **34 ms** (one dropped frame) |
| Frames over 25 ms | 4: two while fast-scrolling home, two while fast-scrolling quests |
| Frames over 33 ms | 1 |
| p99 | 17.7 ms |
| Hovering, clicking through, sweeping the tails, idle after load | 0 |

The four single drops during fast wheel scrolling are open (section 8). One later run reported every frame at 33 ms. That wasn't the site: the laptop was on battery at 18%, and below 20% Chrome's Energy Saver caps every page at 30 fps. It needs rerunning plugged in.

### 5.2 The loader is the first paint

Every frame's centre element, from the first:

```
24 ms   loader  0% starting
195 ms  loader  0% backdrop
230 ms  loader  4% 3D code
588 ms  loader  27% rider
632 ms  loader  67% blossoms … kitsune
906 ms  loader  80% tail physics → glow shaders → textures
1227 ms loader  94% glow → first frame → fade frame → last frame
1313 ms loader  100% done
1330 ms page
```

### 5.3 A fresh load of the live site

New profile per run, nothing cached. Longest of five: **3.7 s** (/self 3.7, 3.5, 2.7; /quests 3.6, 2.9). The slowest one, before still-first and the separate downloads:

| When | What | Takes |
|---|---|---|
| 0 – 1.27 s | Connecting (DNS, TCP, TLS) | 1.27 s |
| 1.27 – 1.36 s | HTML; loader showing | 0.1 s |
| 1.37 – 1.58 s | Page code (138 KB), first render | 0.2 s |
| 1.59 – 1.99 s | Still backdrop (151 KB) | 0.4 s |
| 2.0 – 2.31 s | 3D code (three.js, 190 KB), WebGL starts | 0.3 s |
| 2.33 – 3.14 s | 3D downloads, ~4.2 MB in parallel | 0.8 s |
| 3.17 – 3.21 s | Store compiled | 0.04 s |
| 3.29 – 3.60 s | Kitsune built, physics worker, shaders | 0.3 s |
| 3.60 – 3.66 s | Warm-up; loader lifts | 0.06 s |

### 5.4 Connection speeds

Production build, throttled, final version:

| Speed | Loader lifts | Into | Then |
|---|---|---|---|
| Fast (local) | 1.05–1.17 s | 3D on | |
| 8 Mbit/s | 3.3 s | 3D off (the downloads ended at 11.2 s, past the 10 s cap) | percentage on the button, "ready" at 11.3 s, 3D on built in 0.8 s, 0 re-fetched |
| 4 Mbit/s | 4.6 s | 3D off | "ready" at 18.6 s, built in 0.9 s, 0 re-fetched |
| 1.5 Mbit/s | 7.8 s | 3D off | "ready" at 62 s, built in 1.2 s, 0 re-fetched |

Locally, the page's JavaScript is served uncompressed (three.js is 733 KB, against 190 KB brotli on Vercel), so production sits a little faster at every speed.

### 5.5 Every entry page

`/`, `/self`, `/quests`, `/contact`, `/gallery`, `/avalon`, `/analytics`, `/lab/kitsune`, `/lab/experience`, an unknown address and `/Quests/`, each on desktop and phone (390×844, touch), with 3D on and off: **44 of 44 passed**. In every case the loader was the first thing on screen, it lifted, it landed on the right page (the redirects included), and there were no errors.

Before the `page code` hold, pages without the scene and every 3D-off page lifted the loader at about 70 ms, before their own code had arrived, which showed an empty frame. After it, they lift at about 0.35 s with the content there.

### 5.6 Switching 3D

| Switch | Loader | Result |
|---|---|---|
| Off | none needed | instant |
| On | back at once, from 0% | rebuilt in 0.54–0.59 s from memory, 0 files re-fetched |

---

## 6. Mistakes, and what they taught

| Mistake | What happened | Fix |
|---|---|---|
| Benchmarks in zsh with `$test` | zsh doesn't split unquoted variables, so `node bench.mjs 4402 $test` opened the address `/quests uncapped`. That showed the quests page with no kitsune, and the first frame-rate numbers were junk (exactly 60 fps). | `${=test}`; reran everything |
| The owner used the machine during the freeze test | Their scrolling added freezes that depended on what they did when, so before and after weren't comparable | Scripted, identical interaction sequences |
| 50 ms as the freeze bar | That's 2–3 missed frames, which is visible | Count every frame over 25 ms; report the longest |
| Parallel still and 3D downloads | At 1.5 Mbit/s the still got a sliver of the line, and the loader waited for it until 27.7 s, though 3D off had been decided at 2.9 s | Still first, then 3D |
| `fetch(…, { priority: 'low' })` | Chrome holds low-priority requests back while others load, and the local server's 6-connection limit made it worse: 4% downloaded after 2 s at 8 Mbit/s | Removed; still-first already orders them |
| Speed over the whole first 2 s | The 3D code shares the line in the first second and makes the files look slow | Speed over the second half of the window |
| The 99% cap | Hid that the scene's share wasn't reserved, so it reached 100% at 0.3 s | Reserve the share; no cap |
| Each download naming the stage | Parallel files flickered over each other | Name the file with the most left |
| Reading the meter's per-stage GPU column on a Mac | "Falling petals 8 ms", but switching the petals off changed nothing | Cost a part by switching it off (performance-pass doc) |

---

## 7. Why, in short

| Decision | Alternative | Why |
|---|---|---|
| Loader in `index.html`, held by named holds | React loader, a fixed delay | The first paint has to be the loader. Holds let any part of the site say "not ready", including the ones that load later. |
| OS-drawn cursor ring | JS-animated circle | The main thread is busy exactly while loading. The OS cursor is the only thing guaranteed not to lag. |
| Everything up front, warm-up frames | Lazy, on demand | A longer load beats any later freeze (principle 1). Warm-up frames catch what precompiling misses. |
| Downloads outside the scene, kept in memory | The scene's own loaders | Lets them continue behind 3D off, and makes rebuilds instant. |
| Speed projection plus a cap | A flat timer | Fast verdicts for hopeless connections, patience for nearly-done ones, and the time spent connecting doesn't count. |
| Still first | Everything in parallel | 3D off must always be ready to fall back to. |
| Stills after the 3D (unless 3D is off) | Stills first | 3D users shouldn't wait about 2 s for pictures they'll likely never see. |
| No Save-Data special case | Skip 3D | The owner's call. |

---

## 8. Open

- **Single dropped frames during fast wheel scrolling** (4 in 2,529 frames). Most likely the GPU redrawing the glass blur under moving cards.
- **The stills are oversized:** each of the 14 layers is the full 2052×928 frame, mostly transparent. Cropping each tail's layers to that tail, with its position stored in `layout.json`, should shrink the 1.86 MB considerably with no visible change.
- **Not under the loader:** `/lab/kitsune` and Avalon load their own 3D after they appear.
- **Two more preloads would save time:** the physics worker's script is fetched only once the kitsune is built.
- **A frame-test rerun on mains power**, since the last run hit Chrome's battery 30 fps cap.
