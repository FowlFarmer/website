import { useEffect, useState } from 'react';
import { auditOff } from './frameStats.js';

// A copy of the backdrop (the scene, its stills, the tint over it) inside each scrolling area with a
// mask: desktop's page (the fade under the menu bar, App.css) and the phone quests page (its fades,
// experience.css). A mask shuts what's inside it off from what's behind, so the cards' glass would
// have nothing to blur; the copy gives it the same picture. Hosts (MirrorHost) register here,
// SceneBackground.jsx fills each with the backdrop's layers, and the 3D scene copies every frame it
// draws into their canvases (drawSceneMirrors). The copies don't scroll, like the backdrop itself.
const hosts = new Set();
const hostListeners = new Set();
const canvases = new Set();

export function useMirrorHosts() {
  const [list, setList] = useState(() => [...hosts]);
  useEffect(() => {
    const listener = () => setList([...hosts]);
    hostListeners.add(listener);
    listener();
    return () => { hostListeners.delete(listener); };
  }, []);
  return list;
}

// A place for the copy, first inside a masked scrolling area (behind its content), while `active`.
export function MirrorHost({ active = true }) {
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
  return <div ref={setNode} className="scene-mirror" aria-hidden="true" />;
}

// A copy's canvas: registered while mounted, for the scene to draw into.
export function MirrorCanvas() {
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!node) return undefined;
    canvases.add(node);
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
    canvases.forEach((canvas) => { if (canvas.width) canvas.width = 0; });
    return;
  }
  const rect = source.getBoundingClientRect();
  canvases.forEach((canvas) => {
    if (canvas.width !== source.width || canvas.height !== source.height) {
      canvas.width = source.width;
      canvas.height = source.height;
    }
    const place = `${rect.left}|${rect.top}|${rect.width}|${rect.height}`;
    if (canvas.dataset.place !== place) {
      canvas.dataset.place = place;
      Object.assign(canvas.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    }
    if (loaded && !canvas.dataset.loaded) canvas.dataset.loaded = 'true';
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0);
  });
}
