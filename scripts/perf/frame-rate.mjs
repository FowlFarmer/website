// How much work a frame is: the page's frame rate and frame times, sampled for 6 s once the scene
// has loaded and settled, in one of two modes.
//
//   node scripts/perf/frame-rate.mjs [--path /quests] [--mode uncapped|throttle] [--off kitsune] [--runs 3]
//
// --mode uncapped: Chrome's vsync and frame limit off and the site's own cap off, so frames run as
//   fast as the machine allows; frame time is the cost of a frame. (It looks juddery to watch;
//   that's the mode, not the site.)
// --mode throttle: the CPU slowed 4× (DevTools throttling), in place of a weak laptop or phone, at
//   the site's own frame cap. 60 fps with a steady p95 is the bar.
// --off part[,part]: switch parts of the scene off (glass, petals, kitsune, store, mask) to see what
//   each costs: the difference in frame time is its real cost. (On a Mac the frame meter's per-part
//   GPU column is unreliable; Apple GPUs run queued work late, so it lands in later parts' timers.)
//
// Prints fps, median and p95 frame time per run, and, where the site's frame meter is on (the dev
// server, preview builds, or /lab/performance/... in production), its main-thread time for the
// whole scene and for the kitsune's tails. Alternate runs of two versions you're comparing: this
// Mac drifts 10-40% over minutes with heat and other apps.
import { SITE, launch, openPage, options, percentile, round, waitForLoader } from './lib.mjs';

const { path = '/quests', mode = 'uncapped', off, runs = 1, device = 'desktop' } = options();
const query = off ? `?off=${off}` : '';

const browser = await launch({ args: mode === 'uncapped' ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [] });
for (let run = 1; run <= Number(runs); run += 1) {
  const { context, page, errors } = await openPage(browser, { device });
  if (mode === 'uncapped') await page.addInitScript(() => { localStorage.setItem('render-tuning', JSON.stringify({ frameCap: 0 })); });
  if (mode === 'throttle') await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${SITE}${path}${query}`);
  await waitForLoader(page);
  // Settle: a short scroll (the page's own scroller), then let everything warm.
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const scroller = document.querySelector('.page-scroller');
    scroller?.scrollTo({ top: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    scroller?.scrollTo({ top: 900 });
  });
  await page.waitForTimeout(4000);
  const from = await page.evaluate(() => performance.now());
  await page.waitForTimeout(6000);
  const result = await page.evaluate((from) => {
    const frames = window.__perf.frames.filter((time) => time >= from);
    const gaps = frames.slice(1).map((time, index) => time - frames[index]).sort((a, b) => a - b);
    const parts = Object.fromEntries((window.__perfReport?.().frame ?? []).map(({ name, cpu }) => [name, cpu]));
    return { fps: gaps.length / ((frames.at(-1) - frames[0]) / 1000), gaps, sceneCpu: parts['scene (all)'], tailsCpu: parts['kitsune: tails physics'] };
  }, from);
  const line = [
    `run ${run}: ${round(result.fps)} fps`,
    `median ${round(percentile(result.gaps, 0.5), 2)} ms`,
    `p95 ${round(percentile(result.gaps, 0.95), 2)} ms`,
    result.sceneCpu != null ? `scene main thread ${round(result.sceneCpu, 2)} ms` : null,
    result.tailsCpu != null ? `tails ${round(result.tailsCpu, 2)} ms` : null,
  ].filter(Boolean).join(' · ');
  console.log(`${path}${query} ${mode} — ${line}`);
  if (errors.length) console.log(`  errors:\n    ${errors.join('\n    ')}`);
  await context.close();
}
await browser.close();
