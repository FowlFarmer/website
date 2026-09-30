import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CyclingImage, LogoBadge } from '../cards/workExperience.jsx';
import QuestTag from './QuestIcons.jsx';
import { REGION_ICONS } from './RegionIcons.jsx';
import { kitsuneTails } from '../../data/experience.js';
import { experienceStage } from './experienceStage.js';
import './experience.css';

// How long each role's card stays up before moving on to the next tail.
const CYCLE_MS = 7000;
const FIRST = kitsuneTails.findIndex((role) => role.id === 'tesla');

// Phones: the photos two at a time side by side (a lone photo fills both halves), in order, each
// pair taking over from the last as CyclingImage's single photos do.
function PairedImages({ images, alt }) {
  const [first, setFirst] = useState(0);
  const count = images.length;
  useEffect(() => {
    if (count <= 2) return undefined;
    const id = setInterval(() => setFirst((index) => (index + 2) % count), 2800);
    return () => clearInterval(id);
  }, [count]);
  const shown = count === 1 ? [0] : [first, (first + 1) % count];
  // A photo fading out stays on the side it was shown on.
  const sides = useRef([]);
  shown.forEach((index, slot) => { sides.current[index] = count === 1 ? 'both' : slot ? 'right' : 'left'; });
  return (
    <div className="kitsune-role-pair">
      {images.map((src, index) => {
        const slot = shown.indexOf(index);
        return (
          <img
            key={src}
            src={src}
            alt={`${alt} ${index + 1}`}
            loading="lazy"
            decoding="async"
            data-slot={sides.current[index] ?? 'left'}
            style={{ opacity: slot >= 0 ? 1 : 0 }}
          />
        );
      })}
    </div>
  );
}

// One role's card content. As a `sizer` (an invisible stand-in, for sizing) its photos are an
// empty box of the same shape, so nothing loads. `paired` (phones): its photos two at a time.
function RoleContent({ role, sizer = false, paired = false }) {
  return (
    <>
      <QuestTag type="archon" icon={REGION_ICONS[role.region]} name={role.quest} spacer={false} />
      <div className="kitsune-role-text">
        {role.dateRange && <p className="kitsune-role-date">{role.dateRange}</p>}
        {role.company && (
          <div className="kitsune-role-company">
            {role.logo && <LogoBadge logo={role.logo} company={role.company} />}
            <h2>{role.company}</h2>
          </div>
        )}
        {role.headline && <p className="kitsune-role-headline">{role.headline}</p>}
        {role.points && (
          <ul className="kitsune-role-points">
            {role.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        )}
        {role.location && <p className="kitsune-role-location">{role.location}</p>}
      </div>
      {role.images?.length > 0 && (
        <div className="kitsune-role-media">
          {sizer
            ? <div style={{ width: '100%', aspectRatio: paired ? '8 / 3' : '4 / 3' }} />
            : paired
              ? <PairedImages images={role.images} alt={role.company ?? ''} />
              : <CyclingImage images={role.images} alt={role.company ?? ''} />}
        </div>
      )}
    </>
  );
}

// The role card beside the kitsune. It starts on Tesla and moves to the next tail every 7 seconds.
// `hovered` (the tail under the pointer, -1 for none) shows its role and holds it; 7 seconds after
// the pointer leaves, the cycle carries on from there. While not `running` (scrolled away) it holds
// the card it's on, so nothing swaps as it scrolls out of view. The tail it's showing lights up and
// fades out over those 7 seconds, standing in for a progress bar (experienceStage.cycleTail).
// `sizeToTallest` (phones): every role's card sits invisibly in the same place, so the card area
// is always as tall as the tallest and the page below it doesn't jump as the cards change.
export default function KitsuneCard({ hovered = -1, running = true, sizeToTallest = false }) {
  const [active, setActive] = useState(FIRST);
  const holding = hovered >= 0;

  useEffect(() => {
    if (!running) {
      experienceStage.cycleTail = -1;
      return undefined;
    }
    if (holding) {
      setActive(hovered);
      experienceStage.cycleTail = -1;
      return undefined;
    }
    Object.assign(experienceStage, { cycleTail: active, cycleSince: performance.now(), cycleMs: CYCLE_MS });
    const timer = setTimeout(() => setActive((index) => (index + 1) % kitsuneTails.length), CYCLE_MS);
    return () => clearTimeout(timer);
  }, [running, holding, hovered, active]);
  useEffect(() => () => { experienceStage.cycleTail = -1; }, []);

  const role = kitsuneTails[active];
  return (
    <div className="kitsune-role-slot">
      <AnimatePresence mode="wait">
        <motion.article
          key={role.id}
          className="kitsune-role"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <RoleContent role={role} paired={sizeToTallest} />
        </motion.article>
      </AnimatePresence>
      {sizeToTallest && kitsuneTails.map((each) => (
        <article key={each.id} className="kitsune-role kitsune-role-sizer" aria-hidden="true">
          <RoleContent role={each} sizer paired />
        </article>
      ))}
    </div>
  );
}
