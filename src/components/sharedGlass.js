// The cards' frosted glass drawn once for all of them (the preview's "glass: shared blur", frameStats.js
// tuning), instead of each card's backdrop-filter blurring what's behind it at full resolution.
// After each frame of the 3D scene, a quarter-size blurred copy of it is made (one per blur the
// cards use), and every card on the page gets a window onto it: a layer fixed to the screen, clipped
// to the card's shape, so scrolling only moves the clip over an image that's already drawn, and the
// card can never lag behind it. The card's tint sits on top, as its background did. A card inside
// another card keeps no window of its own (its backdrop was already blurred glass). Only while the
// 3D scene is running: without it (3D off) the cards keep the browser's blur (CherryBlossomScene.jsx
// sets data-glass on the page's root while this is in use).
const SCALE = 0.25;
const CARDS = '.main-content :is(.glass-effect, .kitsune-role)';
// The blur each kind of card had (CSS px).
const KINDS = {
  role: { blur: 10, test: (card) => card.classList.contains('kitsune-role') },
  glass: { blur: 8, test: () => true },
};

export function createSharedGlass() {
  // The frame at quarter size (the 3D canvas read once a frame), then blurred for each kind of card.
  const small = document.createElement('canvas');
  const smallContext = small.getContext('2d');
  const blurred = {};
  for (const kind of Object.keys(KINDS)) {
    const canvas = document.createElement('canvas');
    blurred[kind] = { canvas, context: canvas.getContext('2d') };
  }
  const windows = new Map(); // card → { kind, canvas, context, visible }
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const pane = windows.get(entry.target);
    if (pane) pane.visible = entry.isIntersecting;
  }));

  const attach = (card) => {
    if (windows.has(card) || card.parentElement?.closest(CARDS)) return;
    const kind = Object.keys(KINDS).find((name) => KINDS[name].test(card));
    const frame = document.createElement('div');
    frame.className = 'glass-window';
    frame.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    frame.appendChild(canvas);
    // The card's own tint over the window, as its background was over the browser's blur.
    frame.style.setProperty('--glass-tint', getComputedStyle(card).backgroundColor);
    card.prepend(frame);
    card.dataset.glassWindow = '';
    windows.set(card, { kind, frame, canvas, context: canvas.getContext('2d'), visible: true });
    seen.observe(card);
  };
  const detach = (card) => {
    const pane = windows.get(card);
    if (!pane) return;
    pane.frame.remove();
    delete card.dataset.glassWindow;
    seen.unobserve(card);
    windows.delete(card);
  };
  const scan = () => {
    document.querySelectorAll(CARDS).forEach(attach);
    windows.forEach((_, card) => { if (!card.isConnected) detach(card); });
  };
  const watch = new MutationObserver(scan);
  let active = false;
  const setActive = (next) => {
    if (next === active) return;
    active = next;
    if (active) {
      document.documentElement.dataset.glass = 'shared';
      scan();
      watch.observe(document.body, { childList: true, subtree: true });
    } else {
      delete document.documentElement.dataset.glass;
      watch.disconnect();
      [...windows.keys()].forEach(detach);
    }
  };

  // The scene's frame (`source`, just drawn) into the blurred copies and every visible card's window.
  const update = (source) => {
    if (!active) return;
    const rect = source.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * SCALE));
    const height = Math.max(1, Math.round(rect.height * SCALE));
    if (small.width !== width || small.height !== height) {
      small.width = width;
      small.height = height;
    }
    smallContext.drawImage(source, 0, 0, width, height);
    for (const [kind, { canvas, context }] of Object.entries(blurred)) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.filter = `blur(${KINDS[kind].blur * SCALE}px)`;
      context.drawImage(small, 0, 0);
    }
    const place = `${rect.left}|${rect.top}|${rect.width}|${rect.height}`;
    windows.forEach((pane) => {
      if (!pane.visible) return;
      const { canvas, context } = blurred[pane.kind];
      if (pane.canvas.width !== width || pane.canvas.height !== height) {
        pane.canvas.width = width;
        pane.canvas.height = height;
      }
      if (pane.place !== place) {
        pane.place = place;
        Object.assign(pane.canvas.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      }
      pane.context.drawImage(canvas, 0, 0);
    });
  };

  const dispose = () => {
    setActive(false);
    seen.disconnect();
  };
  return { setActive, update, dispose, isActive: () => active };
}
