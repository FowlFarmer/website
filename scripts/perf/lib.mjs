// Shared plumbing for the performance and loading checks in scripts/perf (see README.md there):
// launching Chrome, devices, the page's starting state, waiting for the loading screen, and
// recording frames and freezes from inside the page.
import { chromium } from 'playwright-core';

// The site to test: the dev server by default, or any build or deployment (SITE=...).
export const SITE = (process.env.SITE ?? 'http://localhost:5173').replace(/\/$/, '');

// Real Chrome (the system install, or CHROME_PATH), visible by default: a hidden or headless page is
// throttled and gets no GPU-accurate frames. HEADLESS=1 for checks that don't care about frames.
export async function launch({ args = [], headless = process.env.HEADLESS === '1' } = {}) {
  return chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
    headless,
    args: ['--window-size=1500,950', ...args],
  });
}

// Screens: a laptop (1440×900 at 2×, like a Retina Mac; the site caps its 3D canvas at 1.5×) and a
// phone (390×844 at 3×, touch). `--device phone` on any script.
export const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

// `--name value` and `--flag` from the command line.
export function options(defaults = {}) {
  const parsed = { ...defaults };
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    const key = argv[index].slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

// A fresh browser context and page on `device`, starting with 3D on or off (`threeD`), sound off,
// and the in-page recorders below installed before the site's own scripts run.
export async function openPage(browser, { device = 'desktop', threeD = true, clearFrameCap = true } = {}) {
  const context = await browser.newContext(DEVICES[device] ?? DEVICES.desktop);
  const page = await context.newPage();
  await page.addInitScript(({ threeD, clearFrameCap }) => {
    try {
      localStorage.setItem('scene-low-performance', threeD ? 'false' : 'true');
      localStorage.setItem('site-sound', 'off');
      // A cap remembered from an earlier slow run (CherryBlossomScene.jsx's frame judging).
      if (clearFrameCap) localStorage.removeItem('scene-frame-cap');
    } catch { /* No storage: the site's defaults. */ }
    // Every animation frame's start, and every Long Animation Frame (over 50 ms) with the scripts
    // behind it: recorded here rather than read from the site's own frame meter, which production
    // builds leave out.
    window.__perf = { frames: [], freezes: [] };
    const tick = (time) => { window.__perf.frames.push(time); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((frame) => {
        window.__perf.freezes.push({
          at: frame.startTime,
          ms: frame.duration,
          script: (frame.scripts ?? []).map((s) => `${s.invoker || s.invokerType} ${(s.sourceURL || '').split('/').pop().split('?')[0]}${s.sourceFunctionName ? `:${s.sourceFunctionName}` : ''} ${Math.round(s.duration)}ms`)[0] ?? 'browser (no script)',
        });
      })).observe({ type: 'long-animation-frame', buffered: true });
    } catch { /* Not Chrome: no freeze records. */ }
  }, { threeD, clearFrameCap });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message.split('\n')[0]}`));
  page.on('console', (message) => {
    const text = message.text();
    // Noise from running locally (no Spotify or telemetry API, no Vercel insights) and a known
    // nested-link warning; anything else is reported.
    if (message.type() === 'error' && !/Spotify|telemetry|Failed to load resource|nested|descendant|insights|MIME/.test(text)) errors.push(text.split('\n')[0]);
    if (/Loading screen let go|compiling took|physics worker/.test(text)) errors.push(`warning: ${text.split('\n')[0]}`);
  });
  return { context, page, errors };
}

// When the loading screen started to lift (bootLoader.js marks it), in ms from navigation.
export async function waitForLoader(page, timeout = 60000) {
  await page.waitForFunction(() => performance.getEntriesByName('loader-hidden').length, null, { timeout });
  return page.evaluate(() => Math.round(performance.getEntriesByName('loader-hidden')[0].startTime));
}

// The gaps between frames since `from` (ms), sorted, and the longest.
export async function frameGaps(page, from = 0) {
  const frames = await page.evaluate((from) => window.__perf.frames.filter((time) => time >= from), from);
  const gaps = frames.slice(1).map((time, index) => [frames[index], time - frames[index]]);
  return gaps;
}

export const percentile = (sorted, share) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];

// Plain numbers for the results.
export const round = (value, places = 1) => Number(value.toFixed(places));
