// The kitsune scene's files (kitsuneRig.js loads them; sceneFiles.js downloads them ahead).
export const MODEL_URL = `/models/kitsune/${new URLSearchParams(window.location.search).get('model') || 'keria'}.glb`;
export const TAIL_URL = '/models/kitsune/tail.glb';
export const CLIFF_URL = '/models/kitsune/cliff.glb';
// Small cherry blossom props for the ledge (assets/cherry-blossoms): open flowers, sprigs, buds and
// fallen petals, in metres.
export const BLOSSOM_URLS = ['open-blossom', 'three-blossom-sprig', 'opening-buds', 'fallen-petals']
  .map((name) => `/models/kitsune/blossoms/${name}.glb`);
export const KITSUNE_URLS = [MODEL_URL, TAIL_URL, CLIFF_URL, ...BLOSSOM_URLS];
