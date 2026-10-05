// No freezes after the loading screen: the same scripted visit every time, every frame recorded,
// each slow one tagged by what was happening.
//
//   node scripts/perf/interactions.mjs [--runs 2] [--device desktop]
//
// The visit: wait for the loading screen to lift, idle 5 s, hover each character of the name until
// it blooms, wheel-scroll the home page down and back up, click "look at my work" through to the
// quests page, sweep the mouse across the kitsune's tails, wheel-scroll the quests page down and up.
//
// It prints, per run: frames recorded after the loading screen; p99 and the longest frame gap;
// frames over 25 ms (a dropped frame at 60 fps) and over 33 ms, by phase; and Long Animation
// Frames (over 50 ms, with the script behind each) behind and after the loading screen.
//
// Good: nothing over 50 ms after the loading screen (everything heavy happens behind it), the
// longest frame near 34 ms at worst. Keep the window uncovered and the machine on mains power:
// a covered window, or a Mac on battery below 20% (Chrome's Energy Saver), caps pages at 30 fps,
// and every frame then reads 33 ms.
import { SITE, frameGaps, launch, openPage, options, percentile, round, waitForLoader } from './lib.mjs';

const { runs = 1, device = 'desktop' } = options();

async function visit(browser) {
  const { context, page, errors } = await openPage(browser, { device });
  const phases = [];
  const phase = async (name) => phases.push([name, await page.evaluate(() => performance.now())]);
  const wheel = async (dy, ticks) => {
    for (let tick = 0; tick < ticks; tick += 1) {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(16);
    }
  };
  await page.goto(`${SITE}/self`);
  await waitForLoader(page);
  await phase('after loader');
  await page.waitForTimeout(5000);
  await phase('hover name');
  const glyphs = await page.evaluate(() => [...document.querySelectorAll('[data-mode]')].map((element) => {
    const box = element.getBoundingClientRect();
    return [box.x + box.width / 2, box.y + box.height / 2];
  }));
  for (const [x, y] of glyphs) {
    await page.mouse.move(x, y, { steps: 8 });
    await page.waitForTimeout(700);
  }
  await page.mouse.move(720, 600, { steps: 8 });
  await page.waitForTimeout(1500);
  await phase('scroll home down');
  await wheel(100, 120);
  await page.waitForTimeout(1000);
  await phase('scroll home up');
  await wheel(-100, 120);
  await page.waitForTimeout(1500);
  await phase('click to quests');
  await page.click('text=Feel free to look at my work');
  await page.waitForTimeout(5000);
  await phase('sweep tails');
  for (let sweep = 0; sweep < 3; sweep += 1) {
    await page.mouse.move(800, 500, { steps: 20 });
    await page.mouse.move(1400, 300, { steps: 20 });
    await page.mouse.move(1000, 750, { steps: 20 });
  }
  await page.waitForTimeout(1000);
  await phase('scroll quests');
  await page.mouse.move(400, 500);
  await wheel(100, 80);
  await wheel(-100, 80);
  await page.waitForTimeout(1500);

  const start = phases[0][1];
  const during = (at) => phases.reduce((name, [label, from]) => (at >= from ? label : name), 'loading');
  const gaps = await frameGaps(page, start);
  const sorted = gaps.map(([, gap]) => gap).sort((a, b) => a - b);
  const slow = {};
  gaps.filter(([, gap]) => gap > 25).forEach(([at, gap]) => { (slow[during(at)] ??= []).push(Math.round(gap)); });
  const freezes = await page.evaluate(() => window.__perf.freezes);
  const after = freezes.filter((freeze) => freeze.at >= start);
  await context.close();
  return {
    frames: gaps.length,
    p99: round(percentile(sorted, 0.99)),
    longest: round(sorted.at(-1) ?? 0),
    over25: sorted.filter((gap) => gap > 25).length,
    over33: sorted.filter((gap) => gap > 33.4).length,
    slowByPhase: slow,
    freezesBehindLoader: freezes.length - after.length,
    freezesAfterLoader: after.map((freeze) => `${round(freeze.ms, 0)} ms during ${during(freeze.at)}: ${freeze.script}`),
    errors,
  };
}

const browser = await launch();
for (let run = 1; run <= Number(runs); run += 1) {
  const result = await visit(browser);
  console.log(`run ${run} (${device}):`);
  console.log(`  ${result.frames} frames after the loading screen; p99 ${result.p99} ms, longest ${result.longest} ms`);
  console.log(`  frames over 25 ms: ${result.over25} (over 33 ms: ${result.over33})`);
  Object.entries(result.slowByPhase).forEach(([name, list]) => console.log(`    ${name}: ${list.join(', ')} ms`));
  console.log(`  freezes (over 50 ms): ${result.freezesBehindLoader} behind the loading screen, ${result.freezesAfterLoader.length} after`);
  result.freezesAfterLoader.forEach((line) => console.log(`    ${line}`));
  console.log(result.errors.length ? `  errors:\n    ${result.errors.join('\n    ')}` : '  errors: none');
}
await browser.close();
