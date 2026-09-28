// A frame is late when it misses the 50ms RAIL deadline. Judge a window by
// its 95th percentile frame time, not its average fps: a smooth 30fps scene
// stays under that deadline, and a hitchy one does not. Switch only after
// two late windows past warm-up. One spike must not disable 3D.
const FRAME_DEADLINE_MS = 50;
const WINDOW_MS = 4000;
const WARMUP_MS = 6000;

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

export function createScenePerformanceMonitor() {
  let previous = null;
  let warmup = WARMUP_MS;
  let elapsed = 0;
  let samples = [];
  let badWindows = 0;

  function reset() {
    previous = null;
    warmup = WARMUP_MS;
    elapsed = 0;
    samples = [];
    badWindows = 0;
  }

  function sample(now) {
    if (typeof document !== 'undefined' && document.hidden) {
      previous = null;
      return false;
    }
    if (previous === null) {
      previous = now;
      return false;
    }
    const dt = now - previous;
    previous = now;
    if (dt <= 0) return false;
    // A hidden tab, debugger pause, or sleep can leave a multi-second gap
    // between frames. That gap is not a rendered frame.
    if (dt > 1000) return false;
    if (warmup > 0) {
      warmup -= dt;
      return false;
    }
    elapsed += dt;
    samples.push(dt);
    if (elapsed < WINDOW_MS) return false;
    const poor = percentile(samples, 0.95) > FRAME_DEADLINE_MS;
    badWindows = poor ? badWindows + 1 : 0;
    elapsed = 0;
    samples = [];
    return badWindows >= 2;
  }

  return { sample, reset };
}
