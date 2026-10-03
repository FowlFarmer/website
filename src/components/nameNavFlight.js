import { PIECE_DIRECTIONS, petalRadius, shapeMask, tessellate, tracePiece } from './petalPieces.js';
import { prepareNavPieces } from './calligraphyPetals.js';
import { setNavFormation } from './navFormation.js';
import { onPageScroll, pageScrollY } from './pageScroll.js';

// Scrolling past the intro, the name is worn away by the wind into the menu bar: specks lift off
// from all over it, the lightest first (the slivers along thin strokes and stroke ends), then
// heavier pieces, until it's gone; each flutters off on the gust and glides into its tile of the
// bar, reshaping as it lands. The pieces not yet lifted off are drawn in place, so the name
// erodes. Coming back down it's the opposite, not the same played backwards: the wind drops what
// it carries, the heaviest pieces first, settling onto the name, then the lighter specks into the
// gaps, until it's whole. Either way a piece is kicked to near full speed by the gust at once, then
// drag slows it as it glides to its place (lighter pieces shed their speed faster).
export const NAV_SCROLL_THRESHOLD = 80;
const BAR_DENSITY = 2;
const BAR_OVERLAP = 0.45;
const FLIGHT_SECONDS = 1.0;
const FLIGHT_SECONDS_RANGE = 0.35;
// Wearing away: the pieces lift off over EROSION_SECONDS, in order of weight (their area) give or
// take EROSION_JITTER of the spread, so specks leave from random places, not in a sweep.
const EROSION_SECONDS = 1.1;
const EROSION_JITTER = 0.35;
// The gust: 150° (0° pointing right, counting anticlockwise) going up, so up and to the left; 330°
// coming back down. As a direction on screen (y down).
const WIND_ANGLE = (150 * Math.PI) / 180;
const WIND_X = Math.cos(WIND_ANGLE);
const WIND_Y = -Math.sin(WIND_ANGLE);
// A flight in two parts. The cruise: straight downwind at the gust's speed (GUST_SPEED, the name's
// widths a second, the same for every piece), up to speed within KICK_SECONDS, for CRUISE_SECONDS
// scaled by how far against the wind its place is (up to 1 + CRUISE_TURN times as long, so those
// run on before hooking round) and by its weight (light specks lose their way sooner). Then the
// glide: a curve from there to its place, leaving at the cruise's speed and direction and slowing
// to rest as it lands.
const GUST_SPEED = 1.1;
const KICK_SECONDS = 0.07;
const CRUISE_SECONDS = 0.3;
const CRUISE_TURN = 1.6;
// Easing for the glide, by its time: starts at speed 1 (matching the cruise), ends at 0.
const glide = (s) => s + s * s - s * s * s;
const ITEMS_FADE_OUT_MS = 200;
// The bar's items fading in (App.css .navbar-styles[data-formed] > *).
const ITEMS_FADE_IN_MS = 420;
// The flight that owns the bar's formation now: one cleaning up late (landing after its page left)
// mustn't undo a newer one's.
let latestFlight = 0;
// How far a bar tile's claim can vary, as a fraction of the tile size.
const TILE_IRREGULARITY = 0.45;
// Flight time (not eased distance) at which a piece becomes a petal, and starts to take its landing shape.
const PETAL_BY = 0.1;
const LANDING_FROM = 0.93;

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};
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
  const flightId = ++latestFlight;
  const context = canvas.getContext('2d');
  // phase: 'banner' (the name shows), 'forming', 'bar' (the menu bar shows), 'clearing'
  // (bar items fading out before it breaks up), 'dissolving' (petals flying home).
  let phase = pageScrollY() >= NAV_SCROLL_THRESHOLD ? 'bar' : 'banner';
  let pieces = null;
  let barRows = 0;
  let barStale = true;
  let animationFrame = 0;
  let clearTimer = 0;
  let pendingForm = false;
  let startedAt = 0;
  // Set while the name forms the bar on request (not from scrolling), until it's formed.
  let forced = false;
  let onFormed = null;
  // Set once the page is gone: the flight still lands, then cleans up.
  let released = false;
  const radii = new Float32Array(PIECE_DIRECTIONS.length);

  // Only a change of width re-tiles the bar (it sits at the top, so height doesn't move it). A phone's
  // toolbar showing and hiding changes the height all the time: then the canvas only grows, if it
  // must, since resizing it clears the petals in the air.
  let canvasWidth = 0;
  let canvasHeight = 0;
  const resize = () => {
    const width = window.innerWidth;
    const widthChanged = width !== canvasWidth;
    if (!widthChanged && window.innerHeight <= canvasHeight) return;
    canvasWidth = width;
    canvasHeight = widthChanged ? window.innerHeight : Math.max(canvasHeight, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (!widthChanged) return;
    barStale = true;
    tileBarWhenIdle();
  };

  // Tiling the bar takes a few tens of milliseconds: do it while the page is idle (once the pieces
  // are ready, and after a resize), not in the frame the petals set off. Not mid-flight, where it
  // would move their landing spots.
  const idle = window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 200));
  const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
  let barTask = 0;
  function tileBarWhenIdle() {
    cancelIdle(barTask);
    barTask = idle(() => {
      barTask = 0;
      if (pieces && phase !== 'forming' && phase !== 'dissolving') prepareBar();
    }, { timeout: 2000 });
  }

  const clear = () => context.clearRect(0, 0, canvasWidth, canvasHeight);

  // Normally baked (calligraphyPetals.js); prepared live only if the bake is missing or stale.
  const preparePieces = () => {
    if (pieces) return;
    pieces = prepareNavPieces(glyphs);
    tileBarWhenIdle();
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
          homeX: box.left + (column + Math.random()) * cellWidth,
          homeY: box.top + (row + Math.random()) * cellHeight,
          // Uneven claims make uneven shards, so the tiling doesn't read as a grid.
          cellWeight: (Math.random() * TILE_IRREGULARITY * Math.min(cellWidth, cellHeight)) ** 2,
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
      piece.bar = { x: cell.homeX, y: cell.homeY, radii: cell.cell };
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
    startedAt = performance.now();
    phase = direction === 'up' ? 'forming' : 'dissolving';
    const up = direction === 'up';
    // Each piece's weight: its share of the ranking by area, 0 the lightest to 1 the heaviest. Up,
    // the lightest leave first; down, the heaviest land first.
    const weight = new Map();
    const area = (piece) => piece.cell.reduce((sum, radius) => sum + radius * radius, 0);
    [...pieces].sort((a, b) => area(a) - area(b)).forEach((piece, rank) => weight.set(piece, rank / Math.max(pieces.length - 1, 1)));
    const bounds = wrapper.getBoundingClientRect();
    const span = bounds.width || window.innerWidth;
    const scale = unitScale();
    const wind = up ? 1 : -1;
    for (const piece of pieces) {
      const lift = 30 + Math.random() * 40;
      const heavy = weight.get(piece);
      const light = 1 - heavy;
      // How far its place is from straight downwind: 0 downwind, 1 dead against it.
      const to = up ? piece.bar : bannerPose(piece, bounds, scale);
      const awayX = to.x - piece.x;
      const awayY = to.y - piece.y;
      const turn = (1 - (wind * (awayX * WIND_X + awayY * WIND_Y)) / (Math.hypot(awayX, awayY) || 1)) / 2;
      const cruise = CRUISE_SECONDS * (1 + CRUISE_TURN * turn) * (0.7 + 0.5 * heavy);
      const glideFor = FLIGHT_SECONDS * (0.75 + 0.3 * turn) + Math.random() * FLIGHT_SECONDS_RANGE;
      piece.flight = {
        fromX: piece.x,
        fromY: piece.y,
        fromRadii: Float32Array.from(piece.radii),
        fromRotation: piece.rotation,
        spin: (Math.random() - 0.5) * (5 + 6 * light),
        lift,
        heavy,
        delay: EROSION_SECONDS * ((1 - EROSION_JITTER) * (up ? heavy : light) + EROSION_JITTER * Math.random()),
        duration: cruise + glideFor,
        cruise,
        glideFor,
        speed: span * GUST_SPEED,
        turn,
        flutter: span * 0.012 * (0.4 + light),
        flutterRate: 1.5 + Math.random() * 2,
        flutterPhase: Math.random() * Math.PI * 2,
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
      const time = Math.min(Math.max(elapsed - flight.delay, 0), flight.duration);
      // The banner scrolls under a descending petal, so its landing spot is re-read every frame.
      const home = bannerPose(piece, bounds, scale);
      const toX = up ? piece.bar.x : home.x;
      const toY = up ? piece.bar.y : home.y;
      // The cruise, straight downwind (up: up and left; down: down and right), then the glide into
      // its place: into the bar from below, onto the glyph from above; the farther it had to turn,
      // the wider its swing. Fluttering across the wind on the way.
      const wind = up ? 1 : -1;
      const dirX = wind * WIND_X;
      const dirY = wind * WIND_Y;
      const kick = KICK_SECONDS;
      const cruised = (moved) => (moved < kick ? (moved * moved) / (2 * kick) : moved - kick / 2) * flight.speed;
      const cruiseEnd = cruised(flight.cruise);
      const startX = flight.fromX + dirX * cruiseEnd;
      const startY = flight.fromY + dirY * cruiseEnd;
      if (time <= flight.cruise) {
        piece.x = flight.fromX + dirX * cruised(time);
        piece.y = flight.fromY + dirY * cruised(time);
      } else {
        const s = glide((time - flight.cruise) / flight.glideFor);
        // Leaving the cruise at its speed: the first control point a third of a glide's worth on.
        const reach = (flight.speed * flight.glideFor) / 3;
        const q1X = startX + dirX * reach;
        const q1Y = startY + dirY * reach;
        const q2X = toX;
        const q2Y = (up ? toY + flight.lift : toY - flight.lift) * (1 - flight.turn) + startY * flight.turn;
        piece.x = cubic(startX, q1X, q2X, toX, s);
        piece.y = cubic(startY, q1Y, q2Y, toY, s);
      }
      if (progress > 0 && progress < 1) {
        // Growing in from nothing (sin²), so it doesn't bend the shared departure.
        const wobble = flight.flutter * Math.sin(Math.PI * 2 * flight.flutterRate * progress + flight.flutterPhase) * Math.sin(Math.PI * progress) ** 2;
        piece.x += -WIND_Y * wobble;
        piece.y += WIND_X * wobble;
      }
      piece.rotation = flight.fromRotation + flight.spin * progress;
      // Become a petal right away and stay one until it has all but landed, then take its tile's shape.
      const intoPetal = smoothstep(0, PETAL_BY, progress);
      const intoTarget = smoothstep(LANDING_FROM, 1, progress);
      const size = piece.size * scale;
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
        const done = onFormed;
        forced = false;
        onFormed = null;
        done?.();
        // Its page gone, it hands the bar back once the items have faded in (handing it back
        // now would show them at once: the plain bar doesn't fade).
        if (released) clearTimer = window.setTimeout(destroy, ITEMS_FADE_IN_MS);
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
    if (forced) return;
    const wanted = pageScrollY() >= NAV_SCROLL_THRESHOLD;
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
  const stopFollowingScroll = onPageScroll(update);
  if (phase === 'bar') glyphs.forEach((_, index) => setGlyphMode(index, 'nav'));
  setNavFormation({ managed: true, bar: phase === 'bar', items: phase === 'bar' });

  function destroy() {
    cancelIdle(barTask);
    forced = false;
    onFormed = null;
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(clearTimer);
    pendingForm = false;
    window.removeEventListener('resize', resize);
    stopFollowingScroll();
    if (flightId === latestFlight) setNavFormation({ managed: false, bar: false, items: false });
    canvas.width = 0;
    canvas.height = 0;
    canvas.remove();
  }

  return {
    busy: () => phase !== 'banner' || pendingForm,
    // Form the bar now, whatever the scroll, then call `done` once its items show.
    formNow(done) {
      if (phase === 'bar') { done(); return; }
      forced = true;
      onFormed = done;
      // Asked to (the page is leaving for the quests): it flies at once, the name's hover petals
      // giving way to it, rather than waiting for them to fly home (up to RETURN_MS), by which
      // time the page has gone and the flight with it.
      if (phase === 'banner') {
        quietHover();
        form();
      } else if (phase === 'dissolving') {
        launch('up');
      } else if (phase === 'clearing') {
        window.clearTimeout(clearTimer);
        phase = 'bar';
        setNavFormation({ items: true });
        forced = false;
        onFormed = null;
        done();
      }
    },
    prepare: preparePieces,
    usePieces(baked) {
      if (pieces) return;
      pieces = baked;
      tileBarWhenIdle();
    },
    // The page is going. A flight up to the bar keeps going to its landing, then cleans up;
    // anything else stops now.
    release() {
      if (phase === 'forming' && forced) {
        released = true;
        window.removeEventListener('resize', resize);
        stopFollowingScroll();
      } else destroy();
    },
    destroy,
  };
}

