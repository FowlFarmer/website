import { useEffect, useState } from 'react';
import { auditOff } from './frameStats.js';

// Copies of the backdrop (the scene, its stills, the tint over it), for fades over the page that
// leave its glass cards their blur. A mask shuts what's inside it off from what's behind, so glass
// in a masked scrolling area has nothing to blur:
// - The page's fade under the menu bar (App.css) is no mask but a cover over the page's top
//   (NavFadeCover): the backdrop again, faded in where the page fades out, which paints the same
//   picture. So the glass blurs the backdrop itself, and only that thin band is copied.
// - The phone quests page's own area (its fades, experience.css, which reach down the screen) keeps
//   its mask, with the whole backdrop copied behind its content (MirrorHost).
// Hosts register here, SceneBackground.jsx fills each with the backdrop's layers (marking the page
// while it's there, data-scene-backdrop: without it, nothing to copy, the page keeps its mask), and
// the 3D scene copies every frame it draws into their canvases (drawSceneMirrors). The copies don't
// scroll, like the backdrop itself.
const hosts = new Set();
const hostListeners = new Set();
const canvases = new Map(); // canvas -> its cover (the band it copies), or null: all of it

export function useMirrorHosts() {
  const [list, setList] = useState(() => [...hosts]);
  useEffect(() => {
    document.documentElement.dataset.sceneBackdrop = '';
    return () => { delete document.documentElement.dataset.sceneBackdrop; };
  }, []);
  useEffect(() => {
    const listener = () => setList([...hosts]);
    hostListeners.add(listener);
    listener();
    return () => { hostListeners.delete(listener); };
  }, []);
  return list;
}

// A place for the copy, first inside a masked scrolling area (behind its content), while `active`.
export function MirrorHost({ active = true, className = 'scene-mirror' }) {
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!node || !active) return undefined;
    hosts.add(node);
    hostListeners.forEach((listener) => listener());
    return () => {
      hosts.delete(node);
      hostListeners.forEach((listener) => listener());
    };
  }, [node, active]);
  return <div ref={setNode} className={className} aria-hidden="true" hidden={!active} />;
}

// The cover over the page's top, under the menu bar (App.css .nav-fade-cover), while `active`.
export const NavFadeCover = ({ active }) => <MirrorHost active={active} className="scene-mirror nav-fade-cover" />;

// A copy's canvas: registered while mounted, for the scene to draw into (in the cover, only the band
// it covers).
export function MirrorCanvas() {
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!node) return undefined;
    canvases.set(node, node.closest('.nav-fade-cover'));
    return () => { canvases.delete(node); };
  }, [node]);
  return <canvas ref={setNode} className="scene-mirror-canvas" />;
}

// The scene's frame (`source`, just drawn) into every copy, placed where the scene's canvas is;
// `loaded`: the scene has loaded, so its canvas has faded in (App.css), and the copies do too.
export function drawSceneMirrors(source, loaded) {
  if (!canvases.size) return;
  // Switched off to measure (the preview's render settings): cleared, so the scene shows through.
  if (auditOff('glass')) {
    canvases.forEach((_, canvas) => { if (canvas.width) canvas.width = 0; });
    return;
  }
  const rect = source.getBoundingClientRect();
  const rowHeight = rect.height / source.height;
  canvases.forEach((cover, canvas) => {
    // The rows of the scene's canvas on screen from the top down to the cover's foot (whole rows,
    // so the copy's pixels land on the scene's).
    let first = 0;
    let rows = source.height;
    if (cover) {
      first = Math.min(Math.max(Math.floor(-rect.top / rowHeight), 0), source.height);
      rows = Math.min(Math.max(Math.ceil((cover.clientHeight - rect.top) / rowHeight), 0), source.height) - first;
    }
    if (canvas.width !== source.width || canvas.height !== rows) {
      canvas.width = source.width;
      canvas.height = rows;
    }
    const top = rect.top + first * rowHeight;
    const place = `${rect.left}|${top}|${rect.width}|${rows * rowHeight}`;
    if (canvas.dataset.place !== place) {
      canvas.dataset.place = place;
      Object.assign(canvas.style, { left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px`, height: `${rows * rowHeight}px` });
    }
    if (loaded && !canvas.dataset.loaded) canvas.dataset.loaded = 'true';
    if (!rows) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, first, source.width, rows, 0, 0, source.width, rows);
  });
}
