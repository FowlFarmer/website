// A fixed-aspect render preserves the authored perspective. Resizing the
// viewport scales its image, not the camera or the objects inside the scene.
export function sceneViewport(width, height, referenceAspect, storeWidthNdc, bottomInset = 0) {
  const availableHeight = Math.max(1, height - bottomInset);
  const naturalWidth = availableHeight * referenceAspect;
  const naturalStoreWidth = naturalWidth * storeWidthNdc / 2;
  const scale = Math.min(1, width * 0.6 / Math.max(naturalStoreWidth, 1));
  const renderWidth = naturalWidth * scale;
  const renderHeight = availableHeight * scale;
  return {
    x: width - renderWidth,
    y: bottomInset,
    width: renderWidth,
    height: renderHeight,
    scale,
    storeWidth: naturalStoreWidth * scale,
  };
}
