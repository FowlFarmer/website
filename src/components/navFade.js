import { MOBILE_SCENE_QUERY } from './experience/experienceStage.js';

// The page fades out as it scrolls up under the menu bar: whatever passes under the bar is hidden,
// with a short fade just below its bottom edge. Only while the bar is showing (not over the name
// at the top of the home page): the fade eases in and out with it (NavBar.jsx calls
// setNavFadeShown). Each card masks itself, rather than the page as a whole: a mask on the page
// would cut the cards' glass blur off from the scene behind it. Phones have their own fade, on the
// quests page's scrolling area (experience.css).
const CARDS = '.main-content :is(.glass-effect, .glass-effect-2, .kitsune-role)';
const FADE_PX = 16;
const EASE_MS = 350;

let strength = 0;
let goal = 0;
let frame = 0;
let last = 0;
let listening = false;
const masked = new Set();

const phone = () => window.matchMedia(MOBILE_SCENE_QUERY).matches;

function clearAll() {
  masked.forEach((card) => {
    card.style.maskImage = '';
    card.style.webkitMaskImage = '';
  });
  masked.clear();
}

function apply() {
  if (strength <= 0 || phone()) {
    clearAll();
    return;
  }
  const bar = document.querySelector('.navbar-styles');
  const line = bar ? bar.getBoundingClientRect().bottom : 0;
  const still = new Set();
  document.querySelectorAll(CARDS).forEach((card) => {
    const top = card.getBoundingClientRect().top;
    if (top >= line + FADE_PX) return;
    // In the card's own coordinates: hidden above the bar's edge, fading in just below it.
    const at = line - top;
    const mask = `linear-gradient(to bottom, rgba(0, 0, 0, ${(1 - strength).toFixed(3)}) ${at}px, #000 ${at + FADE_PX}px)`;
    card.style.maskImage = mask;
    card.style.webkitMaskImage = mask;
    masked.add(card);
    still.add(card);
  });
  masked.forEach((card) => {
    if (still.has(card)) return;
    card.style.maskImage = '';
    card.style.webkitMaskImage = '';
    masked.delete(card);
  });
}

function tick(now) {
  frame = 0;
  const seconds = last ? now - last : 0;
  last = now;
  if (strength !== goal) {
    const step = seconds / EASE_MS;
    strength = goal > strength ? Math.min(goal, strength + step) : Math.max(goal, strength - step);
  }
  apply();
  if (strength !== goal) frame = window.requestAnimationFrame(tick);
  else last = 0;
}

const schedule = () => {
  if (!frame) frame = window.requestAnimationFrame(tick);
};

export function setNavFadeShown(shown) {
  goal = shown ? 1 : 0;
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  schedule();
}
