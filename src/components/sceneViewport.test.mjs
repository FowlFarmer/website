import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneViewport } from './sceneViewport.mjs';
// Authored store: extends past the right edge and below the bottom edge.
const bounds = { storeMinX: 0.1, storeMaxX: 1.2 };
const referenceAspect = 1.7683956574185766;

test('authored aspect at scale 1 reproduces the editor frame exactly', () => {
  const height = 900;
  const width = height * referenceAspect;
  const view = sceneViewport(width, height, referenceAspect, bounds);
  assert.equal(view.scale, 1);
  assert.ok(Math.abs(view.x) < 1e-9);
  assert.equal(view.y, 0);
  assert.ok(Math.abs(view.width - width) < 1e-9);
  assert.equal(view.height, height);
});

test('wider screens keep the authored frame pinned bottom-right at full size', () => {
  const view = sceneViewport(2560, 1080, referenceAspect, bounds);
  assert.equal(view.scale, 1);
  assert.equal(view.height, 1080);
  assert.ok(Math.abs(view.x + view.width - 2560) < 1e-9);
  assert.equal(view.y, 0);
});

test('phone through ultrawide keeps aspect, 60% cap and the bottom-right corner', () => {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1080]]) {
    const inset = 24;
    const view = sceneViewport(width, height, referenceAspect, bounds, inset);
    assert.ok(view.storeWidth <= width * 0.6 + 1e-9);
    assert.ok(Math.abs(view.x + view.width - width) < 1e-9);
    assert.equal(view.y, inset);
    assert.ok(Math.abs(view.width / view.height - referenceAspect) < 1e-9);
    assert.ok(view.scale <= 1);
    assert.ok(view.height <= height - inset + 1e-9);
  }
});

test('cropped store geometry is never revealed by the cap', () => {
  const view = sceneViewport(390, 844, referenceAspect, bounds);
  // The right edge of the authored frame is the right edge of the screen, so
  // anything the author placed past NDC x = 1 stays off screen.
  const frameRight = view.x + view.width;
  const storeRight = view.x + (bounds.storeMaxX + 1) * view.width / 2;
  assert.ok(storeRight > frameRight);
  assert.ok(Math.abs(frameRight - 390) < 1e-9);
});

test('size is continuous at the threshold', () => {
  const visibleSpan = Math.min(bounds.storeMaxX, 1) - Math.max(bounds.storeMinX, -1);
  const threshold = 900 * referenceAspect * visibleSpan / 2 / 0.6;
  const above = sceneViewport(threshold + 0.01, 900, referenceAspect, bounds);
  const below = sceneViewport(threshold - 0.01, 900, referenceAspect, bounds);
  assert.equal(above.scale, 1);
  assert.ok(Math.abs(above.width - below.width) < 0.02);
});

test('Safari toolbar moves only the bottom anchor while the sizing frame stays fixed', () => {
  const collapsed = sceneViewport(390, 844, referenceAspect, bounds, 120, 0);
  for (const anchorInset of [120, 80, 40, 0, 40, 120]) {
    const view = sceneViewport(390, 844, referenceAspect, bounds, 120, anchorInset);
    assert.equal(view.y, anchorInset);
    for (const key of ['x', 'width', 'height', 'scale', 'storeWidth']) {
      assert.equal(view[key], collapsed[key], `${key} must not change with browser chrome`);
    }
    assert.ok(Math.abs(view.x + view.width - 390) < 1e-9);
  }
});
