// Sound on or off (the switch beside the 3D one, SceneBackground.jsx): remembered, off until
// turned on. What makes sound listens here (kitsuneChimes.js).
const KEY = 'site-sound';
const listeners = new Set();

let on = false;
try { on = localStorage.getItem(KEY) === 'on'; } catch { /* Storage can be unavailable in private browsing. */ }

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
