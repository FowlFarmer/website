// Pages scroll inside .page-scroller (App.jsx) rather than the window, so the fade under the menu
// bar (a mask on it, App.css) holds still on screen as they scroll. Reading, following and setting
// the page's scroll all go through here, which also covers the window, in case it ever scrolls.
// (The phone quests page scrolls its own area inside, Quests.jsx.)
const scroller = () => document.querySelector('.page-scroller');

export const pageScrollY = () => window.scrollY + (scroller()?.scrollTop ?? 0);

export function pageScrollTo(options) {
  window.scrollTo(options);
  scroller()?.scrollTo(options);
}

// Calls `listener` when the page scrolls (not other scrolling areas in it); returns the unsubscribe.
export function onPageScroll(listener) {
  const heard = (event) => {
    if (event.target === document || event.target === scroller()) listener(event);
  };
  document.addEventListener('scroll', heard, { capture: true, passive: true });
  return () => document.removeEventListener('scroll', heard, { capture: true });
}
