import { useRef } from 'react';
import { CyclingImage } from '../cards/workExperience.jsx';
import { LogoRail, RoleDetails, clamp01, smoothstep, storyState, useSectionProgress } from './scrollStory.jsx';

// Concept 3: wooden ema plaques hang from a shrine rope, logo side out. Scrolling walks along
// the rope; the plaque in front swings forward and flips to show its role, shedding petals.
const SPACING = 300;
const GUST_PETALS = 12;

const gustPetals = Array.from({ length: GUST_PETALS }, (_, index) => {
  const angle = (index / GUST_PETALS) * Math.PI * 2 + Math.random() * 0.5;
  return { x: Math.cos(angle), y: Math.sin(angle) * 0.8 - 0.2, reach: 120 + Math.random() * 110, turn: Math.random() * 360 };
});

export default function EmaStory({ roles }) {
  const sectionRef = useRef(null);
  const progress = useSectionProgress(sectionRef);
  const { intro, active, local } = storyState(progress, roles.length);
  const last = roles.length - 1;

  // Which plaque is centred: the middle of the row in the overview, then each role in turn.
  const walking = active + (active < last ? smoothstep(0.78, 1, local) : 0);
  const focus = (last / 2) * intro + walking * (1 - intro);
  // The overview zooms out until all four plaques fit, so the latest role is never off-screen.
  const overviewZoom = Math.min(0.72, (window.innerWidth - 32) / (last * SPACING + 260));
  const zoom = 1 - (1 - overviewZoom) * intro;
  const trackWidth = last * SPACING;

  return (
    <section ref={sectionRef} className="story-section" style={{ height: `${(roles.length + 1) * 110}vh` }}>
      <div className="story-stage ema-stage">
        <div className="ema-overview" style={{ opacity: intro }}>
          <h2>Experience</h2>
          <p className="story-hint">Scroll along the rope</p>
        </div>
        <div
          className="ema-track"
          style={{ transform: `translateX(${-focus * SPACING}px) scale(${zoom})`, transformOrigin: `${focus * SPACING}px 40%` }}
        >
          <svg className="ema-rope" viewBox={`-200 0 ${trackWidth + 400} 80`} style={{ width: trackWidth + 400, left: -200 }}>
            <path
              d={roles.map((_, index) => `${index ? 'Q' : 'M'} ${index ? index * SPACING - SPACING / 2 : -200} ${index ? 46 : 10} ${index * SPACING} 20`).join(' ') + ` Q ${trackWidth + 100} 46 ${trackWidth + 200} 10`}
            />
          </svg>
          {roles.map((role, index) => {
            const inFocus = clamp01(1 - Math.abs(focus - index));
            const flipIn = index === active && !intro ? smoothstep(0.08, 0.3, local) : 0;
            const flipOut = index === active && !intro && index < last ? smoothstep(0.68, 0.86, local) : 0;
            const flip = flipIn * (1 - flipOut);
            // Petals burst off the plaque while it turns over, either way.
            const gust = Math.sin(Math.PI * flipIn) + Math.sin(Math.PI * flipOut);
            const sway = Math.sin(progress * 55 + index * 1.7) * (1.2 + gust * 4);
            const emphasis = index === last ? intro * 0.12 : 0;
            const scale = 0.84 + 0.3 * inFocus * (1 - intro) + emphasis;
            return (
              <div
                key={role.id}
                className="ema-hanger"
                style={{ left: index * SPACING, transform: `translateX(-50%) rotate(${sway}deg) scale(${scale})`, zIndex: Math.round(inFocus * 10) }}
              >
                <div className="ema-string" />
                <div className="ema-gust" aria-hidden="true">
                  {gustPetals.map((petal, petalIndex) => (
                    <span
                      key={petalIndex}
                      style={{
                        opacity: Math.min(gust, 1),
                        transform: `translate(${petal.x * petal.reach * gust}px, ${petal.y * petal.reach * gust}px) rotate(${petal.turn + gust * 90}deg)`,
                      }}
                    />
                  ))}
                </div>
                <div
                  className="ema-plaque"
                  data-lit={index === last && intro > 0}
                  style={{ transform: `rotateY(${flip * 180}deg)` }}
                >
                  <div className="ema-face ema-front">
                    <span className="ema-hole" />
                    <img src={role.logo} alt="" className="ema-logo" />
                    <strong>{role.company}</strong>
                    <span className="ema-year">{role.year}</span>
                  </div>
                  <div className="ema-face ema-back" aria-hidden={flip < 0.5}>
                    <span className="ema-hole" />
                    <RoleDetails role={role} />
                    <div className="story-media ema-media">
                      <CyclingImage images={role.images} alt={role.company} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <LogoRail roles={roles} active={active} intro={intro} sectionRef={sectionRef} className="ema-rail" />
      </div>
    </section>
  );
}
