// Switching 3D off and back on: off needs no loading screen; on brings it back at once and rebuilds
// the scene behind it from the files already in memory (sceneFiles.js), fetching nothing again.
//
//   node scripts/perf/toggle-3d.mjs [--path /self] [--device desktop]
//
// Prints whether the loading screen showed for each switch, how long 3D on took to rebuild, and any
// model or image files fetched again (should be none).
import { SITE, launch, openPage, options, waitForLoader } from './lib.mjs';

const { path = '/self', device = 'desktop' } = options();
const browser = await launch();
const { page, errors } = await openPage(browser, { device });
const fetched = [];
page.on('request', (request) => { if (/\.(glb|hdr|jpg|webp)$/.test(request.url())) fetched.push(request.url().split('/').pop()); });
const loaderUp = () => page.evaluate(() => {
  const loader = document.getElementById('boot-loader');
  return Boolean(loader) && !loader.hidden && !loader.classList.contains('is-ready');
});
const toggle = () => page.locator('[aria-label="3D background"]:visible').first().click();

await page.goto(`${SITE}${path}`);
await waitForLoader(page);
await page.waitForTimeout(1500);
const before = fetched.length;
await toggle();
await page.waitForTimeout(1500);
const offShowedLoader = await loaderUp();
await page.evaluate(() => performance.clearMarks('loader-hidden'));
const clicked = Date.now();
await toggle();
const onShowedLoader = await loaderUp();
await waitForLoader(page);
console.log(`3D off: loading screen ${offShowedLoader ? 'showed (unexpected)' : 'not needed'}`);
console.log(`3D on: loading screen ${onShowedLoader ? 'showed at once' : 'did NOT show'}, rebuilt in ${Date.now() - clicked} ms`);
console.log(`files fetched again: ${fetched.slice(before).join(', ') || 'none'}`);
console.log(errors.length ? `errors:\n  ${errors.join('\n  ')}` : 'errors: none');
await browser.close();
