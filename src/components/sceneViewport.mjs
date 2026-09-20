// A fixed-aspect render preserves the authored perspective. Resizing the
// viewport scales its image, not the camera or the objects inside the scene.
export function sceneViewport(width, height, referenceAspect, bounds, bottomInset = 0) {
  const margin = 12;
  const availableHeight = Math.max(1, height - bottomInset);
  const naturalWidth = availableHeight * referenceAspect;
  const naturalStoreWidth = naturalWidth * bounds.storeWidth / 2;
  const naturalHeight = availableHeight * (bounds.maxY - bounds.minY) / 2;
  const scale = Math.min(1, width * 0.6 / Math.max(naturalStoreWidth, 1), Math.max(1, availableHeight - margin * 2) / Math.max(1, naturalHeight));
  // Expand the render frustum if needed, then translate its projected image.
  // This reveals geometry outside the original crop without rotating it.
  const expansion = Math.max(1, (bounds.maxX - bounds.minX) / 1.9, (bounds.maxY - bounds.minY) / 1.9);
  const renderWidth = naturalWidth * scale * expansion;
  const renderHeight = availableHeight * scale * expansion;
  return {
    x: width - margin - renderWidth * 0.975,
    y: bottomInset + margin - renderHeight * 0.025,
    width: renderWidth,
    height: renderHeight,
    projectionScale: 1 / expansion,
    shiftX: 0.95 - bounds.maxX / expansion,
    shiftY: -0.95 - bounds.minY / expansion,
    scale,
    storeWidth: naturalStoreWidth * scale,
  };
}
