// Shared geometry for breaking a shape into petal-sized pieces and morphing them into petals.
// A piece is a centre plus its outline radius in PIECE_ANGLES evenly spaced directions, so any
// two pieces (a glyph cell, a petal, a menu bar cell) blend into each other direction by direction.
export const PIECE_ANGLES = 48;

// The large petals a character breaks into, for both the hover burst and the menu bar flight.
// Spacing and sizes are in the banner's viewBox units.
export const LARGE_PETAL = { spacing: 3.7, size: 3.1, sizeRange: 1.9 };

const PETAL_OUTLINE = [
  [[0, 1], [0.95, 0.3], [0.8, -0.82], [0.24, -0.9]],
  [[0.24, -0.9], [0.24, -0.9], [0, -0.62], [0, -0.62]],
  [[0, -0.62], [0, -0.62], [-0.24, -0.9], [-0.24, -0.9]],
  [[-0.24, -0.9], [-0.8, -0.82], [-0.95, 0.3], [0, 1]],
];

// The unit petal's radius at each local angle; the outline is star-shaped about its centre.
const PETAL_PROFILE = (() => {
  const bins = 720;
  const profile = new Float32Array(bins).fill(-1);
  for (const [p0, p1, p2, p3] of PETAL_OUTLINE) {
    for (let step = 0; step <= 600; step += 1) {
      const t = step / 600;
      const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      const bin = Math.floor(((Math.atan2(y, x) / (Math.PI * 2) + 1) % 1) * bins) % bins;
      profile[bin] = Math.max(profile[bin], Math.hypot(x, y));
    }
  }
  for (let bin = 0; bin < bins; bin += 1) {
    if (profile[bin] >= 0) continue;
    let before = bin;
    let after = bin;
    while (profile[(before + bins) % bins] < 0) before -= 1;
    while (profile[after % bins] < 0) after += 1;
    const mix = (bin - before) / (after - before);
    profile[bin] = profile[(before + bins) % bins] * (1 - mix) + profile[after % bins] * mix;
  }
  return profile;
})();

export const petalRadius = (angle) => {
  const turn = ((angle / (Math.PI * 2)) % 1 + 1) % 1;
  return PETAL_PROFILE[Math.floor(turn * PETAL_PROFILE.length) % PETAL_PROFILE.length];
};

export const PIECE_DIRECTIONS = Array.from({ length: PIECE_ANGLES }, (_, angle) => {
  const theta = (angle / PIECE_ANGLES) * Math.PI * 2;
  return { theta, cos: Math.cos(theta), sin: Math.sin(theta) };
});

export function tracePiece(context, x, y, radii) {
  context.beginPath();
  PIECE_DIRECTIONS.forEach(({ cos, sin }, angle) => {
    if (angle) context.lineTo(x + cos * radii[angle], y + sin * radii[angle]);
    else context.moveTo(x + cos * radii[angle], y + sin * radii[angle]);
  });
  context.closePath();
}

// Rasterise a shape for tessellate(): `draw` fills it in the shape's own coordinates.
export function shapeMask({ x, y, width, height }, density, draw) {
  const pixelWidth = Math.ceil(width * density);
  const pixelHeight = Math.ceil(height * density);
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  context.scale(density, density);
  context.translate(-x, -y);
  draw(context);
  return {
    x, y, density, width: pixelWidth, height: pixelHeight,
    alpha: context.getImageData(0, 0, pixelWidth, pixelHeight).data,
  };
}

export const glyphMask = (glyph, density) => shapeMask(glyph.box, density, (context) => {
  context.fill(new Path2D(glyph.paths.join(' ')));
});

export function glyphInterior(glyph, spacing) {
  const probe = document.createElement('canvas').getContext('2d');
  const path = new Path2D(glyph.paths.join(' '));
  const { x, y, width, height } = glyph.box;
  const points = [];
  for (let py = y; py < y + height; py += spacing) {
    for (let px = x; px < x + width; px += spacing) {
      const pointX = px + Math.random() * spacing;
      const pointY = py + Math.random() * spacing;
      if (probe.isPointInPath(path, pointX, pointY)) points.push({ x: pointX, y: pointY });
    }
  }
  return points;
}

// Cut a mask into one cell per seed (a power diagram: a seed's cellWeight lets it claim more)
// and move each seed's home to its cell's centroid. Cells overlap a hair where they meet, to hide
// antialiasing seams, while the shape's own outer edge stays exact.
export function tessellate(mask, seeds, { bucketSize, overlap, maxRadius }) {
  const { x: originX, y: originY, density, width, height, alpha } = mask;
  const buckets = new Map();
  seeds.forEach((seed, index) => {
    const key = `${Math.floor(seed.homeX / bucketSize)},${Math.floor(seed.homeY / bucketSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  });
  const labels = new Int32Array(width * height).fill(-1);
  const sumX = new Float64Array(seeds.length);
  const sumY = new Float64Array(seeds.length);
  const counts = new Uint32Array(seeds.length);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const pixel = py * width + px;
      // Half coverage is where the antialiased edge sits, matching the vector's own outline.
      if (alpha[pixel * 4 + 3] < 128) continue;
      const x = originX + (px + 0.5) / density;
      const y = originY + (py + 0.5) / density;
      const bucketX = Math.floor(x / bucketSize);
      const bucketY = Math.floor(y / bucketSize);
      let best = -1;
      let bestPower = Infinity;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          for (const index of buckets.get(`${bucketX + dx},${bucketY + dy}`) || []) {
            const seed = seeds[index];
            const power = (seed.homeX - x) ** 2 + (seed.homeY - y) ** 2 - (seed.cellWeight || 0);
            if (power < bestPower) {
              bestPower = power;
              best = index;
            }
          }
        }
      }
      if (best < 0) continue;
      labels[pixel] = best;
      sumX[best] += x;
      sumY[best] += y;
      counts[best] += 1;
    }
  }

  const labelAt = (x, y) => {
    const px = Math.floor((x - originX) * density);
    const py = Math.floor((y - originY) * density);
    return px >= 0 && py >= 0 && px < width && py < height ? labels[py * width + px] : -1;
  };
  const march = 0.5 / density;
  seeds.forEach((seed, index) => {
    seed.cell = new Float32Array(PIECE_ANGLES);
    if (!counts[index]) return;
    let centerX = sumX[index] / counts[index];
    let centerY = sumY[index] / counts[index];
    if (labelAt(centerX, centerY) !== index) {
      centerX = seed.homeX;
      centerY = seed.homeY;
    }
    PIECE_DIRECTIONS.forEach(({ cos, sin }, angle) => {
      let radius = 0;
      while (radius < maxRadius && labelAt(centerX + cos * (radius + march), centerY + sin * (radius + march)) === index) {
        radius += march;
      }
      const beyond = labelAt(centerX + cos * (radius + march), centerY + sin * (radius + march));
      seed.cell[angle] = radius + (beyond >= 0 ? march + overlap : march / 2);
    });
    seed.homeX = centerX;
    seed.homeY = centerY;
    seed.x = centerX;
    seed.y = centerY;
  });
}
