// Where a first visit's loading time goes, on the live site (or any SITE), from a brand-new Chrome
// profile: no cache, no saved shaders.
//
//   node scripts/perf/fresh-load.mjs [--path /self] [--runs 3]
//   SITE=https://tzhu.dev node scripts/perf/fresh-load.mjs
//
// Loads /lab/performance<path>, which switches the site's own load timings on in production and
// then shows <path>. Prints, per run: connecting (DNS, TCP, TLS), first byte and HTML; every code,
// image and model file with when it started and finished and its size; the site's own milestones
// (3D: renderer made, store compiled, kitsune built and compiled, warmed up); and the freezes
// behind the loading screen.
import { SITE, launch, openPage, options, waitForLoader } from './lib.mjs';

const { path = '/self', runs = 1, device = 'desktop' } = options();
for (let run = 1; run <= Number(runs); run += 1) {
  // A new browser each run: a fresh profile, so nothing is cached.
  const browser = await launch();
  const { page, errors } = await openPage(browser, { device });
  await page.goto(`${SITE}/lab/performance${path}`, { waitUntil: 'commit', timeout: 120000 });
  const lifted = await waitForLoader(page, 120000);
  await page.waitForTimeout(500);
  const report = await page.evaluate((lifted) => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const files = performance.getEntriesByType('resource')
      .filter((entry) => /\.(js|css|woff2?|webp|jpe?g|png|glb|hdr|mp3)(\?|$)/.test(entry.name))
      .map((entry) => ({
        name: entry.name.replace(location.origin, '').split('?')[0].split('/').pop().replace(/-[a-f0-9]{8}\./, '.'),
        start: Math.round(entry.startTime),
        end: Math.round(entry.responseEnd),
        kb: Math.round((entry.transferSize || entry.encodedBodySize) / 1024),
      }))
      .sort((a, b) => a.start - b.start);
    return {
      connect: Math.round(navigation.connectEnd - navigation.startTime),
      firstByte: Math.round(navigation.responseStart - navigation.startTime),
      html: Math.round(navigation.responseEnd - navigation.startTime),
      files,
      milestones: (window.__perfReport?.().loads ?? []).map((load) => `${(load.at / 1000).toFixed(2)} s  ${load.name}`),
      freezes: window.__perf.freezes.filter((freeze) => freeze.at < lifted).map((freeze) => `${(freeze.at / 1000).toFixed(2)} s  ${Math.round(freeze.ms)} ms  ${freeze.script}`),
    };
  }, lifted);
  console.log(`run ${run}: ${SITE}${path}, loading screen lifted at ${lifted} ms`);
  console.log(`  connecting ${report.connect} ms, first byte ${report.firstByte} ms, HTML ${report.html} ms`);
  console.log('  files (start-end, size):');
  report.files.forEach((file) => console.log(`    ${String(file.start).padStart(5)}-${String(file.end).padEnd(5)} ms  ${String(file.kb).padStart(5)} KB  ${file.name}`));
  console.log('  milestones:');
  report.milestones.forEach((line) => console.log(`    ${line}`));
  console.log(`  freezes behind the loading screen:${report.freezes.length ? '' : ' none'}`);
  report.freezes.forEach((line) => console.log(`    ${line}`));
  if (errors.length) console.log(`  errors:\n    ${errors.join('\n    ')}`);
  await browser.close();
}
