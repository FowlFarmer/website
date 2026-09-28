import * as THREE from 'three';
import { createStarField } from './starField.js';

// A curved, layered volume: separate leather covers, gilded signatures, and two
// flexible page surfaces. All page ornament follows the same surface as the paper.
export function createArchiveBook() {
  const book = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: 0x17294c, metalness: .48, roughness: .42 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc7aa71, metalness: .78, roughness: .3 });
  const paper = new THREE.MeshStandardMaterial({ color: 0x182f5d, metalness: .28, roughness: .65, side: THREE.DoubleSide });
  const glow = new THREE.LineBasicMaterial({ color: 0x8fd9ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending });
  const pageY = (u, v) => .16 + Math.sin(u * Math.PI) * .25 + u * .12 + Math.pow(Math.abs(v), 5) * u * .08;
  function surface(side, level, width, depth, material) {
    const geometry = new THREE.PlaneGeometry(width, depth, 48, 24);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) + width / 2) / width, v = p.getY(i) / (depth / 2);
      p.setXYZ(i, side * (u * width + .018), pageY(u, v) + level, v * depth / 2);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material); book.add(mesh); return mesh;
  }
  function line(points, material = glow) {
    const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material); book.add(mesh); return mesh;
  }
  for (const side of [-1, 1]) {
    surface(side, -.2, 2.55, 3.28, leather);
    surface(side, -.16, 2.53, 3.25, gold);
    // Exposed leaf edges produce real parallax rather than a painted rectangle.
    for (let i = 0; i < 16; i++) surface(side, -.13 + i * .008, 2.43 - i * .002, 3.1 - i * .002, i % 4 === 0 ? gold : paper);
    surface(side, .014, 2.4, 3.05, paper);
    for (const inset of [.09, .16]) {
      const points = [];
      for (let i = 0; i <= 160; i++) {
        const t = i / 160 * 4;
        const u = t < 1 ? inset + t * (1 - 2 * inset) : t < 2 ? 1 - inset : t < 3 ? 1 - inset - (t - 2) * (1 - 2 * inset) : inset;
        const v = t < 1 ? -.88 : t < 2 ? -.88 + (t - 1) * 1.76 : t < 3 ? .88 : .88 - (t - 3) * 1.76;
        points.push(new THREE.Vector3(side * (u * 2.4 + .018), pageY(u, v) + .023, v * 1.525));
      }
      line(points);
    }
    // Engraved celestial diagrams on the open pages, without decorative writing.
    for (const radius of [.22, .32, .37]) {
      const points = [];
      for (let i = 0; i <= 120; i++) {
        const a = i / 120 * Math.PI * 2, u = .51 + Math.cos(a) * radius, v = Math.sin(a) * radius * 1.45;
        points.push(new THREE.Vector3(side * (u * 2.4 + .018), pageY(u, v) + .025, v * 1.525));
      }
      line(points);
    }
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * Math.PI * 2;
      const points = [];
      for (let k = 0; k <= 20; k++) {
        const r = k / 20 * .35, u = .51 + Math.cos(a) * r, v = Math.sin(a) * r * 1.45;
        points.push(new THREE.Vector3(side * (u * 2.4 + .018), pageY(u, v) + .028, v * 1.525));
      }
      line(points);
    }
    // Four metal corner guards on the covers.
    for (const z of [-1.47, 1.47]) {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(.27, .045, .2), gold);
      guard.position.set(side * 2.36, .22, z); book.add(guard);
    }
  }
  const stars = [];
  let seed = 915; const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 220; i++) {
    const u = .12 + random() * .76, v = (random() - .5) * 1.7;
    stars.push({ position: [(i % 2 ? 1 : -1) * (u * 2.4 + .018), pageY(u, v) + .035, v * 1.525],
      radius: .006 + random() * .006, color: [.4, .8, 1.4], luminosity: .6 + random() * .5 });
  }
  const starmap = createStarField(stars); book.add(starmap);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 3.3, 20), leather);
  spine.rotation.x = Math.PI / 2; spine.position.y = -.03; book.add(spine);
  for (const z of [-1.3, -.75, .75, 1.3]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.115, .022, 8, 24), gold);
    band.position.set(0, -.03, z); book.add(band);
  }
  // A thin loose page breathes at the outer edge. Vertex deformation stays on GPU.
  const leafMaterial = paper.clone();
  leafMaterial.transparent = true; leafMaterial.opacity = .55;
  const leaf = surface(1, .065, 2.37, 3.01, leafMaterial);
  const time = { value: 0 };
  leafMaterial.onBeforeCompile = shader => {
    shader.uniforms.uTime = time;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += pow(abs(position.x)/2.4, 3.) * (.06 + .035 * sin(uTime*.8 + position.z*1.5));');
  };
  leaf.renderOrder = 1;
  return { group: book, update: (t, viewportHeight) => { time.value = t; starmap.material.uniforms.uTime.value = t; starmap.material.uniforms.uViewportHeight.value = viewportHeight; } };
}
