import { MOBILE_SCENE_QUERY } from './experience/experienceStage.js';

// Sound on or off (the switch beside the 3D one, SceneBackground.jsx): remembered once chosen; on
// until switched off on desktop (browsers still hold it until the first click or key press), and
// off on phones, which have no switch to turn it off with. What makes sound listens here
// (kitsuneChimes.js).
const KEY = 'site-sound';
const listeners = new Set();

let on = typeof window !== 'undefined' && !window.matchMedia(MOBILE_SCENE_QUERY).matches;
try {
  const stored = localStorage.getItem(KEY);
  if (stored) on = stored === 'on';
} catch { /* Storage can be unavailable in private browsing. */ }

export const soundOn = () => on;

export function setSoundOn(next) {
  on = next;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* As above. */ }
  listeners.forEach((listener) => listener(on));
}

export function onSoundChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
