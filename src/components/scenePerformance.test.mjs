import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenePerformanceMonitor } from './scenePerformance.mjs';
function run(monitor, fps, seconds, start = 0) {
  let triggered = false;
  for (let t = start; t < start + seconds * 1000; t += 1000 / fps) triggered ||= monitor.sample(t);
  return triggered;
}
test('healthy 60 and intentional mobile 30 fps remain in 3D', () => {
  assert.equal(run(createScenePerformanceMonitor(60), 60, 30), false);
  assert.equal(run(createScenePerformanceMonitor(30), 30, 30), false);
});
test('startup warmup and a single bad window do not switch', () => {
  const m = createScenePerformanceMonitor();
  assert.equal(run(m, 12, 10), false);
  assert.equal(run(m, 60, 20, 10000), false);
});
test('sustained low FPS triggers after warmup and two windows', () => {
  assert.equal(run(createScenePerformanceMonitor(), 15, 16), true);
  assert.equal(run(createScenePerformanceMonitor(30), 15, 16), true);
});
test('repeated frame drops can trigger despite acceptable average FPS', () => {
  const m = createScenePerformanceMonitor();
  let now = 0, triggered = false;
  for (let i = 0; i < 1000; i++) { now += i % 2 ? 40 : 16; triggered ||= m.sample(now); }
  assert.equal(triggered, true);
});
test('visibility reset discards old samples and hidden-tab delay', () => {
  const m = createScenePerformanceMonitor();
  run(m, 15, 10);
  m.reset();
  assert.equal(run(m, 60, 20, 300000), false);
});
test('a background-tab pause is not a poor window', () => {
  const m = createScenePerformanceMonitor();
  assert.equal(run(m, 15, 10), false);
  assert.equal(m.sample(10_000), false);
  assert.equal(m.sample(40_000), false);
  assert.equal(run(m, 60, 20, 40_000), false);
});
test('two long pauses after one bad window still do not switch', () => {
  const m = createScenePerformanceMonitor();
  run(m, 15, 10);
  m.sample(10_000);
  m.sample(25_000);
  run(m, 60, 4, 25_000);
  m.sample(29_000);
  m.sample(50_000);
  assert.equal(run(m, 60, 12, 50_000), false);
});
test('a hidden document does not record samples', () => {
  const m = createScenePerformanceMonitor();
  run(m, 15, 10);
  globalThis.document = { hidden: true };
  try {
    assert.equal(m.sample(20_000), false);
    assert.equal(m.sample(24_000), false);
  } finally {
    delete globalThis.document;
  }
  assert.equal(run(m, 60, 20, 24_000), false);
});
