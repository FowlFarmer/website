// The loading screen. It's in index.html, so it's the first thing anyone sees, before any script
// runs; here it's held up until everything that would otherwise freeze the page later is done
// (the 3D scenes built, compiled, their textures on the GPU and each drawn once, the quests page's
// code in): a longer load rather than a stall after it. Parts of the site hold it (holdLoader, by
// name) and let go when they're ready (releaseLoader); it fades out once nothing holds it.
// reportProgress(part, fraction, weight) feeds the percentage it shows. showLoader brings it back
// (switching 3D on builds the scene again), at once and from 0%.
//
// Its circle around the pointer is the pointer itself (a CSS cursor image, index.html): drawn by
// the system, so it can't lag however busy the page is, and its petals orbit the percentage on
// CSS animations, which run off the page's thread.
const SAFETY_MS = 45000; // never stuck: let go whatever's left after this
// The 3D scene's setup's share of the percentage (building, compiling, warming up), against its
// downloads' 6.5 (sceneFiles.js), the first render's 0.5 and the quests code's 0.3.
export const SCENE_PROGRESS_WEIGHT = 3.4;
const FADE_MS = 460; // index.html #boot-loader's transition

const loader = typeof document !== 'undefined' ? document.getElementById('boot-loader') : null;
const label = loader?.querySelector('.boot-percent');
const stageLabel = loader?.querySelector('.boot-stage');
const holds = new Set();
const parts = new Map(); // part -> { fraction, weight }
let shown = 0;
let hidden = !loader;

function render() {
  if (!label || hidden) return;
  let total = 0;
  let done = 0;
  parts.forEach(({ fraction, weight }) => {
    total += weight;
    done += fraction * weight;
  });
  // Never backwards (a part joining late adds to the total).
  shown = Math.max(shown, total ? Math.floor((done / total) * 100) : 0);
  label.textContent = `${shown}%`;
}

// The stage under the percentage: a word or two for what it's waiting on now. Shown as it comes,
// however fast it changes.
export function setStage(text) {
  if (stageLabel && !hidden && stageLabel.textContent !== text) stageLabel.textContent = text;
}

export function reportProgress(part, fraction, weight = 1) {
  parts.set(part, { fraction: Math.min(Math.max(fraction, 0), 1), weight });
  render();
}

// `weight`: its share of the percentage (done when it lets go), as reportProgress's.
export function holdLoader(name, weight = 0) {
  if (hidden) return;
  holds.add(name);
  if (!parts.has(name) || weight) reportProgress(name, 0, weight);
}

let fadeTimer = 0;
let fadeFrame = 0;
function hide() {
  if (hidden) return;
  hidden = true;
  if (label) label.textContent = '100%';
  performance.mark('loader-hidden');
  // A frame for the 100% to show, then the fade; then out of the way entirely.
  fadeFrame = window.requestAnimationFrame(() => {
    loader.classList.add('is-ready');
    fadeTimer = window.setTimeout(() => { loader.hidden = true; }, FADE_MS + 60);
  });
}

// Up again at once, from 0%, until whatever holds it next lets go.
export function showLoader() {
  if (!loader) return;
  window.cancelAnimationFrame(fadeFrame);
  window.clearTimeout(fadeTimer);
  hidden = false;
  shown = 0;
  parts.clear();
  // No fade in: shown as it is, before the next paint.
  loader.style.transition = 'none';
  loader.hidden = false;
  loader.classList.remove('is-ready');
  void loader.offsetWidth;
  loader.style.transition = '';
  setStage('starting');
  render();
  armSafety();
}

export function releaseLoader(name) {
  if (!holds.delete(name)) return;
  const part = parts.get(name);
  if (part) part.fraction = 1;
  render();
  if (!holds.size) hide();
}

// Whether the loading screen is gone (or never was).
export const loaderHidden = () => hidden;

let safetyTimer = 0;
function armSafety() {
  window.clearTimeout(safetyTimer);
  safetyTimer = window.setTimeout(() => {
    if (hidden) return;
    if (holds.size) console.warn('Loading screen let go after waiting on:', [...holds].join(', '));
    holds.clear();
    hide();
  }, SAFETY_MS);
}
if (loader) armSafety();
