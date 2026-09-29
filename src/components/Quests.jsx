import { useEffect, useState } from 'react';
import Gallery from './Gallery.jsx';
import KitsuneCard from './experience/KitsuneCard.jsx';
import KitsuneLore from './experience/KitsuneLore.jsx';
import { experienceStage, onHoveredChange, onKitsuneShown } from './experience/experienceStage.js';
import './experience/experience.css';

// The quests page, always over the kitsune: the Lawson scene behind the site shows the kitsune in
// place of its models, on its own backdrop and petals. Archon Quests (the roles) fill the first
// screen, where hovering a tail brings up its role card; World Quests scroll up over the kitsune
// below, where the tails only catch the wind. Over that first screen of scrolling, the kitsune
// shrinks to half size in the bottom-right corner. Arriving, the store fades out and the page waits
// for the kitsune, then both fade in together.
// Show the page anyway if the kitsune hasn't come in by then (a slow connection, a failed load).
const REVEAL_FALLBACK_MS = 8000;
// How far down, as a fraction of the screen height, before the scroll hint goes away.
const HINT_SCROLL_FRACTION = 0.0625;

export default function Quests() {
  const [hovered, setHovered] = useState(-1);
  const [archon, setArchon] = useState(true);
  // Hidden until the kitsune starts fading in, unless the scene can't show it (3D off, a phone),
  // or it's taking too long.
  const [revealed, setRevealed] = useState(() => !experienceStage.supported || experienceStage.shown);
  // The scroll hint shows until you've scrolled a sixteenth of the screen.
  const [scrolled, setScrolled] = useState(() => window.scrollY > window.innerHeight * HINT_SCROLL_FRACTION);

  useEffect(() => onHoveredChange(setHovered), []);
  useEffect(() => {
    if (revealed) return undefined;
    const fallback = window.setTimeout(() => setRevealed(true), REVEAL_FALLBACK_MS);
    const stop = onKitsuneShown((shown) => { if (shown) setRevealed(true); });
    return () => { window.clearTimeout(fallback); stop(); };
  }, [revealed]);

  useEffect(() => {
    const update = () => {
      if (window.scrollY > window.innerHeight * HINT_SCROLL_FRACTION) setScrolled(true);
      const inArchon = window.scrollY < window.innerHeight / 2;
      experienceStage.hover = inArchon;
      experienceStage.scale = 1 - 0.5 * Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);
      setArchon(inArchon);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      // The kitsune keeps its size while it fades out; the scene switches back to the store with
      // the address (App.jsx).
      experienceStage.hover = true;
    };
  }, []);

  return (
    <div className="quests" data-revealed={revealed}>
      <section className="archon-quests" aria-label="Archon Quests">
        <KitsuneCard hovered={hovered} running={archon && revealed} />
      </section>
      <section className="world-quests" aria-label="World Quests">
        <Gallery />
      </section>
      <KitsuneLore />
      {!scrolled && <p className="scroll-hint" aria-hidden="true">↓ scroll</p>}
    </div>
  );
}
