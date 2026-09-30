import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import './viewer.css';

const stage = document.querySelector('#stage');
const loading = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const resetButton = document.querySelector('#reset');
const rotateButton = document.querySelector('#rotate');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(37, 1, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
stage.append(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d8e8ff', '#55504d', 2.2));
const key = new THREE.DirectionalLight('#fff2e4', 3.2);
key.position.set(-3, 5, -4);
scene.add(key);
const rim = new THREE.DirectionalLight('#b4c9e4', 2.1);
rim.position.set(3, 3, 4);
scene.add(rim);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI - 0.1;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.autoRotateSpeed = 0.7;

const home = { position: new THREE.Vector3(), target: new THREE.Vector3() };
const resize = () => {
  const { width, height } = stage.getBoundingClientRect();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
};
new ResizeObserver(resize).observe(stage);
resize();

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('/models/keria-profile.glb', (gltf) => {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);

  const radius = Math.max(size.x, size.y, size.z);
  const distance = radius * Math.max(2.2, 1.8 / camera.aspect);
  home.position.set(distance * 0.32, distance * 0.24, distance);
  home.target.set(0, 0, 0);
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  controls.minDistance = radius * 0.65;
  controls.maxDistance = radius * 5;
  controls.update();
  loading.classList.add('is-hidden');
}, (event) => {
  if (event.total) loadingText.textContent = `Loading model… ${Math.round(event.loaded / event.total * 100)}%`;
}, (error) => {
  console.error('Unable to load Keria model', error);
  loadingText.textContent = 'Unable to load the model.';
  loading.classList.add('is-error');
});

resetButton.addEventListener('click', () => {
  controls.autoRotate = false;
  rotateButton.setAttribute('aria-pressed', 'false');
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  controls.update();
});
rotateButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
});

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  controls.update();
  renderer.render(scene, camera);
}
animate();
