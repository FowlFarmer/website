import * as THREE from 'three';
import { OUTLINE_RINGS, OUTLINE_SIDES } from './kitsuneTails.js';

// Tail physics: each tail is a chain of points integrated with Verlet at a fixed 120 Hz.
// Tails collide in two layers: a core capsule along each tail's centreline keeps tails from ever
// passing through each other (closest points between centreline segments, which can't be fooled
// by deep crossings), and the low-poly shell then handles the surface contact.
// Forces: a spring back to the tail's home pose (stiff at the root, loose at the tip), a slow
// ambient sway, and gusts left by the mouse. Constraints, solved a few times per step: segment
// lengths; tail against tail using each tail's low-poly shell (convex segments between rings of
// the shell: a shell corner inside another tail's segment is pushed out along that segment's
// shallowest face); the figure's torso capsule and head sphere; the ground under his feet. The root two
// points are pinned to the tailbone.

const STEP = 1 / 120;
const ITERATIONS = 4;
// Velocity kept per step; 0.955 at 120 Hz loses ~99.6% of speed per second: heavy, calm tails.
const DAMPING = 0.045;
// Home springs (per second squared): soft enough that tails ease back rather than bounce.
const HOME_ROOT = 22;
const HOME_TIP = 1.5;
// Ambient sway: a gentle push, cycling every ~18 s and ~28 s.
const SWAY = 0.22;
const SWAY_RATE = 0.35;
const GUST_LIFETIME = 1.6;
const GUST_RADIUS = 0.75;
const GUST_GAIN = 0.4;
const GUST_MAX = 2.5;
// At runtime a contact is resolved gradually: each solver pass moves a point at most
// MAX_CORRECTION and only CONTACT_SOFTNESS of the way out, and touching points lose
// CONTACT_FRICTION of their speed. Pressed-together tails slide and settle instead of buzzing.
const MAX_CORRECTION = 0.015;
const CONTACT_SOFTNESS = 0.4;
const CONTACT_FRICTION = 0.12;
// At load the home poses are settled until no shell corner sits deeper than this in another tail.
const SETTLED_DEPTH = 0.002;
// The core capsule's radius as a fraction of the shell's mean radius at that point.
const CORE = 0.65;
// Bending: two links apart, points may come no closer than this share of their home distance,
// so the chain curves but never kinks.
const BEND_LIMIT = 0.92;

// Closest points between segments p1-q1 and p2-q2 (Ericson, Real-Time Collision Detection);
// returns the two segment parameters.
const d1 = new THREE.Vector3();
const d2 = new THREE.Vector3();
const r = new THREE.Vector3();
function closestParameters(p1, q1, p2, q2) {
  d1.subVectors(q1, p1);
  d2.subVectors(q2, p2);
  r.subVectors(p1, p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  const c = d1.dot(r);
  const b = d1.dot(d2);
  // Degenerate (zero-length) segments collapse to their start point instead of dividing by zero.
  if (a < 1e-12 && e < 1e-12) return [0, 0];
  if (a < 1e-12) return [0, Math.min(Math.max(f / e, 0), 1)];
  if (e < 1e-12) return [Math.min(Math.max(-c / a, 0), 1), 0];
  const denominator = a * e - b * b;
  let s = denominator > 1e-9 ? Math.min(Math.max((b * f - c * e) / denominator, 0), 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = Math.min(Math.max(-c / a, 0), 1);
  } else if (t > 1) {
    t = 1;
    s = Math.min(Math.max((b - c) / a, 0), 1);
  }
  return [s, t];
}
const PINNED = 2;
// The first shell rings sit on the stalks right at the tailbone, where the roots are pinned
// side by side; from here on tails must keep clear of each other.
const FIRST_COLLIDING_RING = 3;

const closestOnSegment = (point, from, to, target) => {
  const segment = target.subVectors(to, from);
  const t = Math.min(Math.max(new THREE.Vector3().subVectors(point, from).dot(segment) / segment.lengthSq(), 0), 1);
  return target.copy(from).addScaledVector(segment, t);
};

// Distances above are for tails about REFERENCE_LENGTH long; `scale` adapts them to bigger tails.
export const REFERENCE_LENGTH = 3.3;

export function createTailPhysics({ tails, frame, scale = 1 }) {
  const sway = SWAY * scale;
  const gustRadius = GUST_RADIUS * scale;
  const gustMax = GUST_MAX * scale;
  const maxCorrection = MAX_CORRECTION * scale;
  const settledDepth = SETTLED_DEPTH * scale;
  // tails: [{ home: Vector3[], skin: { shell, rings }, phase }]
  const chains = tails.map((tail) => {
    const count = tail.home.length;
    const rest = [];
    for (let node = 1; node < count; node += 1) rest.push(tail.home[node].distanceTo(tail.home[node - 1]));
    const span = [];
    for (let node = 2; node < count; node += 1) span.push(tail.home[node].distanceTo(tail.home[node - 2]));
    return {
      span,
      home: tail.home.map((point) => point.clone()),
      points: tail.home.map((point) => point.clone()),
      previous: tail.home.map((point) => point.clone()),
      skin: tail.skin,
      rest,
      phase: tail.phase,
      stiffness: tail.home.map((_, node) => HOME_TIP + (HOME_ROOT - HOME_TIP) * (1 - node / (count - 1)) ** 2.2),
      // Core radius at each chain point, from the shell rings around it; zero on the stalk.
      core: tail.home.map((_, node) => {
        const u = node / (count - 1);
        const { rings } = tail.skin;
        if (u < rings[FIRST_COLLIDING_RING].u) return 0;
        let index = rings.findIndex((ring) => ring.u >= u);
        if (index < 0) index = rings.length - 1;
        const mean = rings[index].offsets.reduce((sum, [x, y]) => sum + Math.hypot(x, y), 0) / rings[index].offsets.length;
        return mean * CORE;
      }),
      corners: Array.from({ length: OUTLINE_RINGS }, () => Array.from({ length: OUTLINE_SIDES }, () => new THREE.Vector3())),
      // Midway between neighbouring rings, along each side: extra test points so a tail crossing
      // another between rings is still caught.
      mids: Array.from({ length: OUTLINE_RINGS - 1 }, () => Array.from({ length: OUTLINE_SIDES }, () => new THREE.Vector3())),
      centres: Array.from({ length: OUTLINE_RINGS }, () => new THREE.Vector3()),
      bounds: Array.from({ length: OUTLINE_RINGS - 1 }, () => ({ centre: new THREE.Vector3(), radius: 0 })),
    };
  });
  const gusts = [];
  const scratch = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const push = new THREE.Vector3();
  const bestNormal = new THREE.Vector3();

  // Move a point on a chain at shell ring `ring` by `delta`, shared by its two nearest nodes.
  // The previous position moves with it: in Verlet a bare position change is a velocity kick,
  // and repeated small contact pushes turned into jitter. This relocates without adding speed.
  let settling = true;
  const nudge = (chain, ring, delta) => {
    if (!settling) {
      delta.multiplyScalar(CONTACT_SOFTNESS);
      const length = delta.length();
      if (length > maxCorrection) delta.multiplyScalar(maxCorrection / length);
    }
    const segments = chain.points.length - 1;
    const f = Math.min(chain.skin.rings[ring].u * segments, segments - 1e-4);
    const node = Math.floor(f);
    const t = f - node;
    [[node, 1 - t], [node + 1, t]].forEach(([index, weight]) => {
      if (index < PINNED || weight <= 0) return;
      const point = chain.points[index];
      const previous = chain.previous[index];
      point.addScaledVector(delta, weight);
      previous.addScaledVector(delta, weight);
      if (!settling) previous.lerp(point, CONTACT_FRICTION * weight);
    });
  };

  const poseShells = () => {
    chains.forEach((chain) => {
      chain.skin.shell(chain.points, chain.corners, chain.centres);
      chain.mids.forEach((ring, index) => ring.forEach((mid, side) => {
        mid.lerpVectors(chain.corners[index][side], chain.corners[index + 1][side], 0.5);
      }));
      chain.bounds.forEach((bound, ring) => {
        bound.centre.lerpVectors(chain.centres[ring], chain.centres[ring + 1], 0.5);
        let radius = 0;
        for (const corner of chain.corners[ring]) radius = Math.max(radius, corner.distanceTo(bound.centre));
        for (const corner of chain.corners[ring + 1]) radius = Math.max(radius, corner.distanceTo(bound.centre));
        bound.radius = radius;
      });
    });
  };

  // Is `point` inside the convex segment between rings `ring` and `ring + 1` of `chain`? If so,
  // return the shallowest way out (depth and outward normal) via bestNormal.
  const penetration = (point, chain, ring) => {
    const a = chain.corners[ring];
    const b = chain.corners[ring + 1];
    const centre = chain.bounds[ring].centre;
    let depth = Infinity;
    for (let side = 0; side < OUTLINE_SIDES; side += 1) {
      const next = (side + 1) % OUTLINE_SIDES;
      edgeA.subVectors(a[next], a[side]);
      edgeB.subVectors(b[side], a[side]);
      normal.crossVectors(edgeA, edgeB).normalize();
      if (normal.dot(scratch.subVectors(a[side], centre)) < 0) normal.negate();
      const distance = -normal.dot(scratch.subVectors(point, a[side]));
      if (distance < 0) return 0;
      if (distance < depth) {
        depth = distance;
        bestNormal.copy(normal);
      }
    }
    // End caps.
    normal.subVectors(chain.centres[ring + 1], chain.centres[ring]).normalize();
    let distance = normal.dot(scratch.subVectors(chain.centres[ring + 1], point));
    if (distance < 0) return 0;
    if (distance < depth) { depth = distance; bestNormal.copy(normal); }
    distance = -normal.dot(scratch.subVectors(chain.centres[ring], point));
    if (distance < 0) return 0;
    if (distance < depth) { depth = distance; bestNormal.copy(normal).negate(); }
    return depth;
  };

  // Move chain point `node` by `delta` (same relocation as nudge, for the core layer).
  const shift = (chain, node, delta, weight) => {
    if (node < PINNED || weight === 0) return;
    chain.points[node].addScaledVector(delta, weight);
    chain.previous[node].addScaledVector(delta, weight);
    if (!settling) chain.previous[node].lerp(chain.points[node], CONTACT_FRICTION * Math.min(Math.abs(weight) * 10, 1));
  };
  // How hard tails meet, for the chimes (kitsuneChimes.js): per pair of tails, the fastest they've
  // closed on each other at a contact (units per second) since takeImpacts last read it. Tails
  // resting against each other close at nothing; ones knocked together, fast.
  const impacts = new Float32Array(chains.length * chains.length);
  const velocityA = new THREE.Vector3();
  const velocityB = new THREE.Vector3();
  const velocityScratch = new THREE.Vector3();
  // A chain's velocity (per step) at `f` along its nodes (node index plus fraction), into `out`.
  const velocityAt = (chain, f, out) => {
    const node = Math.min(Math.floor(f), chain.points.length - 2);
    const t = f - node;
    out.subVectors(chain.points[node], chain.previous[node]).multiplyScalar(1 - t);
    return out.addScaledVector(velocityScratch.subVectors(chain.points[node + 1], chain.previous[node + 1]), t);
  };
  const ringNodes = (chain, ring) => Math.min(chain.skin.rings[ring].u * (chain.points.length - 1), chain.points.length - 1 - 1e-4);
  // A contact between tails i and j closing at `closing` (per step) along the contact normal.
  const noteImpact = (i, j, closing) => {
    if (settling || closing <= 0) return;
    const pair = Math.min(i, j) * chains.length + Math.max(i, j);
    impacts[pair] = Math.max(impacts[pair], closing / STEP);
  };

  const pointA = new THREE.Vector3();
  const pointB = new THREE.Vector3();
  const collideCores = () => {
    let deepest = 0;
    for (let i = 0; i < chains.length; i += 1) {
      for (let j = i + 1; j < chains.length; j += 1) {
        const a = chains[i];
        const b = chains[j];
        for (let m = 0; m < a.points.length - 1; m += 1) {
          if (!a.core[m] && !a.core[m + 1]) continue;
          for (let n = 0; n < b.points.length - 1; n += 1) {
            if (!b.core[n] && !b.core[n + 1]) continue;
            const [s, t] = closestParameters(a.points[m], a.points[m + 1], b.points[n], b.points[n + 1]);
            pointA.lerpVectors(a.points[m], a.points[m + 1], s);
            pointB.lerpVectors(b.points[n], b.points[n + 1], t);
            const reach = a.core[m] + (a.core[m + 1] - a.core[m]) * s + b.core[n] + (b.core[n + 1] - b.core[n]) * t;
            push.subVectors(pointB, pointA);
            const distance = push.length();
            if (distance >= reach) continue;
            deepest = Math.max(deepest, reach - distance);
            if (distance < 1e-6) push.copy(frame.side); else push.divideScalar(distance);
            if (!settling) {
              velocityAt(a, m + s, velocityA);
              velocityAt(b, n + t, velocityB);
              noteImpact(i, j, velocityA.sub(velocityB).dot(push));
            }
            let correction = (reach - distance) * 0.5;
            if (!settling) correction = Math.min(correction * CONTACT_SOFTNESS, maxCorrection);
            shift(a, m, push, -correction * (1 - s));
            shift(a, m + 1, push, -correction * s);
            shift(b, n, push, correction * (1 - t));
            shift(b, n + 1, push, correction * t);
          }
        }
      }
    }
    return deepest;
  };

  const collideTails = () => {
    poseShells();
    let deepest = 0;
    for (let i = 0; i < chains.length; i += 1) {
      for (let j = 0; j < chains.length; j += 1) {
        if (i === j) continue;
        const a = chains[i];
        const b = chains[j];
        for (let ringA = FIRST_COLLIDING_RING; ringA < OUTLINE_RINGS; ringA += 1) {
          const cornersA = a.corners[ringA];
          for (let ringB = FIRST_COLLIDING_RING; ringB < OUTLINE_RINGS - 1; ringB += 1) {
            const bound = b.bounds[ringB];
            // Broad phase: skip segments whose bounding spheres can't reach this ring.
            if (a.centres[ringA].distanceTo(bound.centre) > bound.radius * 2.2) continue;
            const resolve = (point, onRings) => {
              const depth = penetration(point, b, ringB);
              if (!depth) return;
              deepest = Math.max(deepest, depth);
              if (!settling) {
                velocityAt(a, ringNodes(a, onRings[0][0]), velocityA);
                velocityAt(b, (ringNodes(b, ringB) + ringNodes(b, ringB + 1)) / 2, velocityB);
                noteImpact(i, j, velocityB.sub(velocityA).dot(bestNormal));
              }
              // Share the correction: A's side moves out, B's segment moves the other way.
              onRings.forEach(([ring, weight]) => nudge(a, ring, push.copy(bestNormal).multiplyScalar(depth * 0.5 * weight)));
              nudge(b, ringB, push.copy(bestNormal).multiplyScalar(-depth * 0.25));
              nudge(b, ringB + 1, push.copy(bestNormal).multiplyScalar(-depth * 0.25));
            };
            for (const corner of cornersA) resolve(corner, [[ringA, 1]]);
            if (ringA < OUTLINE_RINGS - 1) {
              for (const mid of a.mids[ringA]) resolve(mid, [[ringA, 0.5], [ringA + 1, 0.5]]);
            }
          }
        }
      }
    }
    return deepest;
  };

  const pushOffBody = (chain) => {
    const { torso, head } = frame.body;
    for (let ring = FIRST_COLLIDING_RING; ring < OUTLINE_RINGS; ring += 1) {
      for (const corner of chain.corners[ring]) {
        closestOnSegment(corner, torso.from, torso.to, closest);
        scratch.subVectors(corner, closest);
        let depth = torso.radius - scratch.length();
        if (depth > 0) nudge(chain, ring, scratch.normalize().multiplyScalar(depth));
        scratch.subVectors(corner, head.centre);
        depth = head.radius - scratch.length();
        if (depth > 0) nudge(chain, ring, scratch.normalize().multiplyScalar(depth));
        depth = frame.ground - corner.y;
        if (depth > 0) nudge(chain, ring, scratch.set(0, depth, 0));
      }
    }
  };

  const solveBends = (chain) => {
    const { points } = chain;
    for (let node = 2; node < points.length; node += 1) {
      const a = points[node - 2];
      const b = points[node];
      scratch.subVectors(b, a);
      const distance = scratch.length() || 1e-6;
      const minimum = chain.span[node - 2] * BEND_LIMIT;
      if (distance >= minimum) continue;
      const error = (distance - minimum) / distance;
      if (node - 2 < PINNED) {
        b.addScaledVector(scratch, -error);
      } else {
        a.addScaledVector(scratch, error * 0.5);
        b.addScaledVector(scratch, -error * 0.5);
      }
    }
  };

  const solveLengths = (chain) => {
    const { points } = chain;
    for (let node = 1; node < points.length; node += 1) {
      const a = points[node - 1];
      const b = points[node];
      scratch.subVectors(b, a);
      const distance = scratch.length() || 1e-6;
      const error = (distance - chain.rest[node - 1]) / distance;
      if (node - 1 < PINNED) {
        b.addScaledVector(scratch, -error);
      } else {
        a.addScaledVector(scratch, error * 0.5);
        b.addScaledVector(scratch, -error * 0.5);
      }
    }
  };

  const constrain = () => {
    chains.forEach(solveLengths);
    chains.forEach(solveBends);
    const core = collideCores();
    const deepest = Math.max(core, collideTails());
    chains.forEach(pushOffBody);
    return deepest;
  };

  // Settle the home poses fully before the first frame: if tails overlapped at home, their
  // springs and collisions would fight from the start, which is what made them thrash on load.
  let settlePasses = 0;
  let settleDepth = Infinity;
  while (settlePasses < 2000) {
    settlePasses += 1;
    settleDepth = constrain();
    if (settleDepth < settledDepth && settlePasses > 10) break;
  }
  chains.forEach((chain) => chain.points.forEach((point, node) => {
    chain.home[node].copy(point);
    chain.previous[node].copy(point);
  }));
  settling = false;

  const force = new THREE.Vector3();
  // Safety net: if a chain ever holds a non-finite value, return that tail to its home pose
  // rather than letting it corrupt every frame after.
  const recoverInvalid = () => {
    chains.forEach((chain) => {
      const broken = chain.points.some((point) => !Number.isFinite(point.x + point.y + point.z));
      if (!broken) return;
      chain.points.forEach((point, node) => {
        point.copy(chain.home[node]);
        chain.previous[node].copy(chain.home[node]);
      });
    });
  };

  const step = (time) => {
    for (let index = gusts.length - 1; index >= 0; index -= 1) {
      gusts[index].age += STEP;
      if (gusts[index].age > GUST_LIFETIME) gusts.splice(index, 1);
    }
    chains.forEach((chain) => {
      const count = chain.points.length;
      for (let node = PINNED; node < count; node += 1) {
        const point = chain.points[node];
        const previous = chain.previous[node];
        const u = node / (count - 1);
        force.subVectors(chain.home[node], point).multiplyScalar(chain.stiffness[node]);
        // Ambient sway: slow, out of step between tails, growing toward the tip.
        const push = sway * u * u;
        force.addScaledVector(frame.side, Math.sin(time * SWAY_RATE + chain.phase + u * 2.4) * push);
        force.addScaledVector(frame.back, Math.sin(time * SWAY_RATE * 0.64 + chain.phase * 1.3 + u * 1.7) * push * 0.6);
        for (const gust of gusts) {
          const distanceSq = point.distanceToSquared(gust.position);
          const falloff = Math.exp(-distanceSq / (2 * gustRadius * gustRadius) - gust.age * 2.2);
          force.addScaledVector(gust.velocity, falloff * GUST_GAIN * (0.3 + u));
        }
        scratch.subVectors(point, previous).multiplyScalar(1 - DAMPING);
        previous.copy(point);
        point.add(scratch).addScaledVector(force, STEP * STEP);
      }
      for (let node = 0; node < PINNED; node += 1) chain.points[node].copy(chain.home[node]);
    });
    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) constrain();
    recoverInvalid();
  };

  let accumulator = 0;
  let clock = 0;
  return {
    chains,
    settle: { passes: settlePasses, depth: settleDepth },
    update(seconds) {
      accumulator = Math.min(accumulator + seconds, STEP * 8);
      while (accumulator >= STEP) {
        clock += STEP;
        step(clock);
        accumulator -= STEP;
      }
    },
    // Each pair of tails that has met since the last call, and how fast they closed (units per
    // second): calls `hear(i, j, speed)`, then forgets them.
    takeImpacts(hear) {
      for (let i = 0; i < chains.length; i += 1) {
        for (let j = i + 1; j < chains.length; j += 1) {
          const pair = i * chains.length + j;
          if (impacts[pair] > 0) hear(i, j, impacts[pair]);
          impacts[pair] = 0;
        }
      }
    },
    // A gust at a world position moving with a world velocity (units per second).
    gust(position, velocity) {
      const speed = velocity.length();
      if (speed < 0.05) return;
      gusts.push({ position: position.clone(), velocity: velocity.clone().multiplyScalar(Math.min(1, gustMax / speed)), age: 0 });
      if (gusts.length > 24) gusts.shift();
    },
  };
}
