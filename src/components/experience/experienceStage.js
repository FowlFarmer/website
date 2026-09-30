// Shared between the quests page and the Lawson scene, which draws the kitsune. `show`: which the
// scene should show, 'lawson' (the store and rider) or 'kitsune'; it fades one out, then the other
// in once it's loaded. `scale`: the kitsune's view drawn smaller, same camera and angle, pinned to
// the bottom-right. `hover`: whether hovering a tail picks it (the mouse wind blows either way).
// `supported`: whether the scene can show the kitsune at all (it's running).
// The scene reports when the kitsune starts fading in through `setKitsuneShown`, the tail under
// the pointer through `setHovered`, and a click on the kitsune through `openLore` (and moving off
// him through `closeLore`).
const listeners = new Set();

// Phones (and small touch tablets): the scene's phone layout, where the kitsune sits in a fixed
// band across the bottom PHONE_KITSUNE_SHARE of the screen and the quests page scrolls above it.
// experience.css repeats the query for the page's own layout.
export const MOBILE_SCENE_QUERY = '(max-width: 767px), (pointer: coarse) and (max-width: 1024px)';
export const PHONE_KITSUNE_SHARE = 0.5;
// ...drawn at this size, centred along the bottom, with the page's cards above and beside.
export const PHONE_KITSUNE_SCALE = 0.65;

export const experienceStage = {
  show: 'lawson', scale: 1, hover: true, supported: false, hovered: -1, shown: false,
  // The tail the role card's cycle is showing (-1 for none), since when and for how long: it lights
  // up and fades out over that time.
  cycleTail: -1, cycleSince: 0, cycleMs: 7000,
};

// How lit the cycling tail is now: full as its role comes up, fading to nothing by the next.
export function cycleGlow(now) {
  const { cycleTail, cycleSince, cycleMs } = experienceStage;
  return cycleTail >= 0 ? Math.max(0, 1 - (now - cycleSince) / cycleMs) : 0;
}

// Whether the kitsune is on screen (fading in or shown), for the page content to fade in with it.
const shownListeners = new Set();

export function setKitsuneShown(shown) {
  if (shown === experienceStage.shown) return;
  experienceStage.shown = shown;
  shownListeners.forEach((listener) => listener(shown));
}

export function onKitsuneShown(listener) {
  shownListeners.add(listener);
  return () => shownListeners.delete(listener);
}

export function setHovered(index) {
  if (index === experienceStage.hovered) return;
  experienceStage.hovered = index;
  listeners.forEach((listener) => listener(index));
}

export function onHoveredChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The lore popup: opened by a click on the kitsune, at the pointer; closed once the pointer moves
// off him. Listeners hear the popup's position, or null when it closes.
const loreListeners = new Set();
let loreOpen = false;

export function openLore(x, y) {
  loreOpen = true;
  loreListeners.forEach((listener) => listener({ x, y }));
}

export function closeLore() {
  if (!loreOpen) return;
  loreOpen = false;
  loreListeners.forEach((listener) => listener(null));
}

export function onLore(listener) {
  loreListeners.add(listener);
  return () => loreListeners.delete(listener);
}
