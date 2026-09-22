// A small, bounded wake of advecting air parcels. Positions and velocities use
// viewport-height units, so a horizontal swipe behaves like a vertical swipe.
const wrap = (value, span) => ((value + span / 2) % span + span) % span - span / 2;

export function createPetalWind(offsets, phases, tints, speeds) {
  const count = phases.length;
  const displacement = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 2);
  const gusts = [];
  let previousPointer = null;
  let aspect = 1;
  let active = false;
  let dirty = false;

  function reset() {
    active = false;
    dirty = true;
    gusts.length = 0;
    previousPointer = null;
    displacement.fill(0);
    velocity.fill(0);
  }

  function move(x, y, seconds, nextAspect) {
    if (Math.abs(nextAspect - aspect) > 0.01) { reset(); aspect = nextAspect; }
    const point = { x: x * aspect, y, time: seconds };
    const last = previousPointer;
    if (!last || seconds - last.time > 0.15) { previousPointer = point; return; }
    const dt = seconds - last.time;
    if (dt < 1 / 90) return;
    previousPointer = point;
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.002 || distance > 1) return;
    active = true;
    const speed = distance / dt;
    const strength = Math.min(1.6, speed * 0.32);
    // Distribute the wake along the stroke instead of teleporting a force to
    // the latest pointer. Strength is weighted by travel, not event frequency.
    const steps = Math.min(4, Math.max(1, Math.ceil(distance / 0.09)));
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      gusts.push({ x: last.x + dx * t, y: last.y + dy * t,
        vx: dx / distance * strength, vy: dy / distance * strength,
        weight: Math.min(1, distance / steps / 0.07), age: 0 });
    }
    if (gusts.length > 24) gusts.splice(0, gusts.length - 24);
  }

  function burst(x, y, nextAspect) {
    if (Math.abs(nextAspect - aspect) > 0.01) { reset(); aspect = nextAspect; }
    active = true;
    gusts.push({ x: x * aspect, y, vx: 0, vy: 0, weight: 1, age: 0, burst: true });
    if (gusts.length > 24) gusts.splice(0, gusts.length - 24);
  }

  function step(delta, time, nextAspect) {
    if (Math.abs(nextAspect - aspect) > 0.01) { reset(); aspect = nextAspect; }
    if (!active) { const changed = dirty; dirty = false; return changed; }
    dirty = false;
    // Avoid a large jump when resuming a hidden tab. Small integration steps
    // keep drag and trajectories consistent on 30, 60 and 120 Hz displays.
    const duration = Math.min(Math.max(delta, 0), 0.05);
    const steps = Math.max(1, Math.ceil(duration * 120));
    const dt = duration / steps;
    for (let s = 0; s < steps; s++) {
      for (let g = gusts.length - 1; g >= 0; g--) {
        const gust = gusts[g];
        gust.age += dt;
        if (gust.age > 2.4) { gusts.splice(g, 1); continue; }
        const drift = Math.exp(-gust.age * 1.1);
        gust.x += gust.vx * drift * dt * 0.5;
        gust.y += gust.vy * drift * dt * 0.5;
      }
      for (let i = 0; i < count; i++) {
        const j = i * 3, k = i * 2;
        const depth = offsets[j + 2];
        const phase = time + phases[i];
        const fall = wrap(offsets[j + 1] - time * speeds[i] * .18, 2.5);
        const x = wrap((offsets[j] + Math.sin(phase * .72 + depth) * .075 + Math.cos(phase * .23) * .028) * aspect + displacement[j], 2.5 * aspect);
        const y = wrap(fall + displacement[j + 1], 2.5);
        let airX = 0, airY = 0;
        for (const gust of gusts) {
          const dx = x - gust.x, dy = y - gust.y;
          const radius = gust.burst ? .28 + gust.age * .22 : .16 + gust.age * .16;
          if (dx * dx + dy * dy > 9 * radius * radius) continue;
          const influence = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius) - gust.age * 1.8) * gust.weight;
          if (gust.burst) {
            const distance = Math.hypot(dx, dy);
            const strength = 2.2 / Math.max(.07, distance);
            airX += dx * strength * influence;
            airY += dy * strength * influence;
            continue;
          }
          // A small curl at the wake's edges gives variation without random
          // frame-to-frame jitter or a radial "cursor repulsion" effect.
          const curl = (dx * gust.vy - dy * gust.vx) / radius * .22;
          airX += (gust.vx - dy / radius * curl) * influence;
          airY += (gust.vy + dx / radius * curl) * influence;
        }
        const depthResponse = .12 + .88 * Math.exp(-depth / 19);
        const response = (1.6 + tints[i] * 2.2) * depthResponse;
        const drag = 1 - Math.exp(-response * dt);
        const magnitude = Math.max(1, Math.hypot(airX, airY) / 1.5);
        velocity[k] += (airX / magnitude * depthResponse - velocity[k]) * drag;
        velocity[k + 1] += (airY / magnitude * depthResponse - velocity[k + 1]) * drag;
        displacement[j] = wrap(displacement[j] + velocity[k] * dt, 2.5 * aspect);
        displacement[j + 1] = wrap(displacement[j + 1] + velocity[k + 1] * dt, 2.5);
        const tilt = (velocity[k] * .8 + velocity[k + 1] * .3) * (0.7 + tints[i]);
        displacement[j + 2] += (tilt - displacement[j + 2]) * (1 - Math.exp(-4 * dt));
      }
    }
    if (!gusts.length && velocity.every(value => Math.abs(value) < 0.00001)) {
      active = false;
      velocity.fill(0);
      for (let i = 0; i < count; i++) displacement[i * 3 + 2] = 0;
    }
    return true;
  }
  return { move, burst, step, reset, displacement, leave: () => { previousPointer = null; } };
}
