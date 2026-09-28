import {
  PIECE_DIRECTIONS, glyphInterior, glyphMask, petalRadius, shapeMask, tessellate, tracePiece,
} from './petalPieces.js';
import { setNavFormation } from './navFormation.js';

// Scrolling past the intro, the name bursts into petals that fly up and tile the menu bar.
// Fewer, larger pieces than the hover burst, since each grows to fill a slice of the bar.
export const NAV_SCROLL_THRESHOLD = 80;
const PIECE_SPACING = 5.2;
const PIECE_DENSITY = 6;
const PIECE_OVERLAP = 0.22;
const PETAL_SIZE = 4.2;
const PETAL_SIZE_RANGE = 1.4;
const BAR_DENSITY = 2;
const BAR_OVERLAP = 0.45;
// A petal grows to this multiple of its bar cell's mean radius at mid-flight.
const BAR_PETAL_GROWTH = 1.25;
const FLIGHT_SECONDS = 1.0;
const FLIGHT_SECONDS_RANGE = 0.35;
const FLIGHT_STAGGER = 0.15;
const ITEMS_FADE_OUT_MS = 200;

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

// Pair pieces and bar cells column by column, so petals on the left land on the left.
function pairInColumns(items, rows, x, y) {
  const sorted = [...items].sort((a, b) => x(a) - x(b));
  const paired = [];
  for (let start = 0; start < sorted.length; start += rows) {
    paired.push(...sorted.slice(start, start + rows).sort((a, b) => y(a) - y(b)));
  }
  return paired;
}

export function createNavFlight({ glyphs, wrapper, canvas, unitScale, setGlyphMode, hoverIdle, quietHover, onBanner }) {
  const context = canvas.getContext('2d');
  // phase: 'banner' (the name shows), 'forming', 'bar' (the menu bar shows), 'clearing'
  // (bar items fading out before it breaks up), 'dissolving' (petals flying home).
  let phase = window.scrollY >= NAV_SCROLL_THRESHOLD ? 'bar' : 'banner';
  let pieces = null;
  let barRows = 0;
  let barStale = true;
  let animationFrame = 0;
  let clearTimer = 0;
  let pendingForm = false;
  let startedAt = 0;
  const radii = new Float32Array(PIECE_DIRECTIONS.length);

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    barStale = true;
  };

  const clear = () => context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const preparePieces = () => {
    if (pieces) return;
    pieces = [];
    glyphs.forEach((glyph, glyphIndex) => {
      const seeds = glyphInterior(glyph, PIECE_SPACING).map((point) => ({ homeX: point.x, homeY: point.y }));
      tessellate(glyphMask(glyph, PIECE_DENSITY), seeds, { bucketSize: 8, overlap: PIECE_OVERLAP, maxRadius: 20 });
      const centerX = glyph.box.x + glyph.box.width / 2;
      const centerY = glyph.box.y + glyph.box.height / 2;
      for (const seed of seeds) {
        const outward = Math.atan2(seed.homeY - centerY, seed.homeX - centerX);
        pieces.push({
          glyphIndex,
          homeX: seed.homeX,
          homeY: seed.homeY,
          cell: seed.cell,
          size: PETAL_SIZE + Math.random() * PETAL_SIZE_RANGE,
          outwardX: Math.cos(outward),
          outwardY: Math.sin(outward),
          x: 0,
          y: 0,
          rotation: Math.random() * Math.PI * 2,
          radii: new Float32Array(PIECE_DIRECTIONS.length),
        });
      }
    });
  };

  // Tile the live menu bar with exactly one cell per piece.
  const prepareBar = () => {
    if (!barStale) return;
    barStale = false;
    const bar = document.querySelector('.navbar-styles');
    if (!bar) return;
    const box = bar.getBoundingClientRect();
    const corner = parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0;
    const count = pieces.length;
    const columns = Math.max(1, Math.round(Math.sqrt((count * box.width) / box.height)));
    barRows = Math.ceil(count / columns);
    const cellWidth = box.width / columns;
    const cellHeight = box.height / barRows;
    const seeds = [];
    for (let row = 0; row < barRows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        seeds.push({
          homeX: box.left + (column + 0.2 + Math.random() * 0.6) * cellWidth,
          homeY: box.top + (row + 0.2 + Math.random() * 0.6) * cellHeight,
        });
      }
    }
    // Drop the surplus seeds at random; the remaining cells still tile the whole bar.
    while (seeds.length > count) seeds.splice(Math.floor(Math.random() * seeds.length), 1);
    const mask = shapeMask({ x: box.left, y: box.top, width: box.width, height: box.height }, BAR_DENSITY, (shape) => {
      shape.beginPath();
      shape.roundRect(box.left, box.top, box.width, box.height, corner);
      shape.fill();
    });
    tessellate(mask, seeds, {
      bucketSize: Math.max(cellWidth, cellHeight) * 1.6, overlap: BAR_OVERLAP, maxRadius: Math.max(cellWidth, cellHeight) * 3,
    });
    const scale = unitScale();
    const bounds = wrapper.getBoundingClientRect();
    const orderedPieces = pairInColumns(pieces, barRows, (piece) => bounds.left + piece.homeX * scale, (piece) => piece.homeY);
    const orderedCells = pairInColumns(seeds, barRows, (seed) => seed.homeX, (seed) => seed.homeY);
    orderedPieces.forEach((piece, index) => {
      const cell = orderedCells[index];
      const meanRadius = cell.cell.reduce((sum, value) => sum + value, 0) / cell.cell.length;
      piece.bar = { x: cell.homeX, y: cell.homeY, radii: cell.cell, size: meanRadius * BAR_PETAL_GROWTH };
    });
  };

  // Where a piece sits in the banner right now, in viewport pixels.
  const bannerPose = (piece, bounds, scale) => ({
    x: bounds.left + piece.homeX * scale,
    y: bounds.top + piece.homeY * scale,
  });

  const draw = () => {
    clear();
    context.fillStyle = '#fff';
    for (const piece of pieces) {
      tracePiece(context, piece.x, piece.y, piece.radii);
      context.fill();
    }
  };

  const placeInBanner = () => {
    const scale = unitScale();
    const bounds = wrapper.getBoundingClientRect();
    for (const piece of pieces) {
      const pose = bannerPose(piece, bounds, scale);
      piece.x = pose.x;
      piece.y = pose.y;
      piece.cell.forEach((value, angle) => { piece.radii[angle] = value * scale; });
    }
  };

  const placeInBar = () => {
    for (const piece of pieces) {
      piece.x = piece.bar.x;
      piece.y = piece.bar.y;
      piece.radii.set(piece.bar.radii);
    }
  };

  const launch = (direction) => {
    const scale = unitScale();
    startedAt = performance.now();
    phase = direction === 'up' ? 'forming' : 'dissolving';
    for (const piece of pieces) {
      const reach = 14 + Math.random() * 16;
      const lift = 30 + Math.random() * 40;
      piece.flight = {
        fromX: piece.x,
        fromY: piece.y,
        fromRadii: Float32Array.from(piece.radii),
        fromRotation: piece.rotation,
        fromSize: direction === 'up' ? piece.size * scale : piece.bar.size,
        toSize: direction === 'up' ? piece.bar.size : piece.size * scale,
        spin: (Math.random() - 0.5) * 5,
        reach,
        lift,
        delay: Math.random() * FLIGHT_STAGGER,
        duration: FLIGHT_SECONDS + Math.random() * FLIGHT_SECONDS_RANGE,
      };
    }
    if (!animationFrame) animationFrame = window.requestAnimationFrame(step);
  };

  const step = (time) => {
    animationFrame = 0;
    const elapsed = (time - startedAt) / 1000;
    const scale = unitScale();
    const bounds = wrapper.getBoundingClientRect();
    const up = phase === 'forming';
    let flying = false;
    for (const piece of pieces) {
      const { flight } = piece;
      const progress = Math.min(Math.max((elapsed - flight.delay) / flight.duration, 0), 1);
      if (progress < 1) flying = true;
      const t = easeInOutCubic(progress);
      // The banner scrolls under a descending petal, so its landing spot is re-read every frame.
      const home = bannerPose(piece, bounds, scale);
      const toX = up ? piece.bar.x : home.x;
      const toY = up ? piece.bar.y : home.y;
      // Burst out of the glyph, rise, then run along the bar (and the same path in reverse).
      const p1X = up ? flight.fromX + piece.outwardX * flight.reach : flight.fromX * 0.8 + toX * 0.2;
      const p1Y = up ? flight.fromY + piece.outwardY * flight.reach : flight.fromY + flight.lift;
      const p2X = up ? toX * 0.8 + flight.fromX * 0.2 : toX + piece.outwardX * flight.reach;
      const p2Y = up ? toY + flight.lift : toY + piece.outwardY * flight.reach;
      piece.x = cubic(flight.fromX, p1X, p2X, toX, t);
      piece.y = cubic(flight.fromY, p1Y, p2Y, toY, t);
      piece.rotation = flight.fromRotation + flight.spin * t;
      // Leave the starting shape early, be a petal in mid-air, settle into the landing shape late.
      const intoPetal = smoothstep(0, 0.3, t);
      const intoTarget = smoothstep(0.7, 1, t);
      const size = flight.fromSize + (flight.toSize - flight.fromSize) * t;
      PIECE_DIRECTIONS.forEach(({ theta }, angle) => {
        const target = up ? piece.bar.radii[angle] : piece.cell[angle] * scale;
        const petal = petalRadius(theta - piece.rotation) * size;
        const midway = flight.fromRadii[angle] * (1 - intoPetal) + petal * intoPetal;
        radii[angle] = midway * (1 - intoTarget) + target * intoTarget;
      });
      piece.radii.set(radii);
    }
    draw();
    if (flying) {
      animationFrame = window.requestAnimationFrame(step);
      return;
    }
    if (up) {
      phase = 'bar';
      // The canvas already paints the finished bar; hold it a frame while the real bar mounts.
      setNavFormation({ bar: true });
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (phase !== 'bar') return;
        clear();
        setNavFormation({ items: true });
      }));
    } else {
      phase = 'banner';
      glyphs.forEach((_, index) => setGlyphMode(index, 'ink'));
      clear();
      onBanner();
    }
  };

  const form = () => {
    pendingForm = false;
    preparePieces();
    prepareBar();
    if (phase === 'banner') {
      placeInBanner();
      draw();
      glyphs.forEach((_, index) => setGlyphMode(index, 'nav'));
    }
    launch('up');
  };

  // Hover petals must be home before the name can leave; wait out a return in progress.
  const waitForHover = () => {
    if (!pendingForm) return;
    if (hoverIdle()) form();
    else window.requestAnimationFrame(waitForHover);
  };

  const update = () => {
    const wanted = window.scrollY >= NAV_SCROLL_THRESHOLD;
    if (wanted) {
      if (phase === 'banner' && !pendingForm) {
        quietHover();
        pendingForm = true;
        waitForHover();
      } else if (phase === 'dissolving') {
        launch('up');
      } else if (phase === 'clearing') {
        window.clearTimeout(clearTimer);
        phase = 'bar';
        setNavFormation({ items: true });
      }
      return;
    }
    pendingForm = false;
    if (phase === 'forming') {
      launch('down');
    } else if (phase === 'bar') {
      phase = 'clearing';
      setNavFormation({ items: false });
      clearTimer = window.setTimeout(() => {
        preparePieces();
        prepareBar();
        placeInBar();
        draw();
        setNavFormation({ bar: false });
        launch('down');
      }, ITEMS_FADE_OUT_MS);
    }
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', update, { passive: true });
  if (phase === 'bar') glyphs.forEach((_, index) => setGlyphMode(index, 'nav'));
  setNavFormation({ managed: true, bar: phase === 'bar', items: phase === 'bar' });

  return {
    busy: () => phase !== 'banner' || pendingForm,
    prepare: preparePieces,
    destroy() {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(clearTimer);
      pendingForm = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', update);
      setNavFormation({ managed: false, bar: false, items: false });
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
