import { useEffect, useRef, useState } from 'react';
import Gallery from './Gallery.jsx';
import KitsuneCard from './experience/KitsuneCard.jsx';
import KitsuneLore from './experience/KitsuneLore.jsx';
import { onPageScroll, pageScrollY } from './pageScroll.js';
import { MirrorHost } from './sceneMirror.jsx';
import {
  MOBILE_SCENE_QUERY, experienceStage, onHoveredChange, onKitsuneShown, onKitsuneTap, openLore,
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
// Scrolled further down than this (px), a tap on him goes back up to the role card.
const TAP_SCROLL_TOP_PX = 40;
// Phones: the page starts taking the whole screen when the Hack the North card's top is this far
// down the screen (the foot of the page's usual area), and has fully by FULL_SPAN of the screen's
// height more scrolling.
const FULL_AT = 0.85;
const FULL_SPAN = 0.35;

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
  // Phones: a tap on him moves the role card on, or, scrolled down the page, goes back up to it.
  // The "tap →" hint beside the scroll hint shows until the first.
  const [skips, setSkips] = useState(0);
  // Phones: whether the page has started taking the whole screen (below).
  const [full, setFull] = useState(false);
  const [tapped, setTapped] = useState(false);
  useEffect(() => onKitsuneTap(() => {
    setTapped(true);
    const page = pageRef.current;
    if (page && page.scrollTop > TAP_SCROLL_TOP_PX) page.scrollTo({ top: 0, behavior: 'smooth' });
    else setSkips((count) => count + 1);
  }), []);
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
      // Phones: as the Hack the North card comes into view, the page grows to the whole screen,
      // over him, its new foot fading in with the scroll (experience.css --full-foot). The box
      // grows while that foot is still invisible, so nothing jumps.
      const ross = phone && pageRef.current.querySelector('#Ross');
      if (ross) {
        const foot = Math.min(Math.max((window.innerHeight * FULL_AT - ross.getBoundingClientRect().top) / (window.innerHeight * FULL_SPAN), 0), 1);
        pageRef.current.style.setProperty('--full-foot', foot.toFixed(3));
        if (foot > 0) pageRef.current.dataset.fullBox = '';
        else delete pageRef.current.dataset.fullBox;
        setFull(foot > 0);
      }
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
      <div ref={pageRef} className="quests" data-revealed={revealed} >
        <MirrorHost active={phone} />
        <section className="archon-quests" aria-label="Archon Quests">
          <KitsuneCard hovered={hovered} running={archon && revealed} sizeToTallest={phone} skips={skips} />
        </section>
        <section className="world-quests" aria-label="World Quests">
          <Gallery />
        </section>
        {!phone && lore}
        {!phone && hint}
      </div>
      {phone && lore}
      {phone && hint}
      {phone && revealed && !tapped && !full && <p className="scroll-hint tap-hint" aria-hidden="true">tap →</p>}
      {phone && revealed && (
        <button type="button" className="lore-button" aria-label="Inspo" onClick={() => openLore(0, 0)}>?</button>
      )}
    </>
  );
}
