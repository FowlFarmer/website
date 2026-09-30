import { useEffect, useRef, useState } from 'react';
import { MOBILE_SCENE_QUERY, cycleGlow, experienceStage, openLore, setHovered } from './experienceStage.js';

// The kitsune when the live scene is off (3D off): stills baked from the real scene
// (bakeKitsuneStills.js) over the Fuji backdrop, placed where the live view draws him and shrunk
// to the bottom-right as the page scrolls, the same as the live one. Each state is two layers, a
// shade (drawn normally) and its light (added, `plus-lighter`), which stack to the live glow.
// Hovering a tail (the baked hover map says which) lights it and brings up its role card; the
// role card's cycle lights its tail too; a click on him opens the lore. On phones they sit in the
// live band across the bottom of the screen instead, centred and brought in as the phone camera
// is (layout.phone), and a tap picks a tail, held until the next tap (the lore has its own button).
const BASE = '/kitsune-stills';
const TAILS = 6;
// Clicks through the page count; ones on anything that handles its own click don't (as live).
const OWN_CLICKS = 'a, button, input, textarea, select, label, video, iframe, dialog, [role="button"], [role="dialog"], [contenteditable], .media-frame, .navbar, .scene-performance-control, .popup-backdrop';
// How far a click on him (not a tail) must be into his shade to count, of 255.
const BODY_ALPHA = 40;

// Read an image's pixels once, for lookups.
async function pixelsOf(src, scale = 1) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

export default function StaticKitsune({ shown }) {
  const [phone] = useState(() => window.matchMedia(MOBILE_SCENE_QUERY).matches);
  const [layout, setLayout] = useState(null);
  const [tailsReady, setTailsReady] = useState(false);
  const stillsRef = useRef(null);
  const layersRef = useRef({ rest: [], tails: [] });

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/layout.json`).then((response) => response.json()).then((data) => { if (!cancelled) setLayout(data); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!layout || !shown) return undefined;
    let frame = 0;
    let last = performance.now();
    let hoverMap = null;
    let shade = null;
    let pointer = null;
    let hovered = -1;
    const lit = new Float32Array(TAILS);
    pixelsOf(`${BASE}/hover-map.png`).then((pixels) => { hoverMap = pixels; });
    pixelsOf(`${BASE}/rest-shade.webp`, 0.25).then((pixels) => { shade = pixels; });

    // What's under a point on screen: a tail (0-5), his body ('body'), or nothing (null).
    const under = (x, y) => {
      const bounds = stillsRef.current?.getBoundingClientRect();
      if (!bounds || !hoverMap) return null;
      const u = (x - bounds.left) / bounds.width;
      const v = (y - bounds.top) / bounds.height;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
      const tail = hoverMap.data[(Math.floor(v * hoverMap.height) * hoverMap.width + Math.floor(u * hoverMap.width)) * 4] - 1;
      if (tail >= 0) return tail;
      if (shade && shade.data[(Math.floor(v * shade.height) * shade.width + Math.floor(u * shade.width)) * 4 + 3] > BODY_ALPHA) return 'body';
      return null;
    };
    const pick = () => {
      if (phone) return;
      const at = pointer && experienceStage.hover ? under(pointer.x, pointer.y) : null;
      const tail = typeof at === 'number' ? at : -1;
      if (tail !== hovered) {
        hovered = tail;
        setHovered(tail);
        document.body.style.cursor = tail >= 0 ? 'pointer' : '';
      }
    };
    const handleMove = (event) => { pointer = { x: event.clientX, y: event.clientY }; };
    const handleLeave = () => { pointer = null; };
    const handleClick = (event) => {
      if (event.target.closest(OWN_CLICKS)) return;
      const at = under(event.clientX, event.clientY);
      if (phone) {
        if (!experienceStage.hover) return;
        hovered = typeof at === 'number' ? at : -1;
        setHovered(hovered);
        return;
      }
      if (at !== null) openLore(event.clientX, event.clientY);
    };

    const step = (now) => {
      frame = window.requestAnimationFrame(step);
      const seconds = Math.min((now - last) / 1000, 0.1);
      last = now;
      pick();
      // Lit tails ease in and out as the live glow does.
      let most = 0;
      for (let tail = 0; tail < TAILS; tail += 1) {
        const target = tail === hovered ? 1 : tail === experienceStage.cycleTail ? cycleGlow(now) : 0;
        lit[tail] += (target - lit[tail]) * Math.min(seconds * 6, 1);
        most = Math.max(most, lit[tail]);
      }
      const { rest, tails } = layersRef.current;
      rest.forEach((layer) => { if (layer) layer.style.opacity = String(1 - most); });
      tails.forEach((layer, index) => { if (layer) layer.style.opacity = String(lit[Math.floor(index / 2)]); });
      stillsRef.current?.style.setProperty('--s', String(experienceStage.scale));
    };
    frame = window.requestAnimationFrame(step);
    window.addEventListener('pointermove', handleMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handleLeave);
    window.addEventListener('click', handleClick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('click', handleClick);
      if (hovered >= 0) setHovered(-1);
      document.body.style.cursor = '';
    };
  }, [layout, shown, phone]);

  const place = layout && {
    '--x': layout.x, '--y': layout.y, '--w': layout.width, '--h': layout.height, '--s': experienceStage.scale,
    ...(phone && layout.phone ? { '--px': layout.phone.x, '--py': layout.phone.y, '--zoom': layout.phone.zoom } : {}),
  };
  const layers = (name, refs, index) => ['shade', 'light'].map((kind, k) => (
    <img
      key={`${name}-${kind}`}
      ref={(node) => { refs[index * 2 + k] = node; }}
      className={`static-kitsune-${kind}`}
      src={`${BASE}/${name}-${kind}.webp`}
      alt=""
      decoding="async"
      style={name === 'rest' ? undefined : { opacity: 0 }}
      onLoad={name === 'rest' && kind === 'light' ? () => setTailsReady(true) : undefined}
    />
  ));
  const stills = layout && (
    <div ref={stillsRef} className="static-kitsune-stills" style={place}>
      {layers('rest', layersRef.current.rest, 0)}
      {tailsReady && Array.from({ length: TAILS }, (_, tail) => layers(`tail-${tail}`, layersRef.current.tails, tail))}
    </div>
  );
  return (
    <div className="static-kitsune" data-shown={shown} aria-hidden="true">
      <img className="static-kitsune-backdrop" src={phone ? '/images/scene/fuji-mobile.jpg' : '/images/scene/fuji_hd.jpg'} alt="" decoding="async" />
      {stills}
    </div>
  );
}
