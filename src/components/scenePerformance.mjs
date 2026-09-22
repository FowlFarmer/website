// Assess rendered frames, not pointer/scroll event frequency. Require two bad
// four-second windows after warm-up; one loading hiccup must not disable 3D.
export function createScenePerformanceMonitor(targetFps = 60) {
  let previous = null, warmup = 6000, elapsed = 0, frames = 0, drops = 0, badWindows = 0;
  function reset() { previous = null; warmup = 6000; elapsed = frames = drops = badWindows = 0; }
  function sample(now) {
    if (typeof document !== 'undefined' && document.hidden) {
      previous = null;
      return false;
    }
    if (previous === null) { previous = now; return false; }
    const dt = now - previous;
    previous = now;
    if (dt <= 0) return false;
    // A hidden tab, debugger pause, or sleep can leave a multi-second gap
    // between rAF callbacks. That is not a rendered frame.
    if (dt > 1000) return false;
    if (warmup > 0) { warmup -= dt; return false; }
    elapsed += dt;
    frames++;
    if (dt > 1000 / targetFps * 1.85) drops++;
    if (elapsed < 4000) return false;
    const fps = frames * 1000 / elapsed;
    const poor = fps < (targetFps === 30 ? 20 : 26) || drops / frames > .3;
    badWindows = poor ? badWindows + 1 : 0;
    elapsed = frames = drops = 0;
    return badWindows >= 2;
  }
  return { sample, reset };
}
