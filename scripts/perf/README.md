# scripts/perf: loading and smoothness checks

Scripted checks that drive real Chrome through the site and measure what a visitor would feel: whether the loading screen is the first paint, whether anything stalls once it lifts, how much work each frame is, what slow connections get, and where a first visit's time goes. They back the promises in [docs/loading-and-freezes.md](../../docs/loading-and-freezes.md) and [docs/performance-pass-2026-10.md](../../docs/performance-pass-2026-10.md), which explain the methods and hold the numbers they produced.

They were first written as one-off scripts during that work and were rewritten here around a shared [lib.mjs](lib.mjs). **These versions haven't been run yet:** if one misbehaves, fix the script. The method behind each is documented in the docs above.

## Setup

- **Chrome:** the system Google Chrome, driven by `playwright-core` (a dev dependency; no browser download). Set `CHROME_PATH` to use another Chrome or Chromium.
- **A site to test:** the dev server by default (`npm run dev`, http://localhost:5173), or any URL via `SITE=...`. For anything about timing, prefer a production build:

  ```bash
  npm run build && npm run preview          # serves on http://localhost:4173
  SITE=http://localhost:4173 npm run perf:interactions
  ```

  The dev server sends hundreds of unbundled modules and runs React's development double-mounts, which inflates load times and skews slow-connection verdicts. Even `vite preview` doesn't compress the JavaScript, so the real site comes out slightly faster still.
- **Frame meter:** where it's on (the dev server, preview builds, or `/lab/performance/...` in production), some scripts also read its per-part timings (`window.__perfReport`). Everything else is recorded by the scripts themselves, so they work against production too.

## The checks

| Script | `npm run` | What it tells you | Good result |
|---|---|---|---|
| [loader-timeline.mjs](loader-timeline.mjs) | `perf:loader` | Frame by frame from the first paint: what's on top at the centre, plus the loading screen's percentage and stage | First row `loader`; the percentage only climbs and reaches 100% as it lifts |
| [interactions.mjs](interactions.mjs) | `perf:interactions` | The scripted visit (hover the name, scroll home, click through to quests, sweep the tails, scroll quests): every frame gap after the loading screen, and freezes, tagged by phase | No freeze over 50 ms after the loader; longest frame about 34 ms at worst |
| [frame-rate.mjs](frame-rate.mjs) | `perf:frame-rate` | Frame rate and frame times, with the frame limit off (`--mode uncapped`) or the CPU slowed 4× (`--mode throttle`); `--off kitsune` etc. to cost a part | Compare versions and parts; throttled should hold 60 fps |
| [network.mjs](network.mjs) | `perf:network` | At 1.5 / 4 / 8 Mbit/s: when the loader lifts and into 3D on or off, the 3D switch's percentage behind 3D off, then switching 3D on | Settles quickly on slow lines; 3D on rebuilds with 0 files fetched again |
| [entry-pages.mjs](entry-pages.mjs) | `perf:pages` | Every entry page × desktop and phone × 3D on and off: first paint, lift, landing page, errors | All `ok` (exits 1 otherwise) |
| [toggle-3d.mjs](toggle-3d.mjs) | `perf:toggle` | Switching 3D off then on: loader behaviour, rebuild time, files fetched again | Off: no loader; on: loader at once, nothing fetched again |
| [fresh-load.mjs](fresh-load.mjs) | `perf:fresh` | A first visit from a brand-new profile: connecting, every file's timing and size, the site's milestones, freezes behind the loader | For seeing where the time goes, e.g. `SITE=https://tzhu.dev` |

Pass options after `--` with npm: `npm run perf:frame-rate -- --path /self --mode throttle --runs 3`. Common ones: `--path`, `--device desktop|phone` (1440×900 at 2×, or 390×844 at 3× with touch), `--runs`.

## Reading the numbers honestly

- **Keep the test window visible and uncovered.** A covered or background window is throttled: frames cap at 30 or stop, and the loader waits, since the warm-up needs frames.
- **Mains power.** Below 20% battery, Chrome's Energy Saver caps every page at 30 fps, and every frame then reads 33 ms. That isn't the site.
- **Close other heavy tabs,** including the site open in the Claude app's browser pane: they compete for the same GPU.
- **This Mac drifts 10–40% over minutes** with heat and load. To compare two versions, serve both (a build of each, on different ports) and alternate runs between them, never all of A and then all of B. For an old version: `git worktree add /tmp/old <commit>`, `npm run build` there, then `vite preview --outDir ... --port 4401`.
- **Costing a part:** switch it off (`--off`) and compare total frame time. On Apple GPUs, the frame meter's per-part GPU column picks up earlier parts' queued work, so a part can show 8 ms when switching it off changes nothing.
- **Freezes over 50 ms** are what the browser's Long Animation Frame API can attribute to a script. Smaller hitches show only as frame gaps; `interactions.mjs` reports both.
- **zsh doesn't split unquoted variables.** In a loop, `node x.mjs $args` passes one argument; use `${=args}`. This once silently opened the address `/quests uncapped`.

## Checks not ported

These were one-offs that needed temporary hooks in the site's code. They're described in the docs, if you need to redo one:
- the tail physics compared step for step against its worker and optimised versions;
- GPU against CPU tail posing, compared frame by frame;
- the cliff texture's mip levels compared;
- the backdrop-cover maths compared before and after the scene file was split.
