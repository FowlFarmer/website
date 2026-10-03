// The 2D kitsune's files (StaticKitsune.jsx: the quests page with 3D off), fetched ahead so that
// page never waits on them: behind the loading screen when 3D is off from the start, at once when a
// first load settles for 3D off, after the 3D files otherwise (SceneBackground.jsx). The images are
// kept here, decoded, so the browser has them in memory when the page asks.
export const STILLS_BASE = '/kitsune-stills';
const TAILS = 6;
const kept = [];
let layout = null;
let stills = null;

const image = (url) => {
  const element = new Image();
  element.src = url;
  kept.push(element);
  return element.decode().catch(() => {});
};

// Its layout (where the stills sit), fetched once for everyone who asks.
export const kitsuneStillsLayout = () => {
  layout ??= fetch(`${STILLS_BASE}/layout.json`).then((response) => response.json());
  return layout;
};

// Resolves once they're all in (failures included: the page copes as before).
export function preloadKitsuneStills({ mobile }) {
  stills ??= Promise.all([
    kitsuneStillsLayout().catch(() => {}),
    image(`${STILLS_BASE}/hover-map.png`),
    image(mobile ? '/images/scene/fuji-mobile.jpg' : '/images/scene/fuji_hd.jpg'),
    ...['rest', ...Array.from({ length: TAILS }, (_, tail) => `tail-${tail}`)]
      .flatMap((name) => ['shade', 'light'].map((kind) => image(`${STILLS_BASE}/${name}-${kind}.webp`))),
  ]);
  return stills;
}
