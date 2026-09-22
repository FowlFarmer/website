import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetalWind } from './petalWind.mjs';

function field() {
  return createPetalWind(new Float32Array([0, 0, 3, 0, 0, 40]), new Float32Array([0, 0]), new Float32Array([.5, .5]), new Float32Array([.5, .5]));
}
function simulate(hz) {
  const wind = field();
  for (let n = 0; n <= hz * 3; n++) {
    const time = n / hz;
    if (time <= .5) wind.move(-.4 + time * 1.6, 0, time, 1);
    wind.step(1 / hz, time, 1);
  }
  return [...wind.displacement];
}
test('entry and stationary pointers create no gust', () => {
  const wind = field();
  wind.move(.4, .4, 0, 1);
  wind.move(.4, .4, .05, 1);
  for (let i = 0; i < 120; i++) wind.step(1 / 60, i / 60, 1);
  assert.deepEqual([...wind.displacement], [0, 0, 0, 0, 0, 0]);
});
test('swipes advect petals, with a smaller response at depth', () => {
  const result = simulate(60);
  assert.ok(result[0] > .02);
  assert.ok(result[0] > result[3]);
});
test('30/60/120 Hz remain close for the same pointer path', () => {
  const reference = simulate(60);
  for (const hz of [30, 120]) {
    const result = simulate(hz);
    assert.ok(Math.abs(result[0] - reference[0]) < .025, `${hz}: ${result[0]} vs ${reference[0]}`);
  }
});
test('wake fades without snapping displacement back to origin', () => {
  const wind = field();
  for (let n = 0; n < 30; n++) { wind.move(-.4 + n / 30 * .8, 0, n / 60, 1); wind.step(1 / 60, n / 60, 1); }
  for (let n = 30; n < 600; n++) wind.step(1 / 60, n / 60, 1);
  const settled = wind.displacement[0];
  for (let n = 600; n < 900; n++) wind.step(1 / 60, n / 60, 1);
  assert.ok(settled > .02);
  assert.ok(Math.abs(wind.displacement[0] - settled) < .001);
});
test('resize and re-entry do not produce teleport gusts', () => {
  const wind = field();
  wind.move(-.4, 0, 0, 1);
  wind.leave();
  wind.move(.8, 0, .03, 1);
  wind.step(.02, .03, 1);
  assert.equal(wind.displacement[0], 0);
  wind.step(30, 30, 2);
  assert.ok([...wind.displacement].every(Number.isFinite));
  assert.equal(wind.displacement[0], 0);
});
test('tap puffs send petals outward and then dissipate', () => {
  const wind = createPetalWind(new Float32Array([-.18, 0, 3, .18, 0, 3]), new Float32Array([0, 0]), new Float32Array([.5, .5]), new Float32Array([.5, .5]));
  wind.burst(0, 0, 1);
  for (let i = 0; i < 60; i++) wind.step(1 / 60, i / 60, 1);
  assert.ok(wind.displacement[0] < -.02);
  assert.ok(wind.displacement[3] > .02);
  for (let i = 60; i < 2000; i++) wind.step(1 / 60, i / 60, 1);
  assert.equal(wind.step(1 / 60, 34, 1), false, 'idle simulation should sleep');
});
test('resizing notifies the GPU even when reset leaves the simulation idle', () => {
  const wind = field();
  wind.burst(0, 0, 1);
  wind.step(.05, .05, 1);
  assert.equal(wind.step(.05, .1, 2), true);
  assert.deepEqual([...wind.displacement], [0, 0, 0, 0, 0, 0]);
  assert.equal(wind.step(.05, .15, 2), false);
});
