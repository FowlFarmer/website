import * as THREE from 'three';
import { createTailPhysics } from './kitsunePhysics.js';

// The tails' physics, run off the page's thread (kitsuneCompute.worker.js), behind the same face
// as createTailPhysics: `chains` (points, previous and shell corners, as of the worker's last
// answer), update(seconds), takeImpacts(hear), gust(position, velocity), settle. It also works out
// the frames the tails' shader poses their meshes by, which land in `skins`' nodeData as they
// arrive (kitsuneTails.js frameNodes).
// update() asks for the next step and takes whatever the worker last answered, so the tails drawn
// are a frame behind their physics. `ready` resolves once the worker has settled them.
// Where module workers aren't available, the physics runs here as before.
export function createTailCompute({ source, tails, skins, frame, scale }) {
  // The physics on this thread, the tails' frames worked out here too: without the worker, or if
  // it fails.
  const local = () => {
    const physics = createTailPhysics({ tails, frame, scale });
    const update = physics.update;
    physics.update = (seconds) => {
      update(seconds);
      skins.forEach((skin, index) => skin.frameNodes(physics.chains[index].points));
    };
    skins.forEach((skin, index) => skin.update(physics.chains[index].points));
    return Object.assign(physics, { ready: Promise.resolve(), dispose() {} });
  };
  let worker = null;
  try {
    worker = new Worker(new URL('./kitsuneCompute.worker.js', import.meta.url), { type: 'module' });
  } catch {
    return local();
  }
  let fallback = null;

  const nodes = tails[0].home.length;
  const ringCount = tails[0].skin.rings.length;
  const sideCount = tails[0].skin.rings[0].offsets.length;
  const chains = tails.map(({ home }) => ({
    points: home.map((point) => point.clone()),
    previous: home.map((point) => point.clone()),
    corners: Array.from({ length: ringCount }, () => Array.from({ length: sideCount }, () => new THREE.Vector3())),
  }));
  const impacts = new Map();
  const gusts = [];
  let buffers = null;
  let latest = null;
  let waiting = true;
  let owed = 0;
  let settle = null;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  // The worker's answer into the chains and meshes; its buffers are kept to hand back.
  const apply = (data) => {
    let p = 0;
    let c = 0;
    chains.forEach((chain) => {
      chain.points.forEach((point, node) => {
        point.fromArray(data.points, p);
        chain.previous[node].fromArray(data.previous, p);
        p += 3;
      });
      chain.corners.forEach((ring) => ring.forEach((corner) => { corner.fromArray(data.corners, c); c += 3; }));
    });
    skins.forEach((skin, index) => skin.nodeData.set(data.nodes[index]));
    for (let i = 0; i < data.impacts.length; i += 3) {
      const pair = data.impacts[i] * tails.length + data.impacts[i + 1];
      impacts.set(pair, Math.max(impacts.get(pair) ?? 0, data.impacts[i + 2]));
    }
    buffers = { points: data.points, previous: data.previous, corners: data.corners, nodes: data.nodes };
  };

  const send = () => {
    const transfer = buffers ? [buffers.points.buffer, buffers.previous.buffer, buffers.corners.buffer, ...buffers.nodes.map((a) => a.buffer)] : [];
    worker.postMessage({ type: 'step', seconds: owed, gusts: gusts.splice(0), buffers }, transfer);
    buffers = null;
    owed = 0;
    waiting = true;
  };

  worker.onmessage = ({ data }) => {
    if (data.type === 'ready') settle = data.settle;
    latest = data;
    waiting = false;
    if (data.type === 'ready') {
      apply(data);
      // The meshes' own geometry posed once, as they rest (the shader poses them from here on).
      skins.forEach((skin, index) => skin.update(chains[index].points));
      latest = null;
      resolveReady();
    }
  };
  worker.onerror = (error) => {
    console.error('Kitsune physics worker failed; running it on the page.', error);
    worker.terminate();
    if (fallback) return;
    fallback = local();
    resolveReady();
  };

  const vector = (v) => [v.x, v.y, v.z];
  worker.postMessage({
    type: 'init',
    // The skins' shared source (its index stays here: the worker doesn't draw).
    source: { ...source, index: null },
    tails: tails.map(({ home, phase, skin }) => ({ home: home.map(vector), phase, skin: skin.params })),
    frame: {
      side: vector(frame.side),
      back: vector(frame.back),
      ground: frame.ground,
      body: {
        torso: { from: vector(frame.body.torso.from), to: vector(frame.body.torso.to), radius: frame.body.torso.radius },
        head: { centre: vector(frame.body.head.centre), radius: frame.body.head.radius },
      },
    },
    scale,
  });

  return {
    get chains() { return fallback ? fallback.chains : chains; },
    ready,
    get settle() { return fallback ? fallback.settle : settle; },
    // Whether a step is out with the worker (for checking it against the physics here).
    get busy() { return !fallback && waiting; },
    update(seconds) {
      if (fallback) return fallback.update(seconds);
      owed += seconds;
      if (latest) {
        apply(latest);
        latest = null;
      }
      if (!waiting && buffers) send();
      return undefined;
    },
    takeImpacts(hear) {
      if (fallback) return fallback.takeImpacts(hear);
      impacts.forEach((speed, pair) => hear(Math.floor(pair / tails.length), pair % tails.length, speed));
      impacts.clear();
      return undefined;
    },
    gust(position, velocity) {
      if (fallback) return fallback.gust(position, velocity);
      // Passed on as they come: the physics there keeps its own last 24, as it would here.
      gusts.push(position.x, position.y, position.z, velocity.x, velocity.y, velocity.z);
      return undefined;
    },
    dispose() { worker.terminate(); },
  };
}
