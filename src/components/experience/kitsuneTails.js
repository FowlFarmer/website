import * as THREE from 'three';

// Kitsune tails: one sculpted tail mesh, rigged onto a chain of points per tail. The chain's
// rest pose comes from a home curve; physics (kitsunePhysics.js) moves the chain, and the mesh
// follows it every frame.

// Measure the seated figure so the tails follow its own orientation, not the world axes:
// the torso centre from the shoulder band, forward from the torso toward the knees and feet,
// the tailbone on the back surface of the hips along that line, and the head for collisions.
export function measureBody(mesh) {
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute('position');
  // About 50k samples is plenty, whatever the mesh resolution; loops, not spreads, so a
  // full-resolution scan doesn't overflow the call stack.
  const stride = Math.max(1, Math.floor(position.count / 50000));
  const points = [];
  let ground = Infinity;
  let top = -Infinity;
  for (let index = 0; index < position.count; index += stride) {
    const point = new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    points.push(point);
    ground = Math.min(ground, point.y);
    top = Math.max(top, point.y);
  }
  const height = top - ground;
  const band = (low, high) => points.filter((point) => point.y > ground + low * height && point.y < ground + high * height);
  const centre = (list) => list.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(list.length);

  const torso = centre(band(0.55, 0.7));
  torso.y = ground + 0.62 * height;
  const head = centre(band(0.84, 1.01));

  // Legs reach furthest from the torso; weight each far point by its reach.
  const forward = new THREE.Vector3();
  for (const point of band(-0.01, 0.35)) {
    const reach = new THREE.Vector3(point.x - torso.x, 0, point.z - torso.z);
    if (reach.length() > 0.5 * height) forward.add(reach);
  }
  forward.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const back = forward.clone().negate();
  const side = new THREE.Vector3().crossVectors(up, back).normalize();

  // The back of the hips: the furthest-back point on the centre line just above the seat.
  let hipBack = 0;
  for (const point of band(0.08, 0.25)) {
    const offset = new THREE.Vector3(point.x - torso.x, 0, point.z - torso.z);
    if (Math.abs(offset.dot(side)) < 0.06 * height) hipBack = Math.max(hipBack, offset.dot(back));
  }
  const anchor = new THREE.Vector3(torso.x, ground + 0.15 * height, torso.z).addScaledVector(back, hipBack - 0.05 * height);

  // Rough collision volumes: a capsule from hips to shoulders, and a sphere for the head.
  const body = {
    torso: { from: new THREE.Vector3(torso.x, ground + 0.2 * height, torso.z), to: torso.clone(), radius: 0.15 * height },
    head: { centre: head, radius: 0.09 * height },
  };
  return { ground, height, torso, anchor, up, forward, back, side, body };
}

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

// A tail's home curve, traced by steering a direction along its length. The first `stalk` of
// it is the long bottom of the S: it leaves the tailbone heading back, away from the figure,
// dipping slightly and spreading toward its side of the fan. Then it rises into the fan: `fan`
// is its angle from straight up toward the figure's side, `lean` tilts it back toward the
// viewer, and two S-waves make it three-dimensional: `sway` across the fan, `depth` toward the
// viewer (+) or forward (-). The tip curls outward; the widest tails droop.
export function tailHomeSpine({
  frame, fan, lean, length, root = 0, stalk = 0.3, sway = 0.3, swayPhase = 0, depth = 0.4, depthPhase = 0, curl = 0.3,
}) {
  const steps = 96;
  const droop = Math.max(Math.abs(fan) - 0.95, 0);
  // Each tail starts at its own spot on a small arc across the tailbone (`root`, sideways).
  const position = frame.anchor.clone().addScaledVector(frame.side, root);
  const direction = new THREE.Vector3();
  const trace = [position.clone()];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const rise = smoothstep(stalk * 0.35, stalk * 1.15, t);
    const body = Math.max((t - stalk) / (1 - stalk), 0);
    const grow = 0.35 + 0.65 * body;
    const bend = fan * (0.3 + 0.9 * body) + Math.sign(fan) * curl * body * body
      + sway * Math.sin(Math.PI * 2 * body + swayPhase) * grow * rise;
    const tilt = 1.62 * (1 - rise)
      + (lean * (1 - 0.5 * body) + depth * Math.sin(Math.PI * 2 * body + depthPhase) * grow) * rise;
    direction.set(0, 0, 0)
      .addScaledVector(frame.up, Math.cos(bend) * Math.cos(tilt) - droop * 1.3 * body * body)
      .addScaledVector(frame.side, Math.sin(bend) * Math.cos(tilt) + Math.sin(fan) * 0.9 * (1 - rise))
      .addScaledVector(frame.back, Math.sin(tilt))
      .normalize();
    position.addScaledVector(direction, length / steps);
    trace.push(position.clone());
  }
  return new THREE.CatmullRomCurve3(trace.filter((_, index) => index % 6 === 0), false, 'centripetal');
}

// How far along the chain (0 root → 1 tip) each part of the sculpt sits, and how much it is
// narrowed there. The sculpt's first ROOT_ZONE is stretched over the chain's first `stalk` and
// narrowed toward the root, giving a long tapered stalk out of the tailbone; from TIP_ZONE on
// it narrows again to a fine point, sharper than the sculpt's own tip.
const ROOT_ZONE = 0.18;
const TIP_ZONE = 0.78;
const TIP_GIRTH = 0.08;
export const OUTLINE_RINGS = 12;
export const OUTLINE_SIDES = 8;
const ROOT_GIRTH = 0.2;
const stalkMap = (s, stalk) => {
  const tip = 1 - (1 - TIP_GIRTH) * smoothstep(TIP_ZONE, 1, s) ** 1.2;
  return s < ROOT_ZONE
    ? { u: stalk * (s / ROOT_ZONE), girth: (ROOT_GIRTH + (1 - ROOT_GIRTH) * smoothstep(0, 1, s / ROOT_ZONE) ** 0.8) * tip }
    : { u: stalk + (1 - stalk) * ((s - ROOT_ZONE) / (1 - ROOT_ZONE)), girth: tip };
};

// Read the sculpt once. It runs tip → root along +z (the flat cut root is at +z); per vertex we
// keep how far down the tail it is, its offset from the tail's core, and its normal expressed
// in the tail's own frame. `profile` is the sculpt's radius along its length: the outline the
// collision spheres follow.
export function prepareTailSource(geometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const length = max.z - min.z;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const count = position.count;
  const bins = 48;
  const centreX = new Float32Array(bins);
  const centreY = new Float32Array(bins);
  const binCount = new Uint32Array(bins);
  const along = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    along[index] = (max.z - position.getZ(index)) / length;
    const bin = Math.min(bins - 1, Math.floor(along[index] * bins));
    centreX[bin] += position.getX(index);
    centreY[bin] += position.getY(index);
    binCount[bin] += 1;
  }
  for (let bin = 0; bin < bins; bin += 1) {
    centreX[bin] /= Math.max(binCount[bin], 1);
    centreY[bin] /= Math.max(binCount[bin], 1);
  }
  const offsetX = new Float32Array(count);
  const offsetY = new Float32Array(count);
  const normalT = new Float32Array(count);
  const normalX = new Float32Array(count);
  const normalY = new Float32Array(count);
  const radius = new Float32Array(bins);
  for (let index = 0; index < count; index += 1) {
    const bin = Math.min(bins - 1, Math.floor(along[index] * bins));
    // Running root → tip mirrors the sculpt; flip x so it isn't turned inside out.
    offsetX[index] = -(position.getX(index) - centreX[bin]);
    offsetY[index] = position.getY(index) - centreY[bin];
    radius[bin] = Math.max(radius[bin], Math.hypot(offsetX[index], offsetY[index]));
    normalT[index] = -normal.getZ(index);
    normalX[index] = -normal.getX(index);
    normalY[index] = normal.getY(index);
  }
  // Soften the outline so a stray lock doesn't inflate a whole collision sphere, and sit a
  // little inside it: neighbouring tails may brush fur, but their cores shouldn't cross.
  const profile = Array.from(radius, (_, bin) => {
    let sum = 0;
    for (let offset = -2; offset <= 2; offset += 1) sum += radius[Math.min(bins - 1, Math.max(0, bin + offset))];
    return (sum / 5) * 0.85;
  });
  // The low-poly collision shell: OUTLINE_RINGS rings along the tail, each an OUTLINE_SIDES-gon
  // whose corner radii follow the sculpt in that direction: the 95th-percentile distance, so the
  // shell hugs the visible fur without a single stray lock bulging it out.
  const samples = Array.from({ length: OUTLINE_RINGS }, () => Array.from({ length: OUTLINE_SIDES }, () => []));
  for (let index = 0; index < count; index += 1) {
    const ring = Math.round(along[index] * (OUTLINE_RINGS - 1));
    const angle = Math.atan2(offsetY[index], offsetX[index]);
    const sector = ((Math.round((angle / (Math.PI * 2)) * OUTLINE_SIDES) % OUTLINE_SIDES) + OUTLINE_SIDES) % OUTLINE_SIDES;
    samples[ring][sector].push(Math.hypot(offsetX[index], offsetY[index]));
  }
  const outline = samples.map((ring) => {
    const radii = ring.map((distances) => {
      if (!distances.length) return 0;
      distances.sort((a, b) => a - b);
      return distances[Math.floor(distances.length * 0.95)];
    });
    const fallback = Math.max(...radii) * 0.5;
    return Float32Array.from(radii, (radius) => radius || fallback);
  });
  return { length, count, along, offsetX, offsetY, normalT, normalX, normalY, index: geometry.getIndex(), profile, outline };
}

// One tail's skin: the sculpt fitted to a chain of `nodes` points. `frameNodes(points)` works out
// the chain's frames (parallel-transported), which the tails' shader poses the mesh by, with
// Catmull-Rom between points (kitsuneHologram.js).
// Bends are curvature-aware: on the inside of a bend, offsets are compressed smoothly so they
// never reach past the bend's centre (where they would fold through each other and pinch);
// the fur bunches up instead. Everything per-vertex is precomputed; a frame is interpolation.
export const BEND_REACH = 0.85;
// The mesh follows a smoothed copy of the chain (Taubin: a shrink step then an inflate step, so
// the curve loses its solver jitter but keeps its length and shape).
const SMOOTH_PASSES = 3;
const SMOOTH_SHRINK = 0.5;
const SMOOTH_INFLATE = -0.53;
// Smooth 3D value noise, for the coat markings.
const hash3 = (x, y, z) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const valueNoise = (x, y, z) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const lerp = (a, b, t) => a + (b - a) * t;
  const corner = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return lerp(
    lerp(lerp(corner(0, 0, 0), corner(1, 0, 0), sx), lerp(corner(0, 1, 0), corner(1, 1, 0), sx), sy),
    lerp(lerp(corner(0, 0, 1), corner(1, 0, 1), sx), lerp(corner(0, 1, 1), corner(1, 1, 1), sx), sy),
    sz,
  );
};

export function createTailSkin(source, { nodes, length, stalk, girth, reference, markingSeed = 0 }) {
  const segments = nodes - 1;
  const bodyScale = ((length * (1 - stalk)) / (source.length * (1 - ROOT_ZONE))) * girth;
  const vertexU = new Float32Array(source.count);
  const vertexX = new Float32Array(source.count);
  const vertexY = new Float32Array(source.count);
  for (let index = 0; index < source.count; index += 1) {
    const { u, girth: taper } = stalkMap(source.along[index], stalk);
    vertexU[index] = u;
    vertexX[index] = source.offsetX[index] * bodyScale * taper;
    vertexY[index] = source.offsetY[index] * bodyScale * taper;
  }
  // Collision radius at each chain point, from the sculpt's outline under the same mapping.
  const radii = Array.from({ length: nodes }, (_, node) => {
    const u = node / segments;
    const s = u < stalk ? (u / stalk) * ROOT_ZONE : ROOT_ZONE + ((u - stalk) / (1 - stalk)) * (1 - ROOT_ZONE);
    const bin = Math.min(source.profile.length - 1, Math.floor(s * source.profile.length));
    return source.profile[bin] * bodyScale * stalkMap(s, stalk).girth;
  });

  const geometry = new THREE.BufferGeometry();
  // Posed by the tails' shader from nodeData (kitsuneHologram.js); the position attribute is only
  // there for the vertex count.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(source.count * 3), 3));
  // How far down the tail each vertex is (0 root → 1 tip), for the hologram's gradients.
  geometry.setAttribute('along', new THREE.BufferAttribute(vertexU, 1));
  // Coat markings: a smooth two-octave noise over the sculpt's rest shape, so patches of fur
  // keep their colour as the tail moves. Each tail gets its own pattern from `markingSeed`.
  const markings = new Float32Array(source.count);
  for (let index = 0; index < source.count; index += 1) {
    const x = source.offsetX[index] * 6 + markingSeed * 17.3;
    const y = source.offsetY[index] * 6 + markingSeed * 5.1;
    const z = source.along[index] * 9;
    markings[index] = valueNoise(x, y, z) * 0.7 + valueNoise(x * 2.3, y * 2.3, z * 2.3) * 0.3;
  }
  geometry.setAttribute('marking', new THREE.BufferAttribute(markings, 1));
  // Each vertex's offset from the chain and its normal, in the chain's frame, for the shader.
  const restOffset = new Float32Array(source.count * 2);
  const restNormal = new Float32Array(source.count * 3);
  for (let index = 0; index < source.count; index += 1) {
    restOffset[index * 2] = vertexX[index];
    restOffset[index * 2 + 1] = vertexY[index];
    restNormal[index * 3] = source.normalT[index];
    restNormal[index * 3 + 1] = source.normalX[index];
    restNormal[index * 3 + 2] = source.normalY[index];
  }
  geometry.setAttribute('restOffset', new THREE.BufferAttribute(restOffset, 2));
  geometry.setAttribute('restNormal', new THREE.BufferAttribute(restNormal, 3));
  geometry.setIndex(source.index);

  const tangents = Array.from({ length: nodes }, () => new THREE.Vector3());
  const sides = Array.from({ length: nodes }, () => new THREE.Vector3());
  const ups = Array.from({ length: nodes }, () => new THREE.Vector3());
  // Curvature at each chain point: `bends` holds the unit direction toward the bend's centre,
  // `curvatures` 1 / bend radius.
  const bends = Array.from({ length: nodes }, () => new THREE.Vector3());
  const curvatures = new Float32Array(nodes);
  const rawCurvatures = new Float32Array(nodes);
  const spacing = length / segments;
  const smoothed = Array.from({ length: nodes }, () => new THREE.Vector3());
  const buffer = Array.from({ length: nodes }, () => new THREE.Vector3());
  const smoothPass = (from, to, weight) => {
    to[0].copy(from[0]);
    to[1].copy(from[1]);
    to[segments].copy(from[segments]);
    for (let node = 2; node < segments; node += 1) {
      to[node].copy(from[node - 1]).add(from[node + 1]).multiplyScalar(0.5).sub(from[node]).multiplyScalar(weight).add(from[node]);
    }
  };

  // The chain's frames for the shader to pose the mesh by (kitsuneHologram.js), 4 vec4s a node:
  // (point, curvature), (tangent, bend x), (side, bend y), (up, bend z).
  const nodeData = new Float32Array(nodes * 16);
  const frameNodes = (chainPoints) => {
    for (let node = 0; node < nodes; node += 1) smoothed[node].copy(chainPoints[node]);
    for (let pass = 0; pass < SMOOTH_PASSES; pass += 1) {
      smoothPass(smoothed, buffer, SMOOTH_SHRINK);
      smoothPass(buffer, smoothed, SMOOTH_INFLATE);
    }
    const points = smoothed;
    for (let node = 0; node < nodes; node += 1) {
      tangents[node].subVectors(points[Math.min(node + 1, segments)], points[Math.max(node - 1, 0)]).normalize();
    }
    // Parallel transport: carry the reference "side" down the chain with minimal twist.
    sides[0].copy(reference).addScaledVector(tangents[0], -reference.dot(tangents[0])).normalize();
    for (let node = 1; node < nodes; node += 1) {
      sides[node].copy(sides[node - 1]).addScaledVector(tangents[node], -sides[node - 1].dot(tangents[node])).normalize();
    }
    for (let node = 0; node < nodes; node += 1) ups[node].crossVectors(tangents[node], sides[node]);
    for (let node = 0; node < nodes; node += 1) {
      const before = points[Math.max(node - 1, 0)];
      const after = points[Math.min(node + 1, segments)];
      const bend = bends[node].copy(before).add(after).addScaledVector(points[node], -2);
      // Only the part of the bend across the tail matters.
      bend.addScaledVector(tangents[node], -bend.dot(tangents[node]));
      const amount = bend.length();
      rawCurvatures[node] = node > 0 && node < segments ? amount / (spacing * spacing) : 0;
      if (amount > 1e-9) bend.divideScalar(amount);
    }
    // Average curvature with its neighbours so the bend easing changes gradually along the tail.
    for (let node = 0; node < nodes; node += 1) {
      curvatures[node] = (rawCurvatures[Math.max(node - 1, 0)] + 2 * rawCurvatures[node] + rawCurvatures[Math.min(node + 1, segments)]) / 4;
    }
    for (let node = 0; node < nodes; node += 1) {
      const o = node * 16;
      smoothed[node].toArray(nodeData, o);
      nodeData[o + 3] = curvatures[node];
      tangents[node].toArray(nodeData, o + 4);
      sides[node].toArray(nodeData, o + 8);
      ups[node].toArray(nodeData, o + 12);
      nodeData[o + 7] = bends[node].x;
      nodeData[o + 11] = bends[node].y;
      nodeData[o + 15] = bends[node].z;
    }
  };

  // The collision shell under the same stalk mapping: each ring's place on the chain and its
  // corner offsets. `shell(points, out)` poses it on a chain (linear between points, with a
  // parallel-transported frame) into out[ring][side] and returns the ring centres.
  const rings = source.outline.map((radii, ring) => {
    const s = ring / (OUTLINE_RINGS - 1);
    const { u, girth: taper } = stalkMap(s, stalk);
    return {
      u,
      offsets: Array.from(radii, (radius, side) => {
        const angle = (side / OUTLINE_SIDES) * Math.PI * 2;
        return [Math.cos(angle) * radius * bodyScale * taper, Math.sin(angle) * radius * bodyScale * taper];
      }),
    };
  });
  const shellTangent = new THREE.Vector3();
  const shellSide = new THREE.Vector3();
  const shellUp = new THREE.Vector3();
  const nodeTangents = Array.from({ length: nodes }, () => new THREE.Vector3());
  const nodeSides = Array.from({ length: nodes }, () => new THREE.Vector3());
  const shell = (points, out, centres) => {
    for (let node = 0; node < nodes; node += 1) {
      nodeTangents[node].subVectors(points[Math.min(node + 1, segments)], points[Math.max(node - 1, 0)]).normalize();
    }
    nodeSides[0].copy(reference).addScaledVector(nodeTangents[0], -reference.dot(nodeTangents[0])).normalize();
    for (let node = 1; node < nodes; node += 1) {
      nodeSides[node].copy(nodeSides[node - 1]).addScaledVector(nodeTangents[node], -nodeSides[node - 1].dot(nodeTangents[node])).normalize();
    }
    rings.forEach((ring, index) => {
      const f = Math.min(ring.u * segments, segments - 1e-4);
      const node = Math.floor(f);
      const t = f - node;
      centres[index].lerpVectors(points[node], points[node + 1], t);
      shellTangent.lerpVectors(nodeTangents[node], nodeTangents[node + 1], t).normalize();
      shellSide.lerpVectors(nodeSides[node], nodeSides[node + 1], t).normalize();
      shellUp.crossVectors(shellTangent, shellSide);
      ring.offsets.forEach(([x, y], side) => {
        out[index][side].copy(centres[index]).addScaledVector(shellSide, x).addScaledVector(shellUp, y);
      });
    });
  };

  // `params`: what made it (bar the source and the reference), to make the same one elsewhere
  // (kitsuneCompute.worker.js).
  return { geometry, radii, rings, shell, markings, frameNodes, nodeData, params: { nodes, length, stalk, girth, markingSeed } };
}
