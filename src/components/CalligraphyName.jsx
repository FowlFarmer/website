import { useEffect, useRef } from 'react';
import { calligraphyGlyphs, calligraphyViewBox } from '../data/calligraphy.js';
import { PIECE_DIRECTIONS, petalRadius, tracePiece } from './petalPieces.js';
import { loadBakedPetals, prepareGlyphPetals, wordFontReady } from './calligraphyPetals.js';
import { createNavFlight } from './nameNavFlight.js';
import { setNavFormHandler } from './navFormation.js';
import { onPageScroll, pageScrollY } from './pageScroll.js';

// Canvas bleed around the banner, in viewBox units, so petals can drift past it.
const BLEED = 110;
const DRAG_PER_SECOND = 2.4;
// After the burst, large petals keep a slow drift that fades out as they get far from home.
const DRIFT_SPEED = 1.1;
const DRIFT_SPEED_RANGE = 1.4;
const DRIFT_FADE_START = 45;
const DRIFT_FADE_END = 90;
// A brief dwell before a character blooms, so sweeping past the banner leaves it alone.
const HOVER_DELAY_MS = 140;
// Scrolling this far from where a character opened closes it again.
const SCROLL_CLOSE_PX = 24;
// On touch the words stay open with no cursor to steer by, so petals clear a wider berth.
const TOUCH_BURST_SPEED = 95;
const TOUCH_BURST_RANGE = 115;
const TOUCH_CLEARING_FORCE = 160;
const OPEN_SECONDS = 0.4;
const RETURN_MS = 720;
// The background wake (petalWind.mjs), at banner scale: viewBox units instead of viewport heights.
const WIND_GAIN = 0.34;
const WIND_MAX_SPEED = 95;
const WIND_RADIUS = 13;
const WIND_LIFETIME = 1.8;
// Hover columns split at the gutters between characters.
const COLUMN_EDGES = [0, 109.5, 209, calligraphyViewBox.width];

const { width: VIEW_WIDTH, height: VIEW_HEIGHT } = calligraphyViewBox;
const NAME_LABEL = `朱加宇, Zhū Jiā Yǔ: ${calligraphyGlyphs
  .map((glyph) => `${glyph.char} ${glyph.meaning.join(', ')}`)
  .join('; ')}`;

const glyphCenter = ({ box }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const morphRadii = new Float32Array(PIECE_DIRECTIONS.length);

function drawPetal(context, petal) {
  if (petal.morph < 1) {
    // Blend the glyph cell's outline into the petal's, direction by direction.
    const morph = petal.morph;
    PIECE_DIRECTIONS.forEach(({ theta }, angle) => {
      morphRadii[angle] = petal.cell[angle] * (1 - morph) + petalRadius(theta - petal.rotation) * petal.drawSize * morph;
    });
    tracePiece(context, petal.x, petal.y, morphRadii);
    context.fillStyle = petal.color;
    context.fill();
    return;
  }

  // A sakura petal: narrow at the stem, broad at the tip with the notch in it.
  const size = petal.drawSize;
  context.save();
  context.translate(petal.x, petal.y);
  context.rotate(petal.rotation);
  context.beginPath();
  context.moveTo(0, size);
  context.bezierCurveTo(size * 0.95, size * 0.3, size * 0.8, -size * 0.82, size * 0.24, -size * 0.9);
  context.lineTo(0, -size * 0.62);
  context.lineTo(-size * 0.24, -size * 0.9);
  context.bezierCurveTo(-size * 0.8, -size * 0.82, -size * 0.95, size * 0.3, 0, size);
  context.fillStyle = petal.color;
  context.fill();
  context.restore();
}

export default function CalligraphyName() {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const glyphRefs = useRef([]);
  const engineRef = useRef(null);
  const hoverTimers = useRef([]);
  // The column under the mouse, tracked even while hover is locked, so a character the
  // pointer is already resting on can still open once the name is back.
  const hoveredColumn = useRef(-1);
  const scheduleBloom = (index) => {
    window.clearTimeout(hoverTimers.current[index]);
    hoverTimers.current[index] = window.setTimeout(() => {
      hoverTimers.current[index] = 0;
      engineRef.current?.bloom(index);
    }, HOVER_DELAY_MS);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !wrapper || !context) return undefined;

    const timers = hoverTimers.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // mode: 'ink' shows the vector, 'bloom' the petals and words, 'return' petals flying home.
    const glyphStates = calligraphyGlyphs.map((glyph) => ({
      glyph, large: null, small: null, mode: 'ink', startedAt: 0,
    }));
    const gusts = [];
    let navFlight = null;
    let previousPointer = null;
    let animationFrame = 0;
    let previousFrameTime = 0;
    let unitScale = 1;

    const setMode = (index, mode) => {
      glyphStates[index].mode = mode;
      glyphRefs.current[index]?.setAttribute('data-mode', mode);
    };

    const draw = () => {
      context.clearRect(-BLEED, -BLEED, VIEW_WIDTH + BLEED * 2, VIEW_HEIGHT + BLEED * 2);
      for (const state of glyphStates) {
        if (state.mode !== 'bloom' && state.mode !== 'return') continue;
        if (!reduceMotion) for (const petal of state.large) drawPetal(context, petal);
        for (const petal of state.small) drawPetal(context, petal);
      }
    };

    const resize = () => {
      // Taken off the page (leaving home), the banner measures 0 wide: keep its last size, which
      // the name's petals flying up into the menu bar are still drawn at.
      if (!wrapper.clientWidth) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      unitScale = wrapper.clientWidth / VIEW_WIDTH;
      const cssWidth = (VIEW_WIDTH + BLEED * 2) * unitScale;
      const cssHeight = (VIEW_HEIGHT + BLEED * 2) * unitScale;
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.left = `${-BLEED * unitScale}px`;
      canvas.style.top = `${-BLEED * unitScale}px`;
      const scale = unitScale * pixelRatio;
      context.setTransform(scale, 0, 0, scale, BLEED * scale, BLEED * scale);
      draw();
    };

    const airAt = (x, y) => {
      let airX = 0;
      let airY = 0;
      for (const gust of gusts) {
        const dx = x - gust.x;
        const dy = y - gust.y;
        const radius = WIND_RADIUS + gust.age * WIND_RADIUS;
        if (dx * dx + dy * dy > 9 * radius * radius) continue;
        const influence = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius) - gust.age * 1.8) * gust.weight;
        // The same edge curl as the background wake, so the gust swirls instead of shoving.
        const curl = ((dx * gust.vy - dy * gust.vx) / radius) * 0.22;
        airX += (gust.vx - (dy / radius) * curl) * influence;
        airY += (gust.vy + (dx / radius) * curl) * influence;
      }
      return [airX, airY];
    };

    const stepLarge = (state, seconds, drag, elapsed) => {
      let moving = false;
      const open = easeOutCubic(Math.min(elapsed / OPEN_SECONDS, 1));
      for (const petal of state.large) {
        const [airX, airY] = gusts.length ? airAt(petal.x, petal.y) : [0, 0];
        const travelled = Math.hypot(petal.x - petal.homeX, petal.y - petal.homeY);
        const drift = Math.min(Math.max((DRIFT_FADE_END - travelled) / (DRIFT_FADE_END - DRIFT_FADE_START), 0), 1);
        // Drag pulls each petal toward the local air speed plus its own fading drift.
        const targetX = airX * petal.windResponse + petal.driftX * drift;
        const targetY = airY * petal.windResponse + petal.driftY * drift;
        petal.velocityX = targetX + (petal.velocityX - targetX) * drag;
        petal.velocityY = targetY + (petal.velocityY - targetY) * drag;
        const { wordBox } = state;
        if (state.touch && petal.x > wordBox.left && petal.x < wordBox.right && petal.y > wordBox.top && petal.y < wordBox.bottom) {
          // Still over the words: keep easing it out through the nearest side.
          const centerX = (wordBox.left + wordBox.right) / 2;
          const centerY = (wordBox.top + wordBox.bottom) / 2;
          const away = Math.atan2(petal.y - centerY, petal.x - centerX);
          petal.velocityX += Math.cos(away) * TOUCH_CLEARING_FORCE * seconds;
          petal.velocityY += Math.sin(away) * TOUCH_CLEARING_FORCE * seconds;
          moving = true;
        }
        petal.spin = (petal.spin + (airX - airY) * petal.windResponse * 0.012 * seconds) * drag;
        petal.x += petal.velocityX * seconds;
        petal.y += petal.velocityY * seconds;
        petal.rotation += petal.spin * seconds;
        // The glyph cell reshapes into the petal while it flies off.
        petal.morph = petal.morphFrom + (1 - petal.morphFrom) * open;
        if (!drift && Math.hypot(petal.velocityX, petal.velocityY) < 0.35 && !gusts.length) {
          // Past its drift range and below a crawl, the petal comes to rest where it floated.
          petal.velocityX = 0;
          petal.velocityY = 0;
          petal.spin = 0;
        } else {
          moving = true;
        }
      }
      return moving || open < 1;
    };

    const stepSmall = (state, elapsed) => {
      let moving = false;
      for (const petal of state.small) {
        const { target, flight } = petal;
        const progress = Math.min(Math.max((elapsed - target.delay) / target.duration, 0), 1);
        if (progress < 1) moving = true;
        const t = easeInOutCubic(progress);
        const u = 1 - t;
        // A quadratic arc: out with the burst, then curving in to land exactly on the letter.
        petal.x = u * u * flight.fromX + 2 * u * t * flight.controlX + t * t * target.x;
        petal.y = u * u * flight.fromY + 2 * u * t * flight.controlY + t * t * target.y;
        petal.rotation = flight.fromRotation + (flight.toRotation - flight.fromRotation) * t;
        petal.drawSize = flight.fromSize + (petal.size - flight.fromSize) * t;
        // Until it takes off the petal stays a piece of the glyph, then reshapes early in flight.
        petal.morph = petal.morphFrom + (1 - petal.morphFrom) * Math.min(progress * 2.5, 1);
      }
      return moving;
    };

    const step = (time) => {
      const seconds = Math.min((time - previousFrameTime) / 1000, 0.05);
      previousFrameTime = time;
      const drag = Math.exp(-DRAG_PER_SECOND * seconds);
      let moving = gusts.length > 0;

      for (let index = gusts.length - 1; index >= 0; index -= 1) {
        const gust = gusts[index];
        gust.age += seconds;
        if (gust.age > WIND_LIFETIME) {
          gusts.splice(index, 1);
          continue;
        }
        const drift = Math.exp(-gust.age * 1.1) * seconds * 0.5;
        gust.x += gust.vx * drift;
        gust.y += gust.vy * drift;
      }

      glyphStates.forEach((state, index) => {
        if (state.mode === 'bloom') {
          const elapsed = (time - state.startedAt) / 1000;
          if (stepLarge(state, seconds, drag, elapsed)) moving = true;
          if (stepSmall(state, elapsed)) moving = true;
        } else if (state.mode === 'return') {
          const progress = Math.min((time - state.startedAt) / RETURN_MS, 1);
          for (const petal of [...state.large, ...state.small]) {
            const eased = easeInOutCubic(Math.min(progress * petal.returnPace, 1));
            petal.x = petal.fromX + (petal.homeX - petal.fromX) * eased;
            petal.y = petal.fromY + (petal.homeY - petal.fromY) * eased;
            petal.rotation = petal.fromRotation + (petal.homeRotation - petal.fromRotation) * eased;
            petal.drawSize = petal.fromSize + (petal.size - petal.fromSize) * eased;
            // Landing, the petal turns back into its exact piece of the glyph.
            const landing = Math.min(Math.max((eased - 0.5) / 0.5, 0), 1);
            petal.morph = petal.fromMorph * (1 - landing * landing * (3 - 2 * landing));
          }
          if (progress >= 1) setMode(index, 'ink');
          else moving = true;
        }
      });

      draw();
      animationFrame = moving ? window.requestAnimationFrame(step) : 0;
    };

    const start = () => {
      if (animationFrame) return;
      previousFrameTime = performance.now();
      animationFrame = window.requestAnimationFrame(step);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse' || reduceMotion) return;
      if (!glyphStates.some((state) => state.mode === 'bloom')) {
        previousPointer = null;
        return;
      }
      const bounds = wrapper.getBoundingClientRect();
      const point = {
        x: (event.clientX - bounds.left) / unitScale,
        y: (event.clientY - bounds.top) / unitScale,
        time: event.timeStamp / 1000,
      };
      const last = previousPointer;
      if (!last || point.time - last.time > 0.15) {
        previousPointer = point;
        return;
      }
      const dt = point.time - last.time;
      if (dt < 1 / 90) return;
      previousPointer = point;
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.4) return;
      const strength = Math.min(WIND_MAX_SPEED, (distance / dt) * WIND_GAIN);
      // Spread the wake along the stroke; strength follows travel, not event frequency.
      const steps = Math.min(4, Math.max(1, Math.ceil(distance / 12)));
      for (let index = 0; index < steps; index += 1) {
        const t = (index + 0.5) / steps;
        gusts.push({
          x: last.x + dx * t,
          y: last.y + dy * t,
          vx: (dx / distance) * strength,
          vy: (dy / distance) * strength,
          weight: Math.min(1, distance / steps / 9),
          age: 0,
        });
      }
      if (gusts.length > 24) gusts.splice(0, gusts.length - 24);
      start();
    };

    // Normally baked (calligraphyPetals.js); prepared live only if the bake is missing or stale.
    const prepare = (state) => {
      if (state.large) return;
      Object.assign(state, prepareGlyphPetals(state.glyph));
    };

    engineRef.current = {
      isBloomed: (index) => glyphStates[index].mode === 'bloom',
      bloom(index, touch = false) {
        const state = glyphStates[index];
        if (state.mode === 'bloom' || state.mode === 'nav' || navFlight?.busy()) return;
        // One meaning at a time: opening a character closes any other.
        glyphStates.forEach((other, otherIndex) => { if (otherIndex !== index) engineRef.current.settle(otherIndex); });
        prepare(state);
        state.touch = touch;
        state.openedAtScroll = pageScrollY();
        if (reduceMotion) {
          for (const petal of state.small) {
            petal.x = petal.target.x;
            petal.y = petal.target.y;
            petal.rotation = petal.target.rotation;
            petal.morph = 1;
          }
          setMode(index, 'bloom');
          draw();
          return;
        }
        const center = glyphCenter(state.glyph);
        const { wordBox } = state;
        // On touch, petals blow away from the words themselves rather than the glyph's middle.
        const burstX = touch ? (wordBox.left + wordBox.right) / 2 : center.x;
        const burstY = touch ? (wordBox.top + wordBox.bottom) / 2 : center.y;
        for (const petal of state.large) {
          const angle = Math.atan2(petal.y - burstY, petal.x - burstX) + (Math.random() - 0.5) * 0.9;
          const speed = touch ? TOUCH_BURST_SPEED + Math.random() * TOUCH_BURST_RANGE : 55 + Math.random() * 120;
          petal.velocityX = Math.cos(angle) * speed;
          petal.velocityY = Math.sin(angle) * speed;
          petal.spin = (Math.random() - 0.5) * 7;
          const driftAngle = angle + (Math.random() - 0.5) * 0.6;
          const driftSpeed = DRIFT_SPEED + Math.random() * DRIFT_SPEED_RANGE;
          petal.driftX = Math.cos(driftAngle) * driftSpeed;
          // A faint downward lean, like the petals falling in the scene behind.
          petal.driftY = Math.sin(driftAngle) * driftSpeed + 0.35;
        }
        for (const petal of state.small) {
          const { target } = petal;
          const outward = Math.atan2(petal.y - center.y, petal.x - center.x) + (Math.random() - 0.5) * 0.8;
          const reach = 16 + Math.random() * 18;
          // Turn the short way round, allowing for the petal's half-turn symmetry of placement.
          let toRotation = target.rotation;
          while (toRotation - petal.rotation > Math.PI) toRotation -= Math.PI * 2;
          while (toRotation - petal.rotation < -Math.PI) toRotation += Math.PI * 2;
          petal.flight = {
            fromX: petal.x,
            fromY: petal.y,
            controlX: (petal.x + target.x) / 2 + Math.cos(outward) * reach,
            controlY: (petal.y + target.y) / 2 + Math.sin(outward) * reach,
            fromRotation: petal.rotation,
            toRotation: toRotation + (Math.random() - 0.5) * 0.2,
            fromSize: petal.drawSize,
          };
        }
        for (const petal of [...state.large, ...state.small]) petal.morphFrom = petal.morph;
        state.startedAt = performance.now();
        setMode(index, 'bloom');
        // Paint the pieces in the same frame the vector hides, so nothing flickers.
        draw();
        start();
      },
      settle(index) {
        const state = glyphStates[index];
        if (state.mode !== 'bloom') return;
        if (reduceMotion) {
          setMode(index, 'ink');
          draw();
          return;
        }
        for (const petal of [...state.large, ...state.small]) {
          petal.fromX = petal.x;
          petal.fromY = petal.y;
          petal.fromRotation = petal.rotation;
          petal.fromSize = petal.drawSize;
          petal.fromMorph = petal.morph;
          petal.returnPace = 1 + Math.random() * 0.35;
          petal.velocityX = 0;
          petal.velocityY = 0;
          petal.spin = 0;
        }
        state.startedAt = performance.now();
        setMode(index, 'return');
        start();
      },
    };

    const quietHover = () => {
      timers.forEach((timer, index) => {
        window.clearTimeout(timer);
        timers[index] = 0;
      });
      glyphStates.forEach((_, index) => engineRef.current.settle(index));
    };
    const handleScroll = () => {
      glyphStates.forEach((state, index) => {
        if (state.mode === 'bloom' && Math.abs(pageScrollY() - state.openedAtScroll) > SCROLL_CLOSE_PX) {
          engineRef.current.settle(index);
        }
      });
    };

    resize();
    // The menu bar flight draws on its own canvas over the whole page. It's made here rather than
    // rendered, so a flight in progress can outlive the page (the name flies up as the quests open).
    let navCanvas = null;
    if (!reduceMotion) {
      navCanvas = document.createElement('canvas');
      navCanvas.className = 'name-nav-petals';
      navCanvas.setAttribute('aria-hidden', 'true');
      // In the app's own layer stack (it's isolated), beside the menu bar, which rises above the
      // petals while they form it so its items can fade in over the landing (App.css).
      (document.getElementById('popup-root') ?? document.body).appendChild(navCanvas);
    }
    navFlight = !navCanvas ? null : createNavFlight({
      glyphs: calligraphyGlyphs,
      wrapper,
      canvas: navCanvas,
      unitScale: () => unitScale,
      setGlyphMode: setMode,
      hoverIdle: () => glyphStates.every((state) => state.mode === 'ink' || state.mode === 'nav'),
      quietHover,
      onBanner: () => {
        const index = hoveredColumn.current;
        if (index >= 0) scheduleBloom(index);
      },
    });
    if (navFlight) setNavFormHandler((done) => navFlight.formNow(done));
    // Load a baked variant before the first hover. Without one, prepare them live when idle,
    // once the words' font is in.
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 200));
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;
    let idleTasks = [];
    let unmounted = false;
    loadBakedPetals().then((baked) => {
      if (unmounted) return;
      if (baked) {
        baked.glyphs.forEach((petals, index) => {
          if (!glyphStates[index].large) Object.assign(glyphStates[index], petals);
        });
        navFlight?.usePieces(baked.nav);
        return;
      }
      wordFontReady().finally(() => {
        if (unmounted) return;
        idleTasks = [
          ...glyphStates.map((state) => idle(() => prepare(state))),
          idle(() => navFlight?.prepare()),
        ];
      });
    });
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    const stopFollowingScroll = onPageScroll(handleScroll);

    return () => {
      setNavFormHandler(null);
      navFlight?.release();
      stopFollowingScroll();
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      unmounted = true;
      idleTasks.forEach((task) => cancelIdle(task));
      observer.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      engineRef.current = null;
      canvas.width = 0;
      canvas.height = 0;
    };
  }, []);

  const handleEnter = (index) => (event) => {
    if (event.pointerType !== 'mouse') return;
    hoveredColumn.current = index;
    scheduleBloom(index);
  };
  const handleLeave = (index) => (event) => {
    if (event.pointerType !== 'mouse') return;
    if (hoveredColumn.current === index) hoveredColumn.current = -1;
    if (hoverTimers.current[index]) {
      window.clearTimeout(hoverTimers.current[index]);
      hoverTimers.current[index] = 0;
      return;
    }
    engineRef.current?.settle(index);
  };
  // Touch has no hover, so a tap toggles the character instead.
  const handleTap = (index) => (event) => {
    const engine = engineRef.current;
    if (event.pointerType === 'mouse' || !engine) return;
    if (engine.isBloomed(index)) engine.settle(index);
    else engine.bloom(index, true);
  };

  return (
    <div ref={wrapperRef} className="calligraphy-name" role="img" aria-label={NAME_LABEL}>
      <canvas ref={canvasRef} className="calligraphy-name-petals" aria-hidden="true" />
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} aria-hidden="true">
        {calligraphyGlyphs.map((glyph, index) => (
          <g
            key={glyph.id}
            ref={(node) => { glyphRefs.current[index] = node; }}
            className="calligraphy-glyph"
            data-mode="ink"
          >
            <g className="calligraphy-ink">
              {glyph.paths.map((d) => <path key={d.slice(0, 24)} d={d} />)}
            </g>
            <rect
              className="calligraphy-hit"
              x={COLUMN_EDGES[index]}
              y="0"
              width={COLUMN_EDGES[index + 1] - COLUMN_EDGES[index]}
              height={VIEW_HEIGHT}
              onPointerEnter={handleEnter(index)}
              onPointerLeave={handleLeave(index)}
              onPointerUp={handleTap(index)}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
