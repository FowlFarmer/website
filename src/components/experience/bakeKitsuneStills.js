// Dev only: bake the stills the 3D-off quests page shows in place of the live kitsune. In the
// browser console on the dev site, run `await window.__bakeKitsuneStills()`; the files land in
// public/kitsune-stills/ (scripts/dev/kitsuneStillsPlugin.mjs). Rebake whenever his placement, the
// camera, the tails or their colours change.
//
// It renders the real kitsune (kitsuneRig.js) through the site's glow layer (kitsuneHologram.js),
// with the tails held in one pose, once at rest and once with each tail lit as on hover. The live
// layer blends in linear light and adds glow where it's otherwise transparent; CSS can only blend
// in screen colours, so each state is solved into two layers that, over the backdrop, land on
// the live result (exactly on a 16:9 screen, where the backdrop behind him is known; very nearly
// on others):
//   - shade: his colour and transparency (drawn over the page normally)
//   - light: whatever the shade can't reach, on black (added on top, `mix-blend-mode: plus-lighter`)
// Plus a hover map: which tail's hover shell is nearest at each point, as in the live picking.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { createKitsune, loadKitsuneAssets } from './kitsuneRig.js';
import { createGlowLayer } from './kitsuneHologram.js';

// Framed as the live view is at full screen height, wide enough for the widest screen (2.4:1);
// the page places the crop around the view's centre, sized to the screen's height.
const HEIGHT = 1400;
const ASPECT = 2.4;
const WIDTH = Math.round(HEIGHT * ASPECT);
const HOVER_MAP_SCALE = 4;
const TAILS = 6;
// Anything fainter than this counts as empty when cropping.
const EMPTY = 0.004;
// The screen shape the backdrop behind him is solved for.
const REFERENCE_ASPECT = 16 / 9;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toScreen = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

const post = async (name, blob) => {
  const response = await fetch(`/__kitsune-still?name=${name}`, { method: 'POST', body: blob });
  if (!response.ok) throw new Error(`Saving ${name} failed`);
};
const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function bakeKitsuneStills() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.setClearColor(0x000000, 0);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const kitsune = createKitsune(await loadKitsuneAssets(loader), { layer: 0 });
  const scene = new THREE.Scene();
  scene.add(kitsune.root);
  kitsune.setAspect(ASPECT);
  kitsune.setSway(0, 0);
  const glow = createGlowLayer(renderer, scene, kitsune.camera);
  glow.setSize(WIDTH, HEIGHT);

  // Let the tails settle into their resting sway, then hold them there.
  const now = 20000;
  for (let step = 0; step < 600; step += 1) kitsune.update(1 / 60, now - (600 - step) * (1000 / 60));

  // The glow layer alone, linear and premultiplied, read back as floats (top row first).
  const floatTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.FloatType });
  const copy = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }',
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
  }));
  const renderState = (tail) => {
    kitsune.setHighlight(tail, tail >= 0 ? 1 : 0);
    for (let step = 0; step < 90; step += 1) kitsune.update(1 / 30, now, { still: true });
    copy.material.uniforms.tDiffuse.value = glow.glowTexture();
    renderer.setRenderTarget(floatTarget);
    copy.render(renderer);
    renderer.setRenderTarget(null);
    const pixels = new Float32Array(WIDTH * HEIGHT * 4);
    renderer.readRenderTargetPixels(floatTarget, 0, 0, WIDTH, HEIGHT, pixels);
    return pixels; // bottom row first
  };
  const stateCount = TAILS + 1;
  const stateTail = (index) => index - 1;

  // Crop every state to what any of them shows (a first pass; each state renders the same again).
  let [left, top, right, bottom] = [WIDTH, HEIGHT, 0, 0];
  for (let index = 0; index < stateCount; index += 1) {
    const pixels = renderState(stateTail(index));
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const i = (y * WIDTH + x) * 4;
        if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]) <= EMPTY) continue;
        const row = HEIGHT - 1 - y;
        if (x < left) left = x;
        if (x > right) right = x;
        if (row < top) top = row;
        if (row > bottom) bottom = row;
      }
    }
  }
  left = Math.floor(left / HOVER_MAP_SCALE) * HOVER_MAP_SCALE;
  top = Math.floor(top / HOVER_MAP_SCALE) * HOVER_MAP_SCALE;
  const cropWidth = Math.ceil((right + 1 - left) / HOVER_MAP_SCALE) * HOVER_MAP_SCALE;
  const cropHeight = Math.ceil((bottom + 1 - top) / HOVER_MAP_SCALE) * HOVER_MAP_SCALE;

  // The backdrop behind him on a 16:9 screen, as the page draws it (cover), in the capture's pixels.
  const photo = new Image();
  photo.src = '/images/scene/fuji_hd.jpg';
  await photo.decode();
  const referenceWidth = Math.round(HEIGHT * REFERENCE_ASPECT);
  const backdropCanvas = document.createElement('canvas');
  backdropCanvas.width = referenceWidth;
  backdropCanvas.height = HEIGHT;
  const cover = Math.max(referenceWidth / photo.naturalWidth, HEIGHT / photo.naturalHeight);
  backdropCanvas.getContext('2d').drawImage(photo, (referenceWidth - photo.naturalWidth * cover) / 2,
    (HEIGHT - photo.naturalHeight * cover) / 2, photo.naturalWidth * cover, photo.naturalHeight * cover);
  const backdrop = backdropCanvas.getContext('2d').getImageData(0, 0, referenceWidth, HEIGHT).data;
  const backdropAt = (x, row) => {
    const bx = Math.min(Math.max(x - Math.round((WIDTH - referenceWidth) / 2), 0), referenceWidth - 1);
    return (row * referenceWidth + bx) * 4;
  };

  // Solve a state into its two layers over that backdrop.
  const solve = (pixels) => {
    const shade = document.createElement('canvas');
    const light = document.createElement('canvas');
    for (const canvas of [shade, light]) { canvas.width = cropWidth; canvas.height = cropHeight; }
    const shadeImage = shade.getContext('2d').createImageData(cropWidth, cropHeight);
    const lightImage = light.getContext('2d').createImageData(cropWidth, cropHeight);
    for (let row = 0; row < cropHeight; row += 1) {
      for (let x = 0; x < cropWidth; x += 1) {
        const o = (row * cropWidth + x) * 4;
        lightImage.data[o + 3] = 255;
        const sourceRow = top + row;
        const sourceX = left + x;
        if (sourceRow >= HEIGHT || sourceX >= WIDTH) continue;
        const i = ((HEIGHT - 1 - sourceRow) * WIDTH + sourceX) * 4;
        const alpha = Math.min(Math.max(pixels[i + 3], 0), 1);
        const b = backdropAt(sourceX, sourceRow);
        shadeImage.data[o + 3] = Math.round(alpha * 255);
        for (let c = 0; c < 3; c += 1) {
          const behind = backdrop[b + c] / 255;
          // What the live layer shows here, and what CSS gets from a shade of colour s at this alpha.
          const target = Math.min(toScreen(Math.max(pixels[i + c], 0) + (1 - alpha) * toLinear(behind)), 1);
          const underneath = (1 - alpha) * behind;
          const colour = alpha > 0.002 ? Math.min(Math.max((target - underneath) / alpha, 0), 1) : 0;
          shadeImage.data[o + c] = Math.round(colour * 255);
          lightImage.data[o + c] = Math.round(Math.max(target - underneath - colour * alpha, 0) * 255);
        }
      }
    }
    shade.getContext('2d').putImageData(shadeImage, 0, 0);
    light.getContext('2d').putImageData(lightImage, 0, 0);
    return { shade, light };
  };

  const names = ['rest', ...Array.from({ length: TAILS }, (_, tail) => `tail-${tail}`)];
  const sizes = {};
  for (let index = 0; index < stateCount; index += 1) {
    const layers = solve(renderState(stateTail(index)));
    for (const kind of ['shade', 'light']) {
      const blob = await toBlob(layers[kind], 'image/webp', 0.86);
      await post(`${names[index]}-${kind}.webp`, blob);
      sizes[`${names[index]}-${kind}`] = `${Math.round(blob.size / 1024)} KB`;
    }
  }

  // The hover map: each tail's hover shell in its own flat colour, nearest in front, without
  // antialiasing so every pixel is exactly one tail (red = tail + 1) or none.
  const shells = kitsune.hoverShells;
  const hidden = [];
  kitsune.root.traverse((object) => {
    if (object.isMesh && !shells.includes(object) && object.visible) { object.visible = false; hidden.push(object); }
  });
  const shellMaterials = shells.map((shell) => shell.material);
  shells.forEach((shell, tail) => {
    shell.visible = true;
    shell.material = new THREE.MeshBasicMaterial({ color: new THREE.Color((tail + 1) / 255, 0, 0), side: THREE.DoubleSide, toneMapped: false });
  });
  const mapWidth = WIDTH / HOVER_MAP_SCALE;
  const mapHeight = HEIGHT / HOVER_MAP_SCALE;
  const target = new THREE.WebGLRenderTarget(mapWidth, mapHeight);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, kitsune.camera);
  const ids = new Uint8Array(mapWidth * mapHeight * 4);
  renderer.readRenderTargetPixels(target, 0, 0, mapWidth, mapHeight, ids);
  renderer.setRenderTarget(null);
  shells.forEach((shell, tail) => { shell.material.dispose(); shell.material = shellMaterials[tail]; shell.visible = false; });
  hidden.forEach((object) => { object.visible = true; });
  const map = document.createElement('canvas');
  map.width = cropWidth / HOVER_MAP_SCALE;
  map.height = cropHeight / HOVER_MAP_SCALE;
  const mapContext = map.getContext('2d');
  const mapImage = mapContext.createImageData(map.width, map.height);
  for (let row = 0; row < map.height; row += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const sourceRow = top / HOVER_MAP_SCALE + row;
      const sourceX = left / HOVER_MAP_SCALE + x;
      const o = (row * map.width + x) * 4;
      mapImage.data[o + 3] = 255;
      if (sourceRow >= mapHeight || sourceX >= mapWidth) continue;
      mapImage.data[o] = ids[((mapHeight - 1 - sourceRow) * mapWidth + sourceX) * 4];
    }
  }
  mapContext.putImageData(mapImage, 0, 0);
  await post('hover-map.png', await toBlob(map, 'image/png'));

  // Where the crop sits, in units of the view's height, from the view's centre (x) and top (y).
  const layout = {
    x: (left - WIDTH / 2) / HEIGHT,
    y: top / HEIGHT,
    width: cropWidth / HEIGHT,
    height: cropHeight / HEIGHT,
    tails: TAILS,
  };
  await post('layout.json', new Blob([JSON.stringify(layout)], { type: 'application/json' }));

  glow.dispose();
  target.dispose();
  floatTarget.dispose();
  copy.dispose();
  copy.material.dispose();
  kitsune.dispose();
  renderer.dispose();
  return { crop: `${cropWidth}x${cropHeight}`, layout, sizes };
}
