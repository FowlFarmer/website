// The petals the calligraphy name breaks into, prepared ahead of time: for each character, the
// large petals it bursts into, the small petals that fly out to spell its meaning, and the pieces
// each petal cuts from the ink (so ink morphs into petal and back); and the pieces the name breaks
// into to fly up into the menu bar.
//
// Preparing them takes a couple of seconds of main-thread work (point tests, rasterising and
// cutting the glyphs, sampling the words' letters), so it's baked: three variants, saved to
// public/calligraphy/petals-{0,1,2}.json, one picked at random per visit. Rebake whenever the
// glyphs, the words, their font or any constant here changes: in dev, run
// `await window.__bakeCalligraphy()` on the homepage. A stale bake (its fingerprint no longer
// matching) is ignored and the petals are prepared live instead.
import { calligraphyGlyphs } from '../data/calligraphy.js';
import { LARGE_PETAL, glyphInterior, glyphMask, tessellate } from './petalPieces.js';

const PETAL_COLORS = ['#fffefe', '#fffaf8', '#ffffff', '#f7f5f4'];
// Small petals hide inside the glyph too, then fly on fixed paths to spell its meaning.
const SMALL_PETAL = { size: 1.2, sizeRange: 0.35 };
// Words are split into syllables; a larger gap between groups separates the words.
const WORD_FONT_SIZE = 21;
const WORD_LINE_HEIGHT = 21;
const WORD_GAP = 9;
const WORD_CENTER_Y = 97;
// Words hang from the glyph's left edge; 加's short words sit better nudged right and up.
const WORD_OFFSET = { jia: { x: 14, y: -8 } };
const WORD_FONT = "'Inter Variable', sans-serif";
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
const TOUCH_WORD_MARGIN = 10;
// The menu bar flight's pieces (nameNavFlight.js) are cut the same way, a little coarser.
const NAV_BUCKET_SIZE = 8;
const VARIANTS = 3;

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

export function makePetal(x, y, size, rotation = Math.random() * Math.PI * 2, color = randomColor()) {
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
    color,
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

// One character's hover petals: `large` burst out, `small` spell its meaning, both starting as
// pieces of the ink; `wordBox` bounds the spelled words.
export function prepareGlyphPetals(glyph) {
  const large = glyphInterior(glyph, LARGE_PETAL.spacing).map((point) => ({
    ...makePetal(point.x, point.y, LARGE_PETAL.size + Math.random() * LARGE_PETAL.sizeRange),
    windResponse: 0.6 + Math.random() * 0.8,
  }));
  const small = sampleSmallPetals(glyph, wordLines(glyph), large);
  for (const petal of large) petal.cellWeight = LARGE_CELL_RADIUS ** 2;
  for (const petal of small) petal.cellWeight = SMALL_CELL_RADIUS ** 2;
  tessellate(glyphMask(glyph, PIECE_DENSITY), [...large, ...small], {
    bucketSize: 6, overlap: PIECE_OVERLAP, maxRadius: 20,
  });
  const targets = small.map((petal) => petal.target);
  const wordBox = {
    left: Math.min(...targets.map((target) => target.x)) - TOUCH_WORD_MARGIN,
    right: Math.max(...targets.map((target) => target.x)) + TOUCH_WORD_MARGIN,
    top: Math.min(...targets.map((target) => target.y)) - TOUCH_WORD_MARGIN,
    bottom: Math.max(...targets.map((target) => target.y)) + TOUCH_WORD_MARGIN,
  };
  return { large, small, wordBox };
}

// The pieces the whole name breaks into for the menu bar flight.
export function prepareNavPieces(glyphs) {
  const pieces = [];
  glyphs.forEach((glyph, glyphIndex) => {
    const seeds = glyphInterior(glyph, LARGE_PETAL.spacing).map((point) => ({ homeX: point.x, homeY: point.y }));
    tessellate(glyphMask(glyph, PIECE_DENSITY), seeds, { bucketSize: NAV_BUCKET_SIZE, overlap: PIECE_OVERLAP, maxRadius: 20 });
    seeds.forEach((seed) => pieces.push(navPiece(glyph, glyphIndex, seed.homeX, seed.homeY, seed.cell,
      LARGE_PETAL.size + Math.random() * LARGE_PETAL.sizeRange, Math.random() * Math.PI * 2)));
  });
  return pieces;
}

function navPiece(glyph, glyphIndex, homeX, homeY, cell, size, rotation) {
  const outward = Math.atan2(homeY - (glyph.box.y + glyph.box.height / 2), homeX - (glyph.box.x + glyph.box.width / 2));
  return {
    glyphIndex, homeX, homeY, cell, size,
    outwardX: Math.cos(outward),
    outwardY: Math.sin(outward),
    x: 0,
    y: 0,
    rotation,
    radii: new Float32Array(cell.length),
  };
}

// The words are drawn in the site's font, which must have loaded first.
export const wordFontReady = () => document.fonts.load(`700 ${WORD_FONT_SIZE}px ${WORD_FONT}`);

// What the petals are prepared from; a bake made from anything else is stale.
function fingerprint() {
  const text = JSON.stringify([calligraphyGlyphs, LARGE_PETAL, SMALL_PETAL, PETAL_COLORS, WORD_FONT, WORD_FONT_SIZE,
    WORD_LINE_HEIGHT, WORD_GAP, WORD_CENTER_Y, WORD_OFFSET, LETTER_DENSITY, LETTER_INSET, LETTER_SPACING,
    LETTER_GRAIN_RADIUS, PIECE_DENSITY, PIECE_OVERLAP, LARGE_CELL_RADIUS, SMALL_CELL_RADIUS, TOUCH_WORD_MARGIN,
    NAV_BUCKET_SIZE, PACK, CELL_SCALE]);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

// Baked petals are flat rows of whole numbers: each field scaled up and rounded (to hundredths of a
// viewBox unit, a fraction of a pixel on screen), then the piece's outline radii, in tenths, each as
// the step from the one before (neighbouring radii are close, so the file compresses well).
const PACK = { large: [100, 100, 100, 100, 1, 100], small: [100, 100, 100, 100, 1, 100, 100, 100, 100, 100], nav: [1, 100, 100, 100, 100] };
const CELL_SCALE = 10;
function pack(fields, cell, scales) {
  const row = fields.map((value, index) => Math.round(value * scales[index]));
  let previous = 0;
  for (const radius of cell) {
    const step = Math.round(radius * CELL_SCALE);
    row.push(step - previous);
    previous = step;
  }
  return row;
}
function unpack(row, scales) {
  const fields = scales.map((scale, index) => row[index] / scale);
  const cell = new Float32Array(row.length - scales.length);
  let step = 0;
  for (let index = 0; index < cell.length; index += 1) {
    step += row[scales.length + index];
    cell[index] = step / CELL_SCALE;
  }
  return [fields, cell];
}
const colorIndex = (color) => PETAL_COLORS.indexOf(color);

function bakeVariant() {
  return {
    fingerprint: fingerprint(),
    glyphs: calligraphyGlyphs.map((glyph) => {
      const { large, small, wordBox } = prepareGlyphPetals(glyph);
      return {
        large: large.map((p) => pack([p.homeX, p.homeY, p.rotation, p.size, colorIndex(p.color), p.windResponse],
          p.cell, PACK.large)),
        small: small.map((p) => pack([p.homeX, p.homeY, p.rotation, p.size, colorIndex(p.color), p.target.x,
          p.target.y, p.target.rotation, p.target.delay, p.target.duration], p.cell, PACK.small)),
        wordBox,
      };
    }),
    nav: prepareNavPieces(calligraphyGlyphs).map((p) => pack([p.glyphIndex, p.homeX, p.homeY, p.size, p.rotation],
      p.cell, PACK.nav)),
  };
}

// One baked variant, at random, as live petals: { glyphs: [{ large, small, wordBox }], nav }.
// Null if it's missing or stale.
export async function loadBakedPetals() {
  try {
    const response = await fetch(`/calligraphy/petals-${Math.floor(Math.random() * VARIANTS)}.json`);
    if (!response.ok) return null;
    const baked = await response.json();
    if (baked.fingerprint !== fingerprint()) {
      if (import.meta.env.DEV) console.warn('Calligraphy petals are stale: run window.__bakeCalligraphy() to rebake.');
      return null;
    }
    return {
      glyphs: baked.glyphs.map(({ large, small, wordBox }) => ({
        large: large.map((row) => {
          const [[x, y, rotation, size, color, windResponse], cell] = unpack(row, PACK.large);
          return { ...makePetal(x, y, size, rotation, PETAL_COLORS[color]), windResponse, cell };
        }),
        small: small.map((row) => {
          const [[x, y, rotation, size, color, tx, ty, trotation, delay, duration], cell] = unpack(row, PACK.small);
          return {
            ...makePetal(x, y, size, rotation, PETAL_COLORS[color]),
            target: { x: tx, y: ty, rotation: trotation, delay, duration },
            cell,
          };
        }),
        wordBox,
      })),
      nav: baked.nav.map((row) => {
        const [[glyphIndex, x, y, size, rotation], cell] = unpack(row, PACK.nav);
        return navPiece(calligraphyGlyphs[glyphIndex], glyphIndex, x, y, cell, size, rotation);
      }),
    };
  } catch {
    return null;
  }
}

if (import.meta.env.DEV) {
  // Bake the variants through the dev server (scripts/dev/calligraphyBakePlugin.mjs).
  window.__bakeCalligraphy = async () => {
    await wordFontReady();
    const sizes = [];
    for (let variant = 0; variant < VARIANTS; variant += 1) {
      const body = JSON.stringify(bakeVariant());
      const response = await fetch(`/__calligraphy-bake?variant=${variant}`, { method: 'POST', body });
      if (!response.ok) throw new Error(`Bake ${variant} failed`);
      sizes.push(`${Math.round(body.length / 1024)} KB`);
    }
    return sizes;
  };
}
