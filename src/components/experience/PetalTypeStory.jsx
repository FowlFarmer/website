import { useEffect, useMemo, useRef, useState } from 'react';
import { CyclingImage } from '../cards/workExperience.jsx';
import { INTRO_SPAN, LogoRail, RoleDetails, storyState, useSectionProgress } from './scrollStory.jsx';

// Concept 2: one swarm of petals spells every company in turn. The overview spells the title
// over a rail of every logo; each role then gets its name spelled large, scrubbed by scroll.
const FONT = "'Inter Variable', sans-serif";
const PETALS_PER_MEGAPIXEL = 1500;
const SAMPLE_STEP = 2;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function inkPoints(width, height, drawText) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawText(context);
  const { data } = context.getImageData(0, 0, width, height);
  const points = [];
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (data[(y * width + x) * 4 + 3] > 128) points.push([x + Math.random() * SAMPLE_STEP, y + Math.random() * SAMPLE_STEP]);
    }
  }
  return points;
}

// Exactly `count` points from the ink, sorted left to right so every layout pairs up in order.
function pick(points, count) {
  const chosen = [];
  for (let index = 0; index < count; index += 1) chosen.push(points[Math.floor(Math.random() * points.length)]);
  return chosen.sort((a, b) => a[0] - b[0]);
}

function buildLayouts(roles, width, height, count) {
  const measure = document.createElement('canvas').getContext('2d');
  // The overview spells the section's title; the logo rail beneath already shows who.
  const overview = inkPoints(width, height, (context) => {
    measure.font = `800 100px ${FONT}`;
    const size = Math.min(130, ((width * 0.8) / measure.measureText('Experience').width) * 100);
    context.font = `800 ${size}px ${FONT}`;
    context.fillText('Experience', width / 2, height * 0.4);
  });
  const names = roles.map((role) => inkPoints(width, height, (context) => {
    measure.font = `800 100px ${FONT}`;
    const size = Math.min(150, ((width * 0.84) / measure.measureText(role.company).width) * 100);
    context.font = `800 ${size}px ${FONT}`;
    context.fillText(role.company, width / 2, height * 0.3);
  }));
  return [overview, ...names].map((points) => pick(points, count));
}

// Hold each layout for most of its stretch of scroll; scrub between holds.
function keyframes(count) {
  const span = (1 - INTRO_SPAN) / count;
  const frames = [[0, 0], [INTRO_SPAN * 0.55, 0]];
  for (let index = 0; index < count; index += 1) {
    const start = INTRO_SPAN + index * span;
    frames.push([start + span * 0.22, index + 1], [index === count - 1 ? 1 : start + span * 0.78, index + 1]);
  }
  return frames;
}

function segmentAt(frames, progress) {
  for (let index = 1; index < frames.length; index += 1) {
    const [p0, from] = frames[index - 1];
    const [p1, to] = frames[index];
    if (progress <= p1) return { from, to, t: from === to ? 0 : easeInOutCubic((progress - p0) / (p1 - p0)) };
  }
  const last = frames[frames.length - 1][1];
  return { from: last, to: last, t: 0 };
}

export default function PetalTypeStory({ roles }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const swarmRef = useRef(null);
  const [size, setSize] = useState(null);
  const progress = useSectionProgress(sectionRef);
  const { intro, active } = storyState(progress, roles.length);
  const frames = useMemo(() => keyframes(roles.length), [roles.length]);
  const segment = segmentAt(frames, progress);

  useEffect(() => {
    const stage = stageRef.current;
    const observer = new ResizeObserver(() => setSize({ width: stage.clientWidth, height: stage.clientHeight }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;
    const count = Math.round((size.width * size.height * PETALS_PER_MEGAPIXEL) / 1e6);
    swarmRef.current = {
      layouts: buildLayouts(roles, size.width, size.height, count),
      petals: Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        return {
          swirlX: Math.cos(angle), swirlY: Math.sin(angle), reach: 0.5 + Math.random(),
          rotation: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6, size: 1.8 + Math.random() * 1.6,
        };
      }),
    };
    const canvas = canvasRef.current;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    canvas.getContext('2d').setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }, [roles, size]);

  useEffect(() => {
    const swarm = swarmRef.current;
    if (!swarm || !size) return;
    const context = canvasRef.current.getContext('2d');
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = '#fff';
    const from = swarm.layouts[segment.from];
    const to = swarm.layouts[segment.to];
    // Mid-transition the petals loop out on their own swirl before landing in the next word.
    const swirl = Math.sin(Math.PI * segment.t) * Math.min(size.width, size.height) * 0.2;
    swarm.petals.forEach((petal, index) => {
      const x = from[index][0] + (to[index][0] - from[index][0]) * segment.t + petal.swirlX * petal.reach * swirl;
      const y = from[index][1] + (to[index][1] - from[index][1]) * segment.t + petal.swirlY * petal.reach * swirl;
      const s = petal.size;
      context.save();
      context.translate(x, y);
      context.rotate(petal.rotation + petal.spin * segment.t);
      context.beginPath();
      context.moveTo(0, s);
      context.bezierCurveTo(s * 0.95, s * 0.3, s * 0.8, -s * 0.82, s * 0.24, -s * 0.9);
      context.lineTo(0, -s * 0.62);
      context.lineTo(-s * 0.24, -s * 0.9);
      context.bezierCurveTo(-s * 0.8, -s * 0.82, -s * 0.95, s * 0.3, 0, s);
      context.fill();
      context.restore();
    });
  }, [segment.from, segment.to, segment.t, size]);

  // A role's details show while its name is spelled, and cross over during a transition.
  const presence = (layout) => (segment.from === layout ? 1 - segment.t : 0) + (segment.to === layout && segment.to !== segment.from ? segment.t : 0);

  return (
    <section ref={sectionRef} className="story-section" style={{ height: `${(roles.length + 1) * 110}vh` }}>
      <div ref={stageRef} className="story-stage type-stage">
        <canvas ref={canvasRef} className="type-canvas" aria-hidden="true" />
        <p className="story-hint type-hint" style={{ opacity: presence(0) }}>Scroll through the roles</p>
        {roles.map((role, index) => {
          const shown = presence(index + 1);
          return (
            <article
              key={role.id}
              className="type-details"
              aria-hidden={shown < 0.5}
              style={{ opacity: shown, transform: `translate(-50%, ${(1 - shown) * 18}px)`, visibility: shown ? 'visible' : 'hidden' }}
            >
              <RoleDetails role={role} />
              <div className="story-media type-media">
                <CyclingImage images={role.images} alt={role.company} />
              </div>
            </article>
          );
        })}
        <LogoRail roles={roles} active={intro > 0 ? -1 : active} intro={0} sectionRef={sectionRef} className="type-rail" />
      </div>
    </section>
  );
}
