// Frame timing for the on-screen meter (FrameMeter.jsx), which shows everywhere but Vercel's
// production site. The 3D scene marks each frame it draws (markFrame) and says what rate it aims
// for (setTargetFps: 30 on low-power devices; otherwise null, every display frame).
export const SHOW_FRAME_METER = import.meta.env.VITE_VERCEL_ENV !== 'production';

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
