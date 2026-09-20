import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneViewport } from './sceneViewport.mjs';

test('desktop view is unchanged until the store crosses 60% width', () => {
  const desktop = sceneViewport(1440, 900, 1.6, 0.9);
  assert.equal(desktop.scale, 1);
  assert.equal(desktop.width, 1440);
  assert.equal(desktop.height, 900);
  const narrower = sceneViewport(1200, 900, 1.6, 0.9);
  assert.equal(narrower.scale, 1);
  assert.equal(narrower.storeWidth, desktop.storeWidth);
});

test('phone through ultrawide maintains angle, width cap and bottom-right anchor', () => {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1080]]) {
    const view = sceneViewport(width, height, 1.6, 0.9, 24);
    assert.ok(view.storeWidth <= width * 0.6 + 1e-9);
    assert.ok(Math.abs(view.x + view.width - width) < 1e-9);
    assert.equal(view.y, 24);
    assert.ok(Math.abs(view.width / view.height - 1.6) < 1e-9);
    assert.ok(view.scale <= 1);
  }
});

test('size is continuous at the threshold', () => {
  const threshold = 900 * 1.6 * 0.9 / 2 / 0.6;
  const above = sceneViewport(threshold + 0.01, 900, 1.6, 0.9);
  const below = sceneViewport(threshold - 0.01, 900, 1.6, 0.9);
  assert.equal(above.scale, 1);
  assert.ok(Math.abs(above.width - below.width) < 0.02);
});
