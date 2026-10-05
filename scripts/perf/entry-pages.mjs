// Arriving anywhere: every entry page, on desktop and phone, with 3D on and off. For each, from a
// fresh browser: the first thing painted at the centre of the screen, when the loading screen
// lifts, where the address ends up (redirects, /Quests/ tidied to /quests), the page's first words
// once it's up, and any errors.
//
//   node scripts/perf/entry-pages.mjs [--paths /self,/quests] [--devices desktop] [--modes on,off]
//
// Good: every row `first: loader`, the loader lifts (on pages with their own lazy code, onto that
// page's content, never an empty frame), the right page, no errors.
import { SITE, launch, openPage, options, waitForLoader } from './lib.mjs';

const ALL_PATHS = ['/', '/self', '/quests', '/contact', '/gallery', '/avalon', '/analytics', '/lab/kitsune', '/lab/experience', '/nonexistent', '/Quests/'];
const {
  paths = ALL_PATHS.join(','), devices = 'desktop,phone', modes = 'on,off',
} = options();

const browser = await launch();
let failures = 0;
for (const device of devices.split(',')) {
  for (const mode of modes.split(',')) {
    console.log(`== ${device}, 3D ${mode}`);
    for (const path of paths.split(',')) {
      const { context, page, errors } = await openPage(browser, { device, threeD: mode !== 'off' });
      await page.addInitScript(() => {
        const tick = () => {
          if (!window.__first && document.body) {
            const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
            window.__first = element ? (element.closest('#boot-loader') ? 'loader' : element.tagName.toLowerCase()) : 'nothing';
          }
          if (!window.__first) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goto(`${SITE}${path}`);
      let lifted = 'never';
      try { lifted = `${await waitForLoader(page, 20000)} ms`; } catch { /* Reported below. */ }
      await page.waitForTimeout(600);
      const seen = await page.evaluate(() => ({
        first: window.__first,
        at: location.pathname,
        words: (document.querySelector('main')?.innerText || document.body.innerText).trim().replace(/\s+/g, ' ').slice(0, 32),
      }));
      const ok = seen.first === 'loader' && lifted !== 'never' && !errors.length;
      if (!ok) failures += 1;
      console.log(`${ok ? '  ok  ' : '  FAIL'} ${path.padEnd(16)} first: ${seen.first}, lifted: ${lifted} → ${seen.at} [${seen.words}]${errors.length ? `\n         ${errors.join('\n         ')}` : ''}`);
      await context.close();
    }
  }
}
console.log(failures ? `${failures} failed` : 'all passed');
await browser.close();
process.exitCode = failures ? 1 : 0;
