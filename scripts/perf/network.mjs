// Slow connections: the first load's verdict, the download carrying on behind 3D off, and switching
// 3D on afterwards.
//
//   node scripts/perf/network.mjs [--mbps 1.5,4,8] [--path /self]
//
// For each speed (DevTools network throttling, 40 ms latency), from a fresh browser:
// - when the loading screen lifts, and into 3D on or 3D off (SceneBackground.jsx decides from the
//   download speed over its second second, with a 10 s cap from page start);
// - the 3D switch's states over time: its percentage while downloading behind 3D off, then back as
//   a switch with "the live scene is ready";
// - after that, the connection set fast again and 3D switched on: how long the rebuild takes behind
//   the loading screen, and how many model files were fetched again (should be 0: they're kept in
//   memory).
//
// Test a production build (npm run build && npm run preview, then SITE=http://localhost:4173):
// the dev server sends hundreds of unbundled, uncompressed modules, which on a slow line takes far
// longer than the real site and skews the verdict. Even `vite preview` doesn't compress, so
// production is a little faster still.
import { SITE, launch, openPage, options, waitForLoader } from './lib.mjs';

const { mbps = '1.5,4,8', path = '/self', device = 'desktop' } = options();

const browser = await launch();
for (const speed of String(mbps).split(',').map(Number)) {
  const { context, page, errors } = await openPage(browser, { device });
  await page.addInitScript(() => {
    localStorage.removeItem('scene-low-performance');
    window.__switch = [];
    const tick = () => {
      const state = [
        document.querySelector('.scene-download-percent')?.textContent ?? '',
        [...document.querySelectorAll('[aria-label="3D background"]')].find((b) => b.offsetParent)?.textContent ?? '',
        document.querySelector('.scene-performance-notice.is-visible .scene-performance-notice-title')?.textContent ?? '',
      ].join(' | ');
      if (window.__switch.at(-1)?.[1] !== state) window.__switch.push([Math.round(performance.now()), state]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const models = [];
  page.on('request', (request) => { if (/\.(glb|hdr)$/.test(request.url())) models.push(request.url()); });
  const network = await context.newCDPSession(page);
  await network.send('Network.enable');
  await network.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (speed * 1e6) / 8, uploadThroughput: 2e6 / 8 });
  await page.goto(`${SITE}${path}`, { waitUntil: 'commit' });
  const lifted = await waitForLoader(page, 90000);
  const threeD = await page.evaluate(() => [...document.querySelectorAll('[aria-label="3D background"]')].find((b) => b.offsetParent)?.getAttribute('aria-checked'));
  console.log(`${speed} Mbit/s: loading screen lifted at ${lifted} ms into ${threeD === 'true' ? '3D on' : '3D off'}`);
  if (threeD !== 'true') {
    // The download behind 3D off, then the switch back: switch 3D on at full speed.
    await page.waitForFunction(() => !document.querySelector('.scene-download-percent'), null, { timeout: 180000 });
    await network.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const fetchedBefore = models.length;
    await page.evaluate(() => performance.clearMarks('loader-hidden'));
    const clicked = Date.now();
    await page.locator('[aria-label="3D background"]:visible').first().click();
    await waitForLoader(page);
    console.log(`  then 3D on: built in ${Date.now() - clicked} ms, model files fetched again: ${models.length - fetchedBefore}`);
  }
  // Where the switch or the notice changes, and the percentage's first and last reading in between.
  const states = await page.evaluate(() => window.__switch);
  const settled = (state) => state.split(' | ').slice(1).join(' | ');
  const shown = states.filter(([, state], index) => index === 0 || index === states.length - 1
    || settled(state) !== settled(states[index - 1][1]) || settled(state) !== settled(states[index + 1][1]));
  console.log(`  the 3D switch (percent | switch | notice) over time:`);
  shown.forEach(([at, state]) => console.log(`    ${String(at).padStart(6)} ms  ${state}`));
  console.log(errors.length ? `  errors:\n    ${errors.join('\n    ')}` : '  errors: none');
  await context.close();
}
await browser.close();
