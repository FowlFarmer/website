import { useEffect, useRef, useState } from 'react';
import Gallery from './Gallery.jsx';
import KitsuneCard from './experience/KitsuneCard.jsx';
import KitsuneLore from './experience/KitsuneLore.jsx';
import { onPageScroll, pageScrollY } from './pageScroll.js';
import { MirrorHost } from './sceneMirror.jsx';
import {
  MOBILE_SCENE_QUERY, experienceStage, onHoveredChange, onKitsuneShown, openLore,
} from './experience/experienceStage.js';
import './experience/experience.css';

// The quests page, always over the kitsune: the Lawson scene behind the site shows the kitsune in
// place of its models, on its own backdrop and petals. Archon Quests (the roles) fill the first
// screen, where hovering a tail brings up its role card; World Quests scroll up over the kitsune
// below, where the tails only catch the wind. Over that first screen of scrolling, the kitsune
// shrinks to half size in the bottom-right corner. Arriving, the store fades out and the page waits
// for the kitsune, then both fade in together.
// On phones the kitsune is a fixed band across the bottom of the screen that never shrinks: the
// page scrolls in its own area above him, fading out just before his head (experience.css). There's
// no hover, so a tap on a tail picks its archon quest (CherryBlossomScene.jsx), and the lore opens
// from a button in the corner instead of a tap on him.
// Show the page anyway if the kitsune hasn't come in by then (a slow connection, a failed load).
const REVEAL_FALLBACK_MS = 8000;
// How far down, as a fraction of the screen height, before the scroll hint goes away.
const HINT_SCROLL_FRACTION = 0.0625;

function usePhoneLayout() {
  const [phone, setPhone] = useState(() => window.matchMedia(MOBILE_SCENE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(MOBILE_SCENE_QUERY);
    const update = () => setPhone(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return phone;
}

export default function Quests() {
  const phone = usePhoneLayout();
  const pageRef = useRef(null);
  const [hovered, setHovered] = useState(-1);
  const [archon, setArchon] = useState(true);
  // Hidden until the kitsune starts fading in, unless the scene can't show it (3D off, a phone),
  // or it's taking too long.
  // On phones the kitsune only starts loading on arrival (sparing their data), so the page doesn't
  // wait for him there: he fades into his band when he's ready.
  const [revealed, setRevealed] = useState(() => !experienceStage.supported || experienceStage.shown
    || window.matchMedia(MOBILE_SCENE_QUERY).matches);
  // The scroll hint shows until you've scrolled a sixteenth of the screen.
  const [scrolled, setScrolled] = useState(() => pageScrollY() > window.innerHeight * HINT_SCROLL_FRACTION);

  useEffect(() => onHoveredChange(setHovered), []);
  useEffect(() => {
    if (revealed) return undefined;
    const fallback = window.setTimeout(() => setRevealed(true), REVEAL_FALLBACK_MS);
    const stop = onKitsuneShown((shown) => { if (shown) setRevealed(true); });
    // He may have come in between this page's first render and listening for him.
    if (experienceStage.shown) setRevealed(true);
    return () => { window.clearTimeout(fallback); stop(); };
  }, [revealed]);

  useEffect(() => {
    // Phones scroll the page's own area; elsewhere the page scrolls (pageScroll.js).
    const position = () => (phone
      ? { y: pageRef.current.scrollTop, height: pageRef.current.clientHeight }
      : { y: pageScrollY(), height: window.innerHeight });
    const update = () => {
      const { y, height } = position();
      if (y > height * HINT_SCROLL_FRACTION) setScrolled(true);
      const inArchon = y < height / 2;
      experienceStage.hover = inArchon;
      experienceStage.scale = phone ? 1 : 1 - 0.5 * Math.min(Math.max(y / height, 0), 1);
      setArchon(inArchon);
    };
    update();
    const scroller = pageRef.current;
    if (phone) scroller.addEventListener('scroll', update, { passive: true });
    const stopFollowing = phone ? () => scroller.removeEventListener('scroll', update) : onPageScroll(update);
    return () => {
      stopFollowing();
      // The kitsune keeps its size while it fades out; the scene switches back to the store with
      // the address (App.jsx).
      experienceStage.hover = true;
    };
  }, [phone]);

  // The lore and the scroll hint sit inside the page, fading with it; on phones they go outside
  // its scrolling area instead, which would fade them out at its bottom edge.
  const lore = <KitsuneLore />;
  const hint = !scrolled && <p className="scroll-hint" aria-hidden="true">↓ scroll</p>;
  return (
    <>
      <div ref={pageRef} className="quests" data-revealed={revealed}>
        <MirrorHost active={phone} />
        <section className="archon-quests" aria-label="Archon Quests">
          <KitsuneCard hovered={hovered} running={archon && revealed} sizeToTallest={phone} />
        </section>
        <section className="world-quests" aria-label="World Quests">
          <Gallery />
        </section>
        {!phone && lore}
        {!phone && hint}
      </div>
      {phone && lore}
      {phone && hint}
      {phone && revealed && (
        <button type="button" className="lore-button" aria-label="Inspo" onClick={() => openLore(0, 0)}>?</button>
      )}
    </>
  );
}
