// The 3D scene's settings: the authored framing, the editor's labels, and its tuned constants
// (CherryBlossomScene.jsx).
export const EMPTY_POSE = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  target: [0, 1.88, -2.8],
  fov: 43,
};

export const AXES = ['X', 'Y', 'Z'];
export const DEFAULT_FOG_DENSITY = 0.032;
export const DEFAULT_BACKDROP_FOG_DENSITY = 0.032;
export const DEFAULT_SCENE_POSE = {
  referenceAspect: 1.7683956574185766,
  camera: {
    position: [-2.632, 8.496, 31.296],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    target: [-11.179, 15.989, -1.807],
    fov: 32,
  },
  focus: {
    position: [-11.179, 15.989, -1.807],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    target: [-11.179, 15.989, -1.807],
    fov: 32,
  },
  backdrop: {
    position: [-15.528, 23.785, -24.933],
    rotation: [0, 12, 0],
    scale: [0.08, 0.08, 0],
    target: [-11.179, 15.989, -1.807],
    fov: 32,
  },
  store: {
    position: [-0.9, 6.468, -1.8],
    rotation: [0, 1.146, 0],
    scale: [13, 13, 13],
    target: [-11.179, 15.989, -1.807],
    fov: 32,
  },
  rider: {
    position: [-3.588, 7.56, 5.788],
    rotation: [0, -70.125, 0],
    scale: [1.5, 1.5, 1.5],
    target: [-11.179, 15.989, -1.807],
    fov: 32,
  },
  fogDensity: 0,
  backdropFogDensity: 0,
};
export const OBJECT_LABELS = {
  camera: 'Camera',
  focus: 'Parallax focal point',
  backdrop: 'Mount Fuji backdrop',
  store: 'Convenience store',
  rider: 'Bicycle rider',
};
export const TAB_LABELS = {
  camera: 'Camera',
  focus: 'Focus',
  backdrop: 'Backdrop',
  store: 'Store',
  rider: 'Rider',
};
export const POSE_STORAGE_KEY = 'convenience-store-scene-pose-v5';
export const PARALLAX_CAMERA_SWAY = { x: 0.78, y: 0.27, bob: 0.035 };
export const PARALLAX_FOCUS_SWAY = { x: 0.33, y: 0.18 };
// One full left-right-left cycle. Amplitude 1 matches the farthest desktop mouse.
export const MOBILE_YAW_PERIOD = 16;
// Keep the lower 65% of the portrait photo: raise Fuji by trimming sky only.
export const MOBILE_PHOTO_HEIGHT = 0.65;
// A firm flick (~1600 px/s) reaches the same pitch as a mouse at the screen edge.
export const MOBILE_PITCH_SPEED = 1600;
export const MOBILE_PITCH_SETTLE_MS = 70;
export const BACKDROP_COVER_OVERSCAN = 1.045;
export const BACKDROP_COVER_MAX_SCALE = 256;
export const BACKDROP_COVER_POINTER_STEPS = [-1, 0, 1];
export const BACKDROP_COVER_BOB_STEPS = [-1, 0, 1];
// Desktop renders at up to 1.5 pixels per CSS pixel: full Retina (2) cost roughly twice the GPU
// time in every layer (measured with the frame meter's audit) for a barely visible difference.
export const DESKTOP_PIXEL_RATIO_CAP = 1.5;
// How early (ms) a frame can come and still count against the frame cap.
export const FRAME_SLACK_MS = 2;
// Every device starts at 60 frames a second, phones included, and drops to 30 if it can't keep up
// (a steady 30 reads smoother than a ragged 45): judged over the first FRAME_JUDGE_FRAMES frames
// after FRAME_JUDGE_SETTLE_MS past the warm-up, late meaning over 1.5 frames apart, dropping if more
// than FRAME_LATE_SHARE of them are. Remembered on the device (FRAME_CAP_KEY), so a phone that
// can't keep up starts at 30 next time instead of stuttering through the judging again.
export const FRAME_JUDGE_SETTLE_MS = 2000;
export const FRAME_JUDGE_FRAMES = 180;
export const FRAME_LATE_SHARE = 0.2;
export const FRAME_CAP_KEY = 'scene-frame-cap';
// How long after the page last scrolled it counts as still scrolling (the preview's render settings).
export const SCROLL_SETTLE_MS = 150;
// The quests page's kitsune draws on its own layer, with its own camera and lights.
export const KITSUNE_LAYER = 3;
// How long the store and rider, or the kitsune, take to fade out or in.
export const FADE_MS = 450;
// The widest the phone band gets (width to height), as crop-kitsune-view.mjs's phone views allow.
export const PHONE_KITSUNE_ASPECT = 1.6;
export const LAYOUT_SETTLE_MS = 400;
