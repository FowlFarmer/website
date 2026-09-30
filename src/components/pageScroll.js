// Desktop pages scroll inside .page-scroller (App.jsx) rather than the window, so the fade under the
// menu bar (a mask on it, App.css) holds still on screen as they scroll. Phones scroll the window,
// as before. Reading, following and setting the page's scroll all go through here, which covers
// both: only one of them ever scrolls.
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
