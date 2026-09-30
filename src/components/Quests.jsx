import { useEffect, useMemo, useRef, useState } from 'react';
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
// Phones: the page starts taking the whole screen as the waterloo.careers card appears (its top
// this far down the screen: the foot of the page's usual area), and has fully once the Hack the
// North card after it has come FULL_PAST of the screen's height further up.
const FULL_AT = 0.85;
const FULL_PAST = 0.33;

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
  // The World Quests cards never need this page's state: made once, so the page's own re-renders
  // (the role card, the hints) don't re-render all of them mid-scroll.
  const gallery = useMemo(() => <Gallery />, []);
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
      // Phones: from the waterloo.careers card appearing to a little past the Hack the North card
      // (#Ross marks it; the waterloo.careers card is just before), the page grows to the whole
      // screen, over him, its new foot fading in with the scroll (experience.css --full-foot). The
      // box grows while that foot is still invisible, so nothing jumps.
      const ross = phone && pageRef.current.querySelector('#Ross');
      const waterloo = ross?.previousElementSibling;
      if (waterloo) {
        // In scroll positions: where the waterloo.careers card's top reaches the line (not before
        // the top: it can already peek in there), and where the Hack the North card is FULL_PAST
        // beyond it.
        const page = pageRef.current;
        const line = window.innerHeight * FULL_AT - page.getBoundingClientRect().top;
        const at = (element) => element.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - line;
        const from = Math.max(at(waterloo), 0);
        const to = at(ross) + window.innerHeight * FULL_PAST;
        const foot = Math.min(Math.max((page.scrollTop - from) / Math.max(to - from, 1), 0), 1);
        pageRef.current.style.setProperty('--full-foot', foot.toFixed(3));
        // Set straight on the element (the "tap →" hint hides off it too, experience.css): a
        // re-render of the whole page here, mid-scroll, cost a visible hitch on phones.
        if (foot > 0) pageRef.current.dataset.fullBox = '';
        else delete pageRef.current.dataset.fullBox;
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
          {gallery}
        </section>
        {!phone && lore}
        {!phone && hint}
      </div>
      {phone && lore}
      {phone && hint}
      {phone && revealed && !tapped && <p className="scroll-hint tap-hint" aria-hidden="true">tap →</p>}
      {phone && revealed && (
        <button type="button" className="lore-button" aria-label="Inspo" onClick={() => openLore(0, 0)}>?</button>
      )}
    </>
  );
}
