import { KITSUNE_URLS } from '../experience/kitsuneFiles.js';
import { PHONE_HIGHLIGHT_BOOST } from '../experience/experienceStage.js';
import { createChimes } from '../experience/kitsuneChimes.js';
import { setStage } from '../../bootLoader.js';
import { markLoad, tuning } from '../frameStats.js';
import { KITSUNE_LAYER } from './sceneConfig.js';

// Loading the kitsune for the quests page into the scene (CherryBlossomScene.jsx): his files from
// the downloads, built, his and his glow's shaders compiled (after the lighting, which changes
// which they compile to), his textures onto the GPU one a frame, his glow warmed once. Reports to
// the loading screen as it goes (`progress`, the stage), hands what it built to `onBuilt` (the
// kitsune, his glow, the chimes), then calls `onReady`, or `onFailed` if anything gave out.
export function loadKitsuneStage({
  renderer, scene, loader, fromDownloads, compiled, environmentLoaded, mobile,
  frame, restoreViewport, disposed, progress, onHover, onBuilt, onReady, onFailed,
}) {
  let kitsune = null;
  let kitsuneGlow = null;
  // His textures onto the GPU one a frame before he's first drawn, instead of all in that frame
  // (with the page's other work going on, a freeze of a few hundred ms as he loaded).
  const uploadGradually = (root) => new Promise((resolve) => {
    const textures = new Set();
    root?.traverse((object) => [].concat(object.material ?? []).forEach((material) => {
      Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
      Object.values(material.uniforms ?? {}).forEach(({ value }) => { if (value?.isTexture) textures.add(value); });
    }));
    const queue = [...textures];
    const next = () => {
      if (disposed() || !queue.length) return resolve();
      renderer.initTexture(queue.shift());
      return window.requestAnimationFrame(next);
    };
    next();
  });
  const load = () => {
    markLoad('kitsune: requested');
    return Promise.all([import('../experience/kitsuneRig.js'), import('../experience/kitsuneHologram.js')])
      .then(([rig, hologram]) => Promise.all(KITSUNE_URLS.map(fromDownloads)).then(() => rig.loadKitsuneAssets(loader)).then((assets) => {
        if (disposed()) return undefined;
        markLoad('kitsune: downloaded');
        setStage('kitsune build');
        kitsune = rig.createKitsune(assets, {
          layer: KITSUNE_LAYER,
          highlightBoost: mobile ? PHONE_HIGHLIGHT_BOOST : 1,
          onHover,
        });
        scene.add(kitsune.root);
        const chimes = createChimes();
        const size = frame();
        if (mobile) kitsune.setPhoneView(size.width / size.height);
        else kitsune.setAspect(size.width / size.height);
        kitsuneGlow = hologram.createGlowLayer(renderer, scene, kitsune.camera);
        kitsuneGlow.setSize(size.width, size.height, tuning.glowScale);
        onBuilt({ kitsune, glow: kitsuneGlow, chimes });
        markLoad('kitsune: built');
        progress('kitsune setup', 0.4);
        // The tails settle on their thread while his shaders compile.
        setStage('tail physics');
        kitsune.ready.then(() => setStage('kitsune shaders'));
        // After the lighting: it changes which shaders his materials compile to.
        return Promise.resolve(environmentLoaded).then(() => Promise.all([
          compiled(renderer.compileAsync(kitsune.root, kitsune.camera, scene), 'Kitsune shaders').then(() => setStage('glow shaders')),
          compiled(kitsuneGlow.compile(kitsune.camera), 'Glow shaders'), kitsune.ready,
        ]));
      }))
      .then(() => {
        setStage('textures');
        return uploadGradually(kitsune?.root);
      })
      .then(() => {
        if (disposed() || !kitsune) return;
        setStage('glow');
        kitsune.update(0, performance.now());
        kitsuneGlow.warm();
        restoreViewport();
        markLoad('kitsune: compiled');
        progress('kitsune setup', 1);
        onReady();
      })
      .catch((error) => {
        console.error('Unable to load the kitsune.', error);
        onFailed();
      });
  };
  return load();
}
