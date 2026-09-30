import { useEffect, useRef } from 'react';
import { measure, sceneFrames, targetFps } from './frameStats.js';

// Frames per second, the 95th percentile frame time and the frame budget for the target rate, in
// the corner (not on Vercel's production site: App.jsx). It times the 3D scene's frames while it's
// drawing (it holds itself to 30 a second on low-power devices), otherwise the display's; the
// target is the scene's rate, or the display's refresh rate.
const COMMON_RATES = [30, 60, 75, 90, 120, 144, 165, 240];

export default function FrameMeter() {
  const ref = useRef(null);
  useEffect(() => {
    const display = [];
    let frame = 0;
    let shownAt = 0;
    const tick = (now) => {
      frame = window.requestAnimationFrame(tick);
      display.push(now);
      while (display.length && display[0] < now - 2000) display.shift();
      if (now - shownAt < 250 || !ref.current) return;
      shownAt = now;
      const scene = sceneFrames();
      const drawing = scene.length && scene[scene.length - 1] > now - 500;
      const stats = measure(drawing ? scene : display, now);
      const shown = measure(display, now);
      if (!stats || !shown) return;
      // The display's refresh rate: its frames' typical gap, to the nearest common rate.
      const refresh = COMMON_RATES.reduce((best, rate) => (Math.abs(rate - shown.fps) < Math.abs(best - shown.fps) ? rate : best));
      const target = (drawing && targetFps()) || refresh;
      const budget = 1000 / target;
      ref.current.textContent = `${Math.round(stats.fps)} fps · p95 ${stats.p95.toFixed(1)} ms · budget ${budget.toFixed(1)} ms (${target} fps)`;
      ref.current.dataset.over = stats.p95 > budget * 1.1 ? 'true' : 'false';
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return <div ref={ref} className="frame-meter" aria-hidden="true" />;
}
