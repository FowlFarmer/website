import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneViewport } from './sceneViewport.mjs';
const bounds = { minX: 0.4, maxX: 1.3, minY: -1.15, maxY: -0.5, storeWidth: 0.9 };

test('desktop view is unchanged until the store crosses 60% width', () => {
  const desktop = sceneViewport(1440, 900, 1.6, bounds);
  assert.equal(desktop.scale, 1);
  assert.equal(desktop.width, 1440);
  assert.equal(desktop.height, 900);
  const narrower = sceneViewport(1200, 900, 1.6, bounds);
  assert.equal(narrower.scale, 1);
  assert.equal(narrower.storeWidth, desktop.storeWidth);
});

test('phone through ultrawide maintains angle, width cap and bottom-right anchor', () => {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1080]]) {
    const view = sceneViewport(width, height, 1.6, bounds, 24);
    assert.ok(view.storeWidth <= width * 0.6 + 1e-9);
    const right = view.x + (bounds.maxX * view.projectionScale + view.shiftX + 1) * view.width / 2;
    const bottom = view.y + (bounds.minY * view.projectionScale + view.shiftY + 1) * view.height / 2;
    const left = right - view.storeWidth;
    assert.ok(Math.abs(right - (width - 12)) < 1e-9);
    assert.ok(Math.abs(bottom - 36) < 1e-9);
    assert.ok(left >= 0);
    assert.ok(Math.abs(view.width / view.height - 1.6) < 1e-9);
    assert.ok(view.scale <= 1);
  }
});

test('size is continuous at the threshold', () => {
  const threshold = 900 * 1.6 * 0.9 / 2 / 0.6;
  const above = sceneViewport(threshold + 0.01, 900, 1.6, bounds);
  const below = sceneViewport(threshold - 0.01, 900, 1.6, bounds);
  assert.equal(above.scale, 1);
  assert.ok(Math.abs(above.width - below.width) < 0.02);
});

test('oversized authored models are fully inside the render frustum', () => {
  const large = { minX: -2, maxX: 2, minY: -3, maxY: 1, storeWidth: 4 };
  const view = sceneViewport(390, 844, 1.6, large);
  for (const x of [large.minX, large.maxX]) assert.ok(Math.abs(x * view.projectionScale + view.shiftX) <= 1);
  for (const y of [large.minY, large.maxY]) assert.ok(Math.abs(y * view.projectionScale + view.shiftY) <= 1);
});
