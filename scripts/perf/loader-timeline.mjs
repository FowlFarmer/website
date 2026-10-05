// The loading screen, frame by frame: what's on top at the centre of the screen from the first
// frame, with the percentage and the stage under it, until the page shows.
//
//   node scripts/perf/loader-timeline.mjs [--path /quests] [--device phone] [--3d off]
//
// Good: the first row is `loader` (nothing paints before it), the percentage only climbs, it
// reaches 100% as the loader lifts, and no errors. Run it with a cold cache (it always opens a
// fresh browser) to see every stage.
import { SITE, launch, openPage, options, waitForLoader } from './lib.mjs';

const { path = '/self', device = 'desktop', '3d': threeD = 'on' } = options();
const browser = await launch();
const { page, errors } = await openPage(browser, { device, threeD: threeD !== 'off' });
await page.addInitScript(() => {
  window.__timeline = [];
  const tick = () => {
    const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const on = element ? (element.closest('#boot-loader') ? 'loader' : element.tagName.toLowerCase()) : 'nothing';
    const text = `${document.querySelector('.boot-percent')?.textContent ?? ''} ${document.querySelector('.boot-stage')?.textContent ?? ''}`;
    const last = window.__timeline.at(-1);
    if (!last || last[1] !== on || last[2] !== text) window.__timeline.push([Math.round(performance.now()), on, text]);
    requestAnimationFrame(tick);
  };
  document.addEventListener('readystatechange', () => { if (!window.__ticking) { window.__ticking = true; tick(); } });
});
await page.goto(`${SITE}${path}`);
const lifted = await waitForLoader(page);
await page.waitForTimeout(800);
const timeline = await page.evaluate(() => window.__timeline);
console.log(`${path} on ${device}, 3D ${threeD}: loading screen lifted at ${lifted} ms`);
timeline.forEach(([at, on, text]) => console.log(`  ${String(at).padStart(6)} ms  ${on.padEnd(8)} ${text}`));
console.log(errors.length ? `errors:\n  ${errors.join('\n  ')}` : 'errors: none');
await browser.close();
