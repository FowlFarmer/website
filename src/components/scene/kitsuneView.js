import { PHONE_KITSUNE_SCALE, PHONE_KITSUNE_SHARE } from '../experience/experienceStage.js';
import { PHONE_KITSUNE_ASPECT } from './sceneConfig.js';

// Where the kitsune's view sits on screen, in CSS pixels from the bottom left: on desktop scaled
// down about the bottom-right corner (`scale`, as the page scrolls).
// On phones he's a fixed band across the bottom of the visible screen instead (above any part
// of the canvas under Safari's toolbar), and doesn't shrink.
export function kitsuneViewOf({ width, height, mobile, viewportHeight, safeViewportHeight, scale }) {
  if (mobile) {
    const inset = Math.max(0, viewportHeight - safeViewportHeight);
    // A phone on its side: the right half of the screen, full height, with the page on the left.
    if (width > safeViewportHeight) {
      const half = Math.round(width / 2);
      return { x: half, y: inset, width: width - half, height: safeViewportHeight };
    }
    // The band (no wider than PHONE_KITSUNE_ASPECT), shrunk to PHONE_KITSUNE_SCALE in the
    // bottom-right corner.
    const bandHeight = safeViewportHeight * PHONE_KITSUNE_SHARE;
    const bandWidth = Math.min(width, bandHeight * PHONE_KITSUNE_ASPECT);
    const shownWidth = Math.round(bandWidth * PHONE_KITSUNE_SCALE);
    return { x: width - shownWidth, y: inset, width: shownWidth, height: Math.round(bandHeight * PHONE_KITSUNE_SCALE) };
  }
  return { x: (1 - scale) * width, y: 0, width: width * scale, height: height * scale };
}
