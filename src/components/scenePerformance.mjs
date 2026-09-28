// Decide from rendered frames, not from pointer or scroll events.
// Smooth 30fps is a healthy decorative scene. Switch only after warm-up
// when two full windows stay below a calm frame rate, or spend a fifth of
// their time inside real hitches. One loading spike must not disable 3D.
export function createScenePerformanceMonitor(targetFps = 60) {
  const capped = targetFps <= 30;
  const hitchMs = capped ? 100 : 80;
  const minFps = capped ? 18 : 22;
  let previous = null;
  let warmup = 6000;
  let elapsed = 0;
  let frames = 0;
  let hitchTime = 0;
  let badWindows = 0;

  function reset() {
    previous = null;
    warmup = 6000;
    elapsed = frames = hitchTime = badWindows = 0;
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
    frames += 1;
    if (dt >= hitchMs) hitchTime += dt;
    if (elapsed < 4000) return false;
    const fps = (frames * 1000) / elapsed;
    const poor = fps < minFps || hitchTime / elapsed >= 0.2;
    badWindows = poor ? badWindows + 1 : 0;
    elapsed = frames = hitchTime = 0;
    return badWindows >= 2;
  }

  return { sample, reset };
}
