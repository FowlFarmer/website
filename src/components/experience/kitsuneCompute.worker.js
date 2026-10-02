import * as THREE from 'three';
import { createTailPhysics } from './kitsunePhysics.js';
import { createTailSkin } from './kitsuneTails.js';

// The tails' physics, off the page's thread (kitsuneCompute.js talks to it): the same code as on
// the page, so the same motion. Given the tails at 'init', it settles them and answers 'ready';
// then each 'step' (seconds, and the gusts since the last) runs the physics that far and answers
// with where everything is: the chains' points (now and a step ago), their collision shells'
// corners, the frames the tails' shader poses their meshes by (kitsuneTails.js frameNodes), all
// into buffers the page hands back each time so nothing is made per frame, and the knocks between
// tails since the last answer.
let physics = null;
let skins = [];
const gustPosition = new THREE.Vector3();
const gustVelocity = new THREE.Vector3();
const vector = ([x, y, z]) => new THREE.Vector3(x, y, z);

// Everything the page needs from a step, written into `buffers` (made here the first time).
function state(buffers) {
  const { chains } = physics;
  const nodes = chains[0].points.length;
  const corners = chains[0].corners.length * chains[0].corners[0].length;
  const out = buffers ?? {
    points: new Float64Array(chains.length * nodes * 3),
    previous: new Float64Array(chains.length * nodes * 3),
    corners: new Float64Array(chains.length * corners * 3),
    nodes: skins.map((skin) => new Float32Array(skin.nodeData.length)),
  };
  let p = 0;
  let c = 0;
  chains.forEach((chain) => {
    chain.points.forEach((point, node) => {
      point.toArray(out.points, p);
      chain.previous[node].toArray(out.previous, p);
      p += 3;
    });
    chain.corners.forEach((ring) => ring.forEach((corner) => { corner.toArray(out.corners, c); c += 3; }));
  });
  skins.forEach((skin, index) => {
    skin.frameNodes(chains[index].points);
    out.nodes[index].set(skin.nodeData);
  });
  const impacts = [];
  physics.takeImpacts((i, j, speed) => impacts.push(i, j, speed));
  return { ...out, impacts };
}

const transfers = ({ points, previous, corners, nodes }) => [points.buffer, previous.buffer, corners.buffer, ...nodes.map((array) => array.buffer)];

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    const { source, tails, frame, scale } = data;
    const reference = vector(frame.side);
    skins = tails.map(({ skin }) => createTailSkin(source, { ...skin, reference }));
    const body = {
      torso: { from: vector(frame.body.torso.from), to: vector(frame.body.torso.to), radius: frame.body.torso.radius },
      head: { centre: vector(frame.body.head.centre), radius: frame.body.head.radius },
    };
    physics = createTailPhysics({
      tails: tails.map(({ home, phase }, index) => ({ home: home.map(vector), phase, skin: skins[index] })),
      frame: { side: reference, back: vector(frame.back), body, ground: frame.ground },
      scale,
    });
    const out = state(null);
    self.postMessage({ type: 'ready', settle: physics.settle, ...out }, transfers(out));
    return;
  }
  if (data.type === 'step') {
    for (let i = 0; i < data.gusts.length; i += 6) {
      const g = data.gusts;
      physics.gust(gustPosition.set(g[i], g[i + 1], g[i + 2]), gustVelocity.set(g[i + 3], g[i + 4], g[i + 5]));
    }
    physics.update(data.seconds);
    const out = state(data.buffers);
    self.postMessage({ type: 'state', ...out }, transfers(out));
  }
};
