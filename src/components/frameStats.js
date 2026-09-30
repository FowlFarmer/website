// Frame timing for the on-screen meter (FrameMeter.jsx), which shows everywhere but Vercel's
// production site, and there too in a tab opened at /lab/performance/... (App.jsx sends that on to
// the page after it: /lab/performance/quests is the quests page, meter and all, until the tab
// closes). The 3D scene marks each frame it draws (markFrame) and says what rate it aims for
// (setTargetFps: 30 on low-power devices; otherwise null, every display frame).
export const PERFORMANCE_PATH = '/lab/performance';
function performanceView() {
  if (typeof window === 'undefined') return false;
  const asked = location.pathname.startsWith(PERFORMANCE_PATH);
  try {
    if (asked) sessionStorage.setItem('performance-view', 'on');
    return asked || sessionStorage.getItem('performance-view') === 'on';
  } catch {
    return asked;
  }
}
export const SHOW_FRAME_METER = import.meta.env.VITE_VERCEL_ENV !== 'production' || performanceView();

// Render settings to try out (FrameMeter.jsx's panel; not on the production site), remembered on
// this device; the defaults are the site's own. Parts can also be switched off from the address:
// ?off=glass,mask,store,petals,kitsune (the glass's scene copy, the scrolling areas' fades, the
// Lawson store and rider, the falling petals, the kitsune).
export const TUNING_DEFAULTS = {
  pixelRatio: null, // null: the site's own (the display's, capped)
  antialias: true, // takes a reload: it's set when the 3D canvas is made
  petals: 1, // share of the falling petals drawn
  glowScale: 1, // the kitsune's glow drawn at this share of the resolution
  glass: true,
  store: true,
  fallingPetals: true,
  kitsune: true,
  frameCap: null, // null: the site's own (30 on low-power devices); 0: none
  riderTextures: null, // null: the site's own; 'mobile' 2048px, 'low' 1024px, '512' 512px (reload)
  scrolling: 'full', // while the page scrolls: 'full', 'half' (every other frame) or 'paused'
  glassBlur: 1, // the glass cards' blur, as a share of its normal strength (App.css --glass-blur-scale)
  preciseGpu: false, // each stage its own GPU batch, so its timer times it alone
};
const TUNING_KEY = 'render-tuning';
export const tuning = { ...TUNING_DEFAULTS };
if (SHOW_FRAME_METER && typeof window !== 'undefined') {
  try { Object.assign(tuning, JSON.parse(localStorage.getItem(TUNING_KEY) || '{}')); } catch { /* Unavailable or unreadable: the defaults. */ }
  const off = new Set((new URLSearchParams(location.search).get('off') ?? '').split(',').filter(Boolean));
  if (off.has('glass')) tuning.glass = false;
  if (off.has('store')) tuning.store = false;
  if (off.has('petals')) tuning.fallingPetals = false;
  if (off.has('kitsune')) tuning.kitsune = false;
  if (off.has('mask')) document.documentElement.dataset.auditNoMask = '';
}
const tuningListeners = new Set();
// The glass cards' blur follows the setting (a CSS variable their backdrop blur scales by).
const applyGlassBlur = () => {
  if (SHOW_FRAME_METER && typeof document !== 'undefined') document.documentElement.style.setProperty('--glass-blur-scale', String(tuning.glassBlur));
};
applyGlassBlur();
export function setTuning(patch) {
  Object.assign(tuning, patch);
  applyGlassBlur();
  try { localStorage.setItem(TUNING_KEY, JSON.stringify(tuning)); } catch { /* As above. */ }
  tuningListeners.forEach((listener) => listener(tuning));
}
export function onTuningChange(listener) {
  tuningListeners.add(listener);
  return () => tuningListeners.delete(listener);
}
const OFF_PARTS = { glass: 'glass', store: 'store', petals: 'fallingPetals', kitsune: 'kitsune' };
export const auditOff = (part) => SHOW_FRAME_METER && tuning[OFF_PARTS[part]] === false;

const WINDOW_MS = 2000;
const marks = [];
let target = null;

export function markFrame(now) {
  if (!SHOW_FRAME_METER) return;
  marks.push(now);
  while (marks.length && marks[0] < now - WINDOW_MS) marks.shift();
}

export function setTargetFps(fps) {
  target = fps;
}

// Over the last two seconds of `times` (frame timestamps, ms): frames per second and the 95th
// percentile time between frames. Null without enough frames.
export function measure(times, now) {
  const recent = times.filter((time) => time >= now - WINDOW_MS);
  if (recent.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < recent.length; i += 1) gaps.push(recent[i] - recent[i - 1]);
  gaps.sort((a, b) => a - b);
  const span = recent[recent.length - 1] - recent[0];
  return { fps: (gaps.length * 1000) / span, p95: gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * 0.95))] };
}

// The scene's frames, if it's drawing, and the rate it aims for.
export const sceneFrames = () => marks;
export const targetFps = () => target;

// Where each frame of the 3D scene goes (FrameMeter.jsx's breakdown): the scene brackets each part
// of its frame (begin/end with a name) and closes the frame (endFrame). Main-thread time is timed
// directly; GPU time with the browser's GPU timer queries where it has them (Chrome desktop), read
// back a few frames later. Both are averaged over about a second.
export function createFrameProfiler(gl) {
  if (!SHOW_FRAME_METER) return { begin() {}, end() {}, endFrame() {} };
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending = [];
  let open = null;
  let started = 0;
  const add = (name, key, value) => {
    const entry = profile.sections[name] ?? (profile.sections[name] = { cpu: null, gpu: null });
    entry[key] = entry[key] == null ? value : entry[key] * 0.95 + value * 0.05;
  };
  profile.gpu = Boolean(timer);
  return {
    begin(name) {
      if (tuning.preciseGpu) gl.flush();
      started = performance.now();
      if (timer && !open) {
        const query = gl.createQuery();
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        open = { name, query };
      }
    },
    end(name) {
      add(name, 'cpu', performance.now() - started);
      if (open?.name === name) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(open);
        open = null;
        if (tuning.preciseGpu) gl.flush();
      }
    },
    endFrame(frameStart) {
      add('scene (all)', 'cpu', performance.now() - frameStart);
      if (!timer) return;
      const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
      while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
        const { name, query } = pending.shift();
        if (!disjoint) add(name, 'gpu', gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(query);
      }
      if (pending.length > 60) pending.splice(0, pending.length - 60).forEach(({ query }) => gl.deleteQuery(query));
    },
  };
}
export const profile = { sections: {}, gpu: false };

// Freezes: every animation frame that ran long (Chrome's Long Animation Frames; elsewhere long
// tasks), with the scripts that took the time, and the page's load milestones (markLoad).
export const freezes = [];
export const loads = [];
export function markLoad(name) {
  if (!SHOW_FRAME_METER) return;
  loads.push({ name, at: performance.now() });
}
if (SHOW_FRAME_METER && typeof PerformanceObserver !== 'undefined') {
  const keep = (entry) => {
    freezes.push(entry);
    if (freezes.length > 40) freezes.shift();
  };
  const types = PerformanceObserver.supportedEntryTypes ?? [];
  if (types.includes('long-animation-frame')) {
    new PerformanceObserver((list) => list.getEntries().forEach((frame) => {
      if (frame.duration < 50) return;
      const scripts = (frame.scripts ?? [])
        .map((script) => ({
          what: `${script.invoker || script.invokerType || '?'} ${(script.sourceURL || '').replace(location.origin, '').split('?')[0]}${script.sourceFunctionName ? `:${script.sourceFunctionName}` : ''}`.trim(),
          ms: script.duration,
        }))
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3);
      keep({
        at: frame.startTime,
        ms: frame.duration,
        blocking: frame.blockingDuration,
        layout: frame.renderStart && frame.styleAndLayoutStart ? frame.startTime + frame.duration - frame.styleAndLayoutStart : 0,
        scripts,
      });
    })).observe({ type: 'long-animation-frame', buffered: true });
  } else if (types.includes('longtask')) {
    new PerformanceObserver((list) => list.getEntries().forEach((task) => {
      keep({ at: task.startTime, ms: task.duration, blocking: task.duration - 50, layout: 0, scripts: [] });
    })).observe({ type: 'longtask', buffered: true });
  }
}
