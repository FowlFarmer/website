import { useLayoutEffect, useRef, useState } from 'react';
import { CyclingImage } from '../cards/workExperience.jsx';
import {
  INTRO_SPAN, RoleDetails, clamp01, roleProgress, scrollToProgress, smoothstep, storyState, useSectionProgress,
} from './scrollStory.jsx';

// Concept 1: a brush-stroke branch grows as you scroll; each role is a bud that blooms when
// the branch reaches it, and its card opens beside the branch.
const BRANCH = 'M 150 0 C 90 120, 215 210, 160 330 S 80 540, 158 650 S 235 850, 170 1000';
// Where along the branch each role's twig sprouts, as fractions of its length.
const NODES = [0.17, 0.4, 0.63, 0.86];
const TWIG_REACH = 70;
const BLOSSOM_SCALE = 1.7;

export default function BranchStory({ roles }) {
  const sectionRef = useRef(null);
  const branchRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  const progress = useSectionProgress(sectionRef);
  const { intro, active, local } = storyState(progress, roles.length);

  useLayoutEffect(() => {
    const branch = branchRef.current;
    const length = branch.getTotalLength();
    setGeometry({
      length,
      nodes: NODES.map((fraction, index) => {
        const point = branch.getPointAtLength(length * fraction);
        const side = index % 2 ? -1 : 1;
        return { x: point.x, y: point.y, tipX: point.x + side * TWIG_REACH, tipY: point.y - 26, side };
      }),
    });
  }, []);

  // The tip reaches each bud just after that role's stretch of scroll begins.
  const span = (1 - INTRO_SPAN) / roles.length;
  const stops = [[INTRO_SPAN, 0.02], ...NODES.map((node, index) => [INTRO_SPAN + (index + 0.15) * span, node]), [1, 1]];
  let growth = 0;
  for (let index = 1; index < stops.length; index += 1) {
    const [p0, g0] = stops[index - 1];
    const [p1, g1] = stops[index];
    if (progress <= p1) {
      growth = g0 + (g1 - g0) * clamp01((progress - p0) / (p1 - p0));
      break;
    }
  }

  const cardIn = active === 0 ? smoothstep(0.02, 0.2, local) : smoothstep(0, 0.18, local);
  const cardOut = active === roles.length - 1 ? 0 : smoothstep(0.82, 1, local);
  const cardOpacity = intro > 0 ? 0 : cardIn * (1 - cardOut);
  const role = roles[active];

  return (
    <section ref={sectionRef} className="story-section" style={{ height: `${(roles.length + 1) * 110}vh` }}>
      <div className="story-stage branch-stage">
        <svg className="branch-svg" viewBox="0 0 300 1000" preserveAspectRatio="xMidYMid meet">
          <path d={BRANCH} className="branch-ghost" />
          <path
            ref={branchRef}
            d={BRANCH}
            className="branch-ink"
            style={geometry ? { strokeDasharray: geometry.length, strokeDashoffset: geometry.length * (1 - growth) } : undefined}
          />
          {geometry?.nodes.map((node, index) => {
            const reached = smoothstep(NODES[index] - 0.005, NODES[index] + 0.045, growth);
            // Fully open in the overview so every logo shows at once; a bud until the branch arrives.
            const emphasis = index === roles.length - 1 ? 1.22 : 1;
            const open = Math.max(intro * emphasis, 0.32 + 0.68 * reached);
            const twig = `M ${node.x} ${node.y} Q ${node.x + node.side * 30} ${node.y - 4}, ${node.tipX} ${node.tipY}`;
            return (
              <g key={roles[index].id}>
                <path d={twig} className="branch-ghost branch-twig" />
                <path d={twig} className="branch-ink branch-twig" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1 - reached }} />
                <g
                  className="branch-blossom"
                  data-active={intro === 0 && index === active}
                  transform={`translate(${node.tipX} ${node.tipY}) scale(${open * BLOSSOM_SCALE})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${roles[index].company}, ${roles[index].year}`}
                  onClick={() => scrollToProgress(sectionRef.current, roleProgress(index, roles.length))}
                >
                  {[0, 1, 2, 3, 4].map((petal) => (
                    <ellipse key={petal} cx="0" cy="-15" rx="10" ry="15" transform={`rotate(${petal * 72})`} className="branch-petal" />
                  ))}
                  <clipPath id={`branch-logo-${roles[index].id}`}>
                    <circle r="12" />
                  </clipPath>
                  <circle r="13" className="branch-logo-ring" />
                  <image href={roles[index].logo} x="-12" y="-12" width="24" height="24" clipPath={`url(#branch-logo-${roles[index].id})`} />
                </g>
                <text
                  x={node.tipX}
                  y={node.tipY + 50}
                  textAnchor="middle"
                  className="branch-year"
                  style={{ opacity: Math.max(intro, reached) }}
                >
                  {roles[index].year}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="branch-copy">
          <div className="branch-overview" style={{ opacity: intro }}>
            <h2>Experience</h2>
            <p>{roles.map((entry) => entry.company).join(' · ')}</p>
            <p className="story-hint">Scroll to grow the branch</p>
          </div>
          <article
            className="story-card glass-effect"
            style={{ opacity: cardOpacity, transform: `translateY(${(1 - cardOpacity) * 24}px)` }}
          >
            <RoleDetails role={role} />
            <div className="story-media">
              <CyclingImage key={role.id} images={role.images} alt={role.company} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
