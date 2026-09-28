// A fixed-aspect render preserves the authored perspective and crop. The
// authored frame's bottom-right corner stays pinned to the screen's
// bottom-right corner, so geometry the author cropped below or past the
// frame stays cropped. Resizing only scales that frame's image.
export function sceneViewport(width, height, referenceAspect, bounds, bottomInset = 0, anchorInset = bottomInset, maxStoreFraction = 0.6, target) {
  const availableHeight = Math.max(1, height - bottomInset);
  const naturalWidth = availableHeight * referenceAspect;
  // Only the part of the store inside the authored frame takes up screen.
  const visibleStoreSpan = Math.max(0, Math.min(bounds.storeMaxX, 1) - Math.max(bounds.storeMinX, -1));
  const naturalStoreWidth = naturalWidth * visibleStoreSpan / 2;
  const scale = Math.min(1, width * maxStoreFraction / Math.max(naturalStoreWidth, 1));
  const renderWidth = naturalWidth * scale;
  const renderHeight = availableHeight * scale;
  const view = target || {};
  view.x = width - renderWidth;
  // Browser chrome can move the anchor without changing the sizing frame.
  view.y = anchorInset;
  view.width = renderWidth;
  view.height = renderHeight;
  view.scale = scale;
  view.storeWidth = naturalStoreWidth * scale;
  return view;
}
