import { reportProgress, setStage } from '../bootLoader.js';
import { KITSUNE_URLS } from './experience/kitsuneFiles.js';

// The 3D scene's files, downloaded apart from the scene itself: they start with the page (beside
// the still backdrop), keep going if the page settles for 3D off (SceneBackground.jsx decides, from
// how fast they're coming), and the scene (CherryBlossomScene.jsx) builds from them once they're
// in, now or when 3D is switched on later. Counted byte by byte for the loading screen's
// percentage and for the download speed. Kept in memory once in (the scene hands them to three.js's
// file cache), so nothing downloads twice.

// Each file's size, for the totals until the server says (its Content-Length).
const EXPECTED_BYTES = {
  '/images/scene/fuji_hd.jpg': 281284,
  '/images/scene/fuji-mobile.jpg': 92597,
  '/models/lawson/lawson-mobile.glb': 1242156,
  '/models/cherry-blossom/bicycle-rider-512.glb': 519936,
  '/models/cherry-blossom/bicycle-rider-low.glb': 748268,
  '/models/cherry-blossom/bicycle-rider-mobile.glb': 958588,
  '/models/lawson/dawn-environment.hdr': 371346,
  '/models/kitsune/keria.glb': 2107476,
  '/models/kitsune/tail.glb': 29504,
  '/models/kitsune/cliff.glb': 1255212,
  '/models/kitsune/blossoms/open-blossom.glb': 108316,
  '/models/kitsune/blossoms/three-blossom-sprig.glb': 332252,
  '/models/kitsune/blossoms/opening-buds.glb': 58716,
  '/models/kitsune/blossoms/fallen-petals.glb': 34988,
};
// Their names under the loading screen's percentage while they download.
const STAGE_NAMES = [
  [/fuji/, 'backdrop photo'], [/lawson-mobile/, 'store model'], [/bicycle-rider/, 'rider'], [/\.hdr$/, 'lighting'],
  [/blossoms\//, 'blossoms'], [/tail\.glb/, 'tail'], [/cliff/, 'cliff'], [/kitsune\//, 'kitsune'],
];
// The downloads' share of the loading screen's percentage (against SCENE_PROGRESS_WEIGHT for the
// setup after; bootLoader.js).
export const DOWNLOAD_PROGRESS_WEIGHT = 6.5;

// The files this layout needs: the backdrop photo, the store, rider and lighting, the kitsune.
export function sceneFileUrls({ mobile, rider = '512' }) {
  return [
    mobile ? '/images/scene/fuji-mobile.jpg' : '/images/scene/fuji_hd.jpg',
    '/models/lawson/lawson-mobile.glb',
    `/models/cherry-blossom/bicycle-rider-${rider}.glb`,
    '/models/lawson/dawn-environment.hdr',
    ...KITSUNE_URLS,
  ];
}

const files = new Map(); // url -> { loaded, total, done, promise }
const listeners = new Set();
let startedAt = 0;

const stageName = (url) => STAGE_NAMES.find(([pattern]) => pattern.test(url))?.[1] ?? 'files';

// Bytes in and out of how many, across every file asked for; `elapsed` ms since the first started.
export function downloadProgress() {
  let loaded = 0;
  let total = 0;
  let done = files.size > 0;
  files.forEach((file) => {
    loaded += file.loaded;
    total += file.total;
    done &&= file.done;
  });
  return { loaded, total, done, elapsed: startedAt ? performance.now() - startedAt : 0 };
}

const changed = () => {
  const progress = downloadProgress();
  // Under the percentage, the file with the most still to come: what the wait is on. (Each file
  // naming itself as its bytes came in had parallel downloads fighting over it.)
  let longest = null;
  let most = 0;
  files.forEach((file, url) => {
    const left = file.done ? 0 : file.total - file.loaded;
    if (left > most) {
      most = left;
      longest = url;
    }
  });
  if (longest) setStage(stageName(longest));
  reportProgress('3D downloads', progress.total ? progress.loaded / progress.total : 0, DOWNLOAD_PROGRESS_WEIGHT);
  listeners.forEach((listener) => listener(progress));
};

// Calls `listener(downloadProgress())` as bytes come in; returns the unsubscribe.
export function onDownloadProgress(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const length = Number(response.headers.get('content-length'));
  // Compressed in transit, the length isn't the bytes that come out: keep the expected size then.
  if (length && !response.headers.get('content-encoding')) file.total = length;
  const reader = response.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    file.loaded += value.length;
    file.total = Math.max(file.total, file.loaded);
    changed();
  }
  const data = new Uint8Array(file.loaded);
  let offset = 0;
  chunks.forEach((chunk) => {
    data.set(chunk, offset);
    offset += chunk.length;
  });
  file.done = true;
  changed();
  return data.buffer;
}

// Starts any of `urls` not already downloading (again after a failure).
export function downloadSceneFiles(urls) {
  if (!startedAt) startedAt = performance.now();
  urls.forEach((url) => {
    if (files.has(url)) return;
    const file = { loaded: 0, total: EXPECTED_BYTES[url] ?? 500000, done: false };
    file.promise = download(url, file).catch((error) => {
      files.delete(url);
      changed();
      throw error;
    });
    files.set(url, file);
  });
  changed();
}

// One file's bytes (an ArrayBuffer) once it's in, downloading it if nothing has asked yet.
export function sceneFile(url) {
  if (!files.has(url)) downloadSceneFiles([url]);
  return files.get(url).promise;
}
