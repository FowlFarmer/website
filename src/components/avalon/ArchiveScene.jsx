import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createArchiveBook } from './archiveBook.js';
import { createStarField, starColors } from './starField.js';

const TAU = Math.PI * 2;
export default function ArchiveScene({ turn = 0, still, onUnavailable }) {
  const mount = useRef(null), turnRef = useRef(turn), wakeRef = useRef(null);
  useEffect(() => { turnRef.current = turn; wakeRef.current?.(); }, [turn]);
  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
    catch { onUnavailable(); return; }
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr); renderer.setClearColor(0x030914);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
    camera.position.set(0, 3.8, 17); camera.lookAt(0, .3, 0);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .48, .4, 1.1);
    composer.addPass(bloom); composer.addPass(new OutputPass());
    scene.add(new THREE.HemisphereLight(0xc6e4ff, 0x0c1832, 1.1));
    const key = new THREE.DirectionalLight(0xd5e8ff, 2.2); key.position.set(-3, 8, 5); scene.add(key);
    const bookLight = new THREE.PointLight(0x74baff, 16, 9, 2); bookLight.position.set(0, -.6, 3); scene.add(bookLight);
    const book = createArchiveBook(); scene.add(book.group);
    book.group.position.set(0, -2.9, 3.3); book.group.rotation.y = -.08;

    let seed = 718; const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    const starMaterials = [];
    function starCloud(count, placement) {
      const stars = [];
      for (let i = 0; i < count; i++) {
        const position = placement(i), rarity = random();
        const radius = rarity > .987 ? .065 + random() * .055 : rarity > .9 ? .025 + random() * .025 : .006 + random() * .012;
        stars.push({ position, radius, luminosity: rarity > .987 ? 1.8 + random() * 1.2 : .35 + random() * .6,
          color: starColors[Math.floor(random() * starColors.length)], phase: random() * TAU,
          orbit: count > 2000 ? .004 / Math.sqrt(Math.max(1, Math.hypot(position[0], position[1]))) : 0 });
      }
      const mesh = createStarField(stars); starMaterials.push(mesh.material); return mesh;
    }
    // Spiral arms are volumes with clustered stars, not points on a flat image.
    const galaxy = starCloud(8000, i => {
      const radius = .45 + Math.pow(random(), .7) * 15;
      const arm = i % 3 * TAU / 3;
      const angle = arm + radius * .51 + (random() - .5) * (.15 + .75 / radius);
      const scatter = (random() - .5) * (.25 + radius * .065);
      return [Math.cos(angle) * radius + scatter, Math.sin(angle) * radius + scatter, (random() - .5) * (1.6 - radius * .06)];
    });
    galaxy.position.set(2, 4.5, -13); galaxy.rotation.set(.24, -.3, -.5); scene.add(galaxy);
    const distantStars = starCloud(1100, () => [(random() - .5) * 65, (random() - .4) * 45, -15 - random() * 35]); scene.add(distantStars);
    // A soft, transparent volume gives the galaxy a cool luminous core.
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(44, 38), new THREE.ShaderMaterial({
      uniforms: {}, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){vec2 p=vUv-.5;float d=length(p*vec2(1.,1.3));float a=exp(-d*d*28.)*.10+exp(-d*d*180.)*.12;gl_FragColor=vec4(.19,.33,.62,a);}',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })); haze.position.copy(galaxy.position); haze.position.z -= 2; scene.add(haze);

    const floor = new THREE.Group(); floor.position.y = -3.6; scene.add(floor);
    const floorMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(.005,.012,.032,(1.-smoothstep(.35,1.,r))*.8);}',
    });
    const disk = new THREE.Mesh(new THREE.CircleGeometry(12, 160), floorMat); disk.rotation.x = -Math.PI / 2; floor.add(disk);
    const floorLines = [];
    for (const r of [3.5, 5.5, 5.58, 7.5, 8, 8.06, 9.8, 10]) {
      for (let i = 0; i < 200; i++) { const a = i / 200 * TAU, b = (i + 1) / 200 * TAU; floorLines.push(Math.cos(a) * r, .015, Math.sin(a) * r, Math.cos(b) * r, .015, Math.sin(b) * r); }
    }
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * TAU, inner = i % 10 === 0 ? 3.5 : i % 5 === 0 ? 7.6 : 7.85;
      floorLines.push(Math.cos(a) * inner, .02, Math.sin(a) * inner, Math.cos(a) * 8, .02, Math.sin(a) * 8);
    }
    const floorGeo = new THREE.BufferGeometry(); floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorLines, 3));
    floor.add(new THREE.LineSegments(floorGeo, new THREE.LineBasicMaterial({ color: 0xc1ae78, transparent: true, opacity: .34 })));
    const meridians = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 150; j++) {
      const a = j / 150 * Math.PI, b = (j + 1) / 150 * Math.PI;
      const yaw = (i - 2) * .32;
      for (const t of [a, b]) meridians.push(Math.cos(t) * 15 * Math.cos(yaw), Math.sin(t) * 15 - 3.6, -8 + Math.cos(t) * 15 * Math.sin(yaw));
    }
    const meridianGeo = new THREE.BufferGeometry(); meridianGeo.setAttribute('position', new THREE.Float32BufferAttribute(meridians, 3));
    scene.add(new THREE.LineSegments(meridianGeo, new THREE.LineBasicMaterial({ color: 0x7aa7cb, transparent: true, opacity: .12 })));
    const motes = starCloud(40, () => [(random() - .5) * 3, random() * 4 - 2, 2 + random() * 2]); scene.add(motes);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, time = 0, previous = 0, disposed = false, angle = turnRef.current, width = 1, pointer = { x: 0, y: 0 }, parallax = { x: 0, y: 0 };
    function draw(now = 0) {
      frame = 0; if (disposed || document.hidden) return;
      const dt = Math.min((now - previous) / 1000 || .016, .05); previous = now;
      const animated = !still && !reduced.matches;
      if (animated) time += dt;
      angle = animated ? THREE.MathUtils.damp(angle, turnRef.current, 6, dt) : turnRef.current;
      parallax.x = THREE.MathUtils.damp(parallax.x, animated ? pointer.x : 0, 2, dt);
      parallax.y = THREE.MathUtils.damp(parallax.y, animated ? pointer.y : 0, 2, dt);
      galaxy.rotation.z = -.5 + time * .009 + angle * .035;
      galaxy.rotation.y = -.3 + parallax.x * .055;
      galaxy.rotation.x = .24 + parallax.y * .04;
      book.group.position.y = -2.9 + Math.sin(time * .55) * .045;
      book.group.rotation.z = Math.sin(time * .35) * .009;
      book.group.rotation.y = -.08 + parallax.x * .035; book.update(time, host.clientHeight * dpr);
      motes.rotation.y = time * .06;
      starMaterials.forEach(material => { material.uniforms.uTime.value = time; });
      floor.rotation.y = angle * -.05 + time * .005;
      composer.render();
      if (animated) frame = requestAnimationFrame(draw);
    }
    function wake() { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw); }
    wakeRef.current = wake;
    function resize() {
      const bounds = host.getBoundingClientRect(); width = bounds.width;
      if (!width || !bounds.height) return;
      renderer.setSize(width, bounds.height); composer.setSize(width, bounds.height);
      starMaterials.forEach(material => { material.uniforms.uViewportHeight.value = bounds.height * dpr; });
      camera.aspect = width / bounds.height; camera.fov = camera.aspect < .8 ? 49 : 42; camera.updateProjectionMatrix();
      book.group.scale.setScalar(camera.aspect < .8 ? .76 : 1.12); wake();
    }
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; if (!document.hidden) wake(); };
    const pointerMove = e => { pointer.x = e.clientX / width * 2 - 1; pointer.y = e.clientY / window.innerHeight * 2 - 1; };
    const lost = e => { e.preventDefault(); onUnavailable(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pointermove', pointerMove, { passive: true }); reduced.addEventListener('change', visibility);
    renderer.domElement.addEventListener('webglcontextlost', lost); wake();
    return () => {
      disposed = true; wakeRef.current = null; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointermove', pointerMove); reduced.removeEventListener('change', visibility); renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set(), materials = new Set(); scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); bloom.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [still, onUnavailable]);
  return <div ref={mount} className="archive-scene" aria-hidden="true" />;
}
