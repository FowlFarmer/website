import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calligraphyGlyphs, calligraphyViewBox } from '../data/calligraphy.js';
import {
  PIECE_DIRECTIONS, glyphInterior, glyphMask, petalRadius, tessellate, tracePiece,
} from './petalPieces.js';
import { createNavFlight } from './nameNavFlight.js';

const PETAL_COLORS = ['#fffefe', '#fffaf8', '#ffffff', '#f7f5f4'];
// Large petals blow away and ride the wind; they sit on a jittered grid over the glyph.
const LARGE_PETAL = { spacing: 3.7, size: 3.1, sizeRange: 1.9 };
// Small petals hide inside the glyph too, then fly on fixed paths to spell its meaning.
const SMALL_PETAL = { size: 1.2, sizeRange: 0.35 };
// Words are split into syllables; a larger gap between groups separates the words.
const WORD_FONT_SIZE = 21;
const WORD_LINE_HEIGHT = 21;
const WORD_GAP = 9;
const WORD_CENTER_Y = 97;
// Words hang from the glyph's left edge; 加's short words sit better nudged right and up.
const WORD_OFFSET = { jia: { x: 14, y: -8 } };
const WORD_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
// Letter sampling: rendered this many pixels per viewBox unit, petals kept this far inside
// a stroke's edge and at least this far from each other.
const LETTER_DENSITY = 6;
const LETTER_INSET = 0.5;
const LETTER_SPACING = 1.3;
const LETTER_GRAIN_RADIUS = 2.2;
// The glyph is cut into one cell per petal (a power diagram: large petals claim larger cells),
// rasterised this many pixels per unit, so it can morph into the petal and back seamlessly.
const PIECE_DENSITY = 6;
const PIECE_OVERLAP = 0.22;
const LARGE_CELL_RADIUS = 1.9;
const SMALL_CELL_RADIUS = 0.8;
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
const TOUCH_WORD_MARGIN = 10;
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
const randomColor = () => PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];

function wordLines(glyph) {
  const lines = [];
  let y = 0;
  glyph.syllables.forEach((word, wordIndex) => {
    if (wordIndex) y += WORD_GAP;
    for (const text of word) {
      lines.push({ text, y });
      y += WORD_LINE_HEIGHT;
    }
  });
  const shift = WORD_CENTER_Y + (WORD_OFFSET[glyph.id]?.y || 0) - (y - WORD_LINE_HEIGHT) / 2;
  return lines.map((line) => ({ ...line, y: line.y + shift }));
}

function makePetal(x, y, size, rotation = Math.random() * Math.PI * 2) {
  return {
    homeX: x,
    homeY: y,
    homeRotation: rotation,
    x,
    y,
    rotation,
    size,
    drawSize: size,
    velocityX: 0,
    velocityY: 0,
    spin: 0,
    morph: 0,
    color: randomColor(),
  };
}

// Evenly spaced petal spots inside the letter strokes, each turned to run along its stroke.
function sampleLetters(lines, leftX) {
  const regionWidth = 130;
  const top = lines[0].y - WORD_FONT_SIZE;
  const bottom = lines[lines.length - 1].y + WORD_FONT_SIZE;
  const left = leftX - 4;
  const width = Math.ceil(regionWidth * LETTER_DENSITY);
  const height = Math.ceil((bottom - top) * LETTER_DENSITY);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.scale(LETTER_DENSITY, LETTER_DENSITY);
  context.translate(-left, -top);
  context.font = `700 ${WORD_FONT_SIZE}px ${WORD_FONT}`;
  context.letterSpacing = `${WORD_FONT_SIZE * 0.05}px`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  for (const line of lines) context.fillText(line.text, leftX, line.y);
  const { data } = context.getImageData(0, 0, width, height);

  const alpha = new Float32Array(width * height);
  const distance = new Float32Array(width * height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[index * 4 + 3] / 255;
    distance[index] = alpha[index] > 0.5 ? 1e6 : 0;
  }
  // Two-pass 3-4 chamfer distance to the nearest unlit pixel.
  const relax = (index, neighbour, cost) => {
    if (distance[neighbour] + cost < distance[index]) distance[index] = distance[neighbour] + cost;
  };
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!distance[index]) continue;
      relax(index, index - 1, 3);
      relax(index, index - width, 3);
      relax(index, index - width - 1, 4);
      relax(index, index - width + 1, 4);
    }
  }
  for (let y = height - 2; y > 0; y -= 1) {
    for (let x = width - 2; x > 0; x -= 1) {
      const index = y * width + x;
      if (!distance[index]) continue;
      relax(index, index + 1, 3);
      relax(index, index + width, 3);
      relax(index, index + width + 1, 4);
      relax(index, index + width - 1, 4);
    }
  }

  // Poisson-disk dart throwing over the stroke interiors gives even, gap-free coverage.
  const inset = LETTER_INSET * LETTER_DENSITY * 3;
  const candidates = [];
  for (let index = 0; index < distance.length; index += 1) if (distance[index] >= inset) candidates.push(index);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }
  const cell = LETTER_SPACING / Math.SQRT2;
  const buckets = new Map();
  const points = [];
  for (const index of candidates) {
    const x = (index % width) / LETTER_DENSITY;
    const y = Math.floor(index / width) / LETTER_DENSITY;
    const cellX = Math.floor(x / cell);
    const cellY = Math.floor(y / cell);
    let open = true;
    for (let dy = -2; dy <= 2 && open; dy += 1) {
      for (let dx = -2; dx <= 2 && open; dx += 1) {
        const other = buckets.get(`${cellX + dx},${cellY + dy}`);
        if (other && Math.hypot(other.x - x, other.y - y) < LETTER_SPACING) open = false;
      }
    }
    if (!open) continue;
    const point = { x, y, pixel: index };
    buckets.set(`${cellX},${cellY}`, point);
    points.push(point);
  }

  // The structure tensor of the edge gradients points across the stroke; petals lie along it.
  const grain = Math.round(LETTER_GRAIN_RADIUS * LETTER_DENSITY);
  return points.map(({ x, y, pixel }) => {
    const pixelX = pixel % width;
    const pixelY = Math.floor(pixel / width);
    let xx = 0;
    let yy = 0;
    let xy = 0;
    for (let sy = Math.max(1, pixelY - grain); sy <= Math.min(height - 2, pixelY + grain); sy += 1) {
      for (let sx = Math.max(1, pixelX - grain); sx <= Math.min(width - 2, pixelX + grain); sx += 1) {
        const index = sy * width + sx;
        const gx = alpha[index + 1] - alpha[index - 1];
        const gy = alpha[index + width] - alpha[index - width];
        xx += gx * gx;
        yy += gy * gy;
        xy += gx * gy;
      }
    }
    // The petal's long axis is its local y, so rotating by the across-stroke angle lays it along the stroke.
    const acrossStroke = 0.5 * Math.atan2(2 * xy, xx - yy);
    return {
      x: x + left,
      y: y + top,
      rotation: acrossStroke + (Math.random() - 0.5) * 0.35 + (Math.random() < 0.5 ? Math.PI : 0),
    };
  });
}

// Small petals start where their letter "is" in the glyph, so flight paths rarely cross.
function sampleSmallPetals(glyph, lines, large) {
  const targets = sampleLetters(lines, glyph.box.x + (WORD_OFFSET[glyph.id]?.x || 0));
  const homes = glyphInterior(glyph, 1);
  // Homes too close to a large petal's seed would get no cell of their own to start from.
  const clearance = (LARGE_CELL_RADIUS - SMALL_CELL_RADIUS + 0.3) ** 2;
  const used = Uint8Array.from(homes, (home) => large.some((petal) => (petal.homeX - home.x) ** 2 + (petal.homeY - home.y) ** 2 < clearance));
  const minX = Math.min(...targets.map((target) => target.x));
  const maxX = Math.max(...targets.map((target) => target.x));
  const minY = Math.min(...targets.map((target) => target.y));
  const maxY = Math.max(...targets.map((target) => target.y));
  const { box } = glyph;
  const order = targets.map((_, index) => index).sort(() => Math.random() - 0.5);
  const lineTops = lines.map((line) => line.y);
  const petals = [];
  for (const targetIndex of order) {
    const target = targets[targetIndex];
    const mappedX = box.x + ((target.x - minX) / Math.max(maxX - minX, 1)) * box.width;
    const mappedY = box.y + ((target.y - minY) / Math.max(maxY - minY, 1)) * box.height;
    let best = -1;
    let bestDistance = Infinity;
    for (let index = 0; index < homes.length; index += 1) {
      if (used[index]) continue;
      const distance = (homes[index].x - mappedX) ** 2 + (homes[index].y - mappedY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    if (best < 0) break;
    used[best] = 1;
    const petal = makePetal(homes[best].x, homes[best].y, SMALL_PETAL.size + Math.random() * SMALL_PETAL.sizeRange);
    // Letters arrive line by line, left to right, as if written.
    const line = lineTops.reduce((closest, y, index) => (Math.abs(y - target.y) < Math.abs(lineTops[closest] - target.y) ? index : closest), 0);
    petal.target = {
      x: target.x,
      y: target.y,
      rotation: target.rotation,
      delay: 0.12 + line * 0.1 + ((target.x - minX) / Math.max(maxX - minX, 1)) * 0.4 + Math.random() * 0.08,
      duration: 0.85 + Math.random() * 0.3,
    };
    petals.push(petal);
  }
  return petals;
}

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
  const navCanvasRef = useRef(null);
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

    const prepare = (state) => {
      if (state.large) return;
      state.large = glyphInterior(state.glyph, LARGE_PETAL.spacing).map((point) => ({
        ...makePetal(point.x, point.y, LARGE_PETAL.size + Math.random() * LARGE_PETAL.sizeRange),
        windResponse: 0.6 + Math.random() * 0.8,
      }));
      state.small = sampleSmallPetals(state.glyph, wordLines(state.glyph), state.large);
      for (const petal of state.large) petal.cellWeight = LARGE_CELL_RADIUS ** 2;
      for (const petal of state.small) petal.cellWeight = SMALL_CELL_RADIUS ** 2;
      tessellate(glyphMask(state.glyph, PIECE_DENSITY), [...state.large, ...state.small], {
        bucketSize: 6, overlap: PIECE_OVERLAP, maxRadius: 20,
      });
      const targets = state.small.map((petal) => petal.target);
      state.wordBox = {
        left: Math.min(...targets.map((target) => target.x)) - TOUCH_WORD_MARGIN,
        right: Math.max(...targets.map((target) => target.x)) + TOUCH_WORD_MARGIN,
        top: Math.min(...targets.map((target) => target.y)) - TOUCH_WORD_MARGIN,
        bottom: Math.max(...targets.map((target) => target.y)) + TOUCH_WORD_MARGIN,
      };
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
        state.openedAtScroll = window.scrollY;
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
        if (state.mode === 'bloom' && Math.abs(window.scrollY - state.openedAtScroll) > SCROLL_CLOSE_PX) {
          engineRef.current.settle(index);
        }
      });
    };

    resize();
    navFlight = reduceMotion || !navCanvasRef.current ? null : createNavFlight({
      glyphs: calligraphyGlyphs,
      wrapper,
      canvas: navCanvasRef.current,
      unitScale: () => unitScale,
      setGlyphMode: setMode,
      hoverIdle: () => glyphStates.every((state) => state.mode === 'ink' || state.mode === 'nav'),
      quietHover,
      onBanner: () => {
        const index = hoveredColumn.current;
        if (index >= 0) scheduleBloom(index);
      },
    });
    // Cutting the glyphs takes a few tens of milliseconds; do it before the first hover.
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 200));
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;
    const idleTasks = [
      ...glyphStates.map((state) => idle(() => prepare(state))),
      idle(() => navFlight?.prepare()),
    ];
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      navFlight?.destroy();
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
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
      {createPortal(<canvas ref={navCanvasRef} className="name-nav-petals" aria-hidden="true" />, document.body)}
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
