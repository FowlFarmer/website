import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const fogVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fogFragmentShader = `
  uniform float uTime;
  uniform vec3 uFogColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + 13.17;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 drift = vec2(uTime * 0.012, -uTime * 0.006);
    float cloud = fbm(vUv * vec2(5.2, 2.1) + drift);
    float veil = smoothstep(0.24, 0.84, cloud);
    float edge = smoothstep(0.0, 0.18, vUv.y) *
                 smoothstep(0.0, 0.16, 1.0 - vUv.y);
    gl_FragColor = vec4(uFogColor, veil * edge * uOpacity);
  }
`;

const rainVertexShader = `
  uniform float uTime;
  attribute float aPhase;
  attribute float aSpeed;
  varying float vDepthFade;

  void main() {
    vec3 transformed = position;
    transformed.y = mod(position.y - (uTime * aSpeed) + aPhase, 18.0) - 2.0;
    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    vDepthFade = 1.0 - smoothstep(2.0, 48.0, -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const rainFragmentShader = `
  varying float vDepthFade;

  void main() {
    vec3 coldRain = vec3(0.52, 0.76, 0.94);
    gl_FragColor = vec4(coldRain, 0.40 + vDepthFade * 0.32);
  }
`;

function seededRandom(seed = 9173) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createWindowTexture(random, accent = '#8bd6ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 192;
  const context = canvas.getContext('2d');

  context.fillStyle = '#020812';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 8; y < canvas.height - 8; y += 13) {
    for (let x = 7; x < canvas.width - 7; x += 12) {
      const lit = random() > 0.46;
      context.fillStyle = lit
        ? (random() > 0.72 ? '#ffd2a0' : accent)
        : '#061323';
      context.globalAlpha = lit ? 0.42 + random() * 0.54 : 0.42;
      context.fillRect(x, y, 5, 7);
    }
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createSignTexture(label, background, foreground) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = foreground;
  context.globalAlpha = 0.24;
  context.lineWidth = 12;
  context.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
  context.globalAlpha = 1;
  context.fillStyle = foreground;
  context.font = '700 92px "Hiragino Sans", "Yu Gothic", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2 + 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSkylineTexture(random) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  const glowPalette = ['#80d9ff', '#b4e9ff', '#ffc484', '#ff7188'];

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width;) {
    const width = 38 + random() * 78;
    const height = 120 + random() * 350;
    const top = canvas.height - height;
    const gradient = context.createLinearGradient(0, top, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(10, 27, 44, 0.96)');
    gradient.addColorStop(1, 'rgba(2, 8, 15, 0.99)');
    context.fillStyle = gradient;
    context.fillRect(x, top, width, height);

    for (let wy = top + 18; wy < canvas.height - 16; wy += 23) {
      for (let wx = x + 11; wx < x + width - 8; wx += 18) {
        if (random() > 0.38) {
          context.globalAlpha = 0.62 + random() * 0.38;
          context.fillStyle = glowPalette[Math.floor(random() * glowPalette.length)];
          context.fillRect(wx, wy, 7 + random() * 5, 10);
        }
      }
    }
    context.globalAlpha = 1;
    x += width + 7 + random() * 12;
  }

  const haze = context.createLinearGradient(0, 400, 0, 640);
  haze.addColorStop(0, 'rgba(23, 90, 125, 0)');
  haze.addColorStop(1, 'rgba(29, 105, 145, 0.24)');
  context.fillStyle = haze;
  context.fillRect(0, 360, canvas.width, 280);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(scene, geometry, material, position, scale, rotationY = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
  return mesh;
}

function createTokyoTower() {
  const tower = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({
    color: 0x661319,
    emissive: 0xff3348,
    emissiveIntensity: 2.6,
    metalness: 0.7,
    roughness: 0.3,
  });
  const warm = new THREE.MeshStandardMaterial({
    color: 0xffb76b,
    emissive: 0xff6b32,
    emissiveIntensity: 3.2,
    roughness: 0.35,
  });

  const makeBeam = (start, end, radius) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
      red,
    );
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    tower.add(beam);
  };

  for (const x of [-1.35, 1.35]) {
    for (const z of [-0.75, 0.75]) {
      makeBeam(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x * 0.28, 8.8, z * 0.28),
        0.13,
      );
    }
  }

  makeBeam(new THREE.Vector3(0, 8.5, 0), new THREE.Vector3(0, 14.8, 0), 0.12);

  for (const y of [3.0, 5.7, 8.2]) {
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(y < 8 ? 2.2 : 1.4, 0.24, y < 8 ? 1.45 : 0.9),
      warm,
    );
    deck.position.y = y;
    tower.add(deck);
  }

  const beacon = new THREE.PointLight(0xff3b35, 7, 14, 2);
  beacon.position.y = 11;
  tower.add(beacon);
  return tower;
}

function buildRain(random, count) {
  const positions = new Float32Array(count * 2 * 3);
  const phases = new Float32Array(count * 2);
  const speeds = new Float32Array(count * 2);

  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * 34;
    const y = random() * 18;
    const z = 12 - random() * 62;
    const length = 0.20 + random() * 0.48;
    const speed = 7.4 + random() * 7.2;
    const phase = random() * 18;
    const vertex = index * 6;
    positions[vertex] = x;
    positions[vertex + 1] = y;
    positions[vertex + 2] = z;
    positions[vertex + 3] = x - 0.035;
    positions[vertex + 4] = y - length;
    positions[vertex + 5] = z + 0.08;
    phases[index * 2] = phase;
    phases[index * 2 + 1] = phase;
    speeds[index * 2] = speed;
    speeds[index * 2 + 1] = speed;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: rainVertexShader,
    fragmentShader: rainFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  return new THREE.LineSegments(geometry, material);
}

export default function TokyoRainScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const random = seededRandom();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = window.innerWidth < 720 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x01050b);
    scene.fog = new THREE.FogExp2(0x07131f, 0.019);

    const camera = new THREE.PerspectiveCamera(
      48,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      120,
    );
    camera.position.set(0, 2.75, 13.5);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowPower,
        powerPreference: 'high-performance',
      });
    } catch {
      mount.dataset.webglFallback = 'true';
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.15 : 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    mount.appendChild(renderer.domElement);

    const textures = [];
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x071019,
      metalness: 0.82,
      roughness: 0.24,
    });
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x213748,
      metalness: 0.92,
      roughness: 0.19,
    });
    const wetDeckMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x07131c,
      metalness: 0.24,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const tactileMaterial = new THREE.MeshStandardMaterial({
      color: 0x7c6827,
      emissive: 0x302408,
      emissiveIntensity: 0.35,
      roughness: 0.46,
    });

    // The empty pedestrian bridge forms a strong one-point perspective.
    addBox(scene, boxGeometry, wetDeckMaterial, [0, -0.22, -8], [9.2, 0.28, 43]);
    addBox(scene, boxGeometry, darkMetal, [-4.72, -0.05, -8], [0.28, 0.40, 43]);
    addBox(scene, boxGeometry, darkMetal, [4.72, -0.05, -8], [0.28, 0.40, 43]);
    addBox(scene, boxGeometry, tactileMaterial, [-2.7, 0.025, -7.5], [0.34, 0.025, 42]);

    const puddleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x102f42,
      transparent: true,
      opacity: 0.62,
      roughness: 0.04,
      metalness: 0.35,
      depthWrite: false,
    });
    for (let index = 0; index < 20; index += 1) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.35 + random() * 0.9, 24),
        puddleMaterial,
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = 0.25 + random() * 0.38;
      puddle.position.set(
        (random() - 0.5) * 7.6,
        0.065,
        9 - random() * 39,
      );
      scene.add(puddle);
    }

    for (const side of [-1, 1]) {
      const x = side * 4.45;
      for (let z = 11; z > -30; z -= 2.25) {
        addBox(scene, boxGeometry, railMaterial, [x, 0.72, z], [0.12, 1.72, 0.12]);
      }
      for (const y of [0.42, 1.02, 1.58]) {
        addBox(scene, boxGeometry, railMaterial, [x, y, -9.5], [0.11, 0.11, 41]);
      }
    }

    const warmLampMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd2a0,
      emissive: 0xff8a3d,
      emissiveIntensity: 5.8,
      roughness: 0.32,
    });
    for (const side of [-1, 1]) {
      for (let z = 6; z > -25; z -= 8) {
        const lamp = addBox(
          scene,
          boxGeometry,
          warmLampMaterial,
          [side * 4.35, 1.48, z],
          [0.16, 0.10, 0.30],
        );
        lamp.rotation.z = side * 0.08;
      }
    }
    const nearbyLamp = new THREE.PointLight(0xff9a5f, 10, 15, 2);
    nearbyLamp.position.set(-4.0, 2.1, 5.8);
    scene.add(nearbyLamp);

    // Procedural Tokyo skyline: varied silhouettes, window fields and signage.
    const city = new THREE.Group();
    const skylineTexture = createSkylineTexture(random);
    textures.push(skylineTexture);
    const skylineBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 21),
      new THREE.MeshBasicMaterial({
        map: skylineTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        fog: false,
      }),
    );
    skylineBackdrop.position.set(0, 7.8, -21.5);
    scene.add(skylineBackdrop);

    const windowPalettes = ['#7acbff', '#a7dfff', '#ffd09b', '#83a7ff'];
    const buildingMaterials = Array.from({ length: 6 }, (_, index) => {
      const texture = createWindowTexture(random, windowPalettes[index % windowPalettes.length]);
      texture.repeat.set(1.2 + random() * 1.5, 2.0 + random() * 2.2);
      textures.push(texture);
      return new THREE.MeshStandardMaterial({
        color: 0x152234,
        map: texture,
        emissive: index % 3 === 0 ? 0xa6e6ff : 0x8aaeff,
        emissiveMap: texture,
        emissiveIntensity: 1.8 + random() * 0.8,
        roughness: 0.68,
        metalness: 0.22,
      });
    });

    for (let index = 0; index < 38; index += 1) {
      const width = 1.15 + random() * 2.2;
      const height = 3.5 + random() * 11.5;
      const depth = 1.7 + random() * 3.8;
      const x = -28 + index * 1.55 + (random() - 0.5) * 1.1;
      const z = -27 - random() * 7;
      const building = new THREE.Mesh(
        boxGeometry,
        buildingMaterials[index % buildingMaterials.length],
      );
      building.position.set(x, height / 2 - 0.15, z);
      building.scale.set(width, height, depth);
      city.add(building);

      if (index % 5 === 0) {
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.06, 2.4 + random() * 2.2, 6),
          railMaterial,
        );
        antenna.position.set(x, height + 1.2, z);
        city.add(antenna);
      }
    }

    const signData = [
      ['東京', '#08192d', '#6de1ff', -14.2, 7.0, -10.6],
      ['雨', '#32111c', '#ff6d87', -10.8, 4.7, -14.0],
      ['新宿', '#122a20', '#94ffbf', 14.2, 7.2, -11.4],
    ];
    signData.forEach(([label, background, foreground, x, y, z], index) => {
      const texture = createSignTexture(label, background, foreground);
      textures.push(texture);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(index === 1 ? 2.4 : 4.8, 1.75),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sign.position.set(x, y, z);
      scene.add(sign);
    });

    const tower = createTokyoTower();
    tower.position.set(14.5, 0, -14.5);
    tower.scale.setScalar(0.88);
    scene.add(tower);
    scene.add(city);

    // A low bay plane catches the city glow without requiring a photo backdrop.
    const bayMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x02090f,
      emissive: 0x031423,
      emissiveIntensity: 0.8,
      metalness: 0.72,
      roughness: 0.2,
      clearcoat: 1,
    });
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(70, 28), bayMaterial);
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(0, -0.45, -37);
    scene.add(bay);

    const ambient = new THREE.HemisphereLight(0x355b84, 0x020307, 1.1);
    scene.add(ambient);
    const moon = new THREE.DirectionalLight(0xa7d7ff, 2.3);
    moon.position.set(-7, 14, 8);
    scene.add(moon);
    const cyanGlow = new THREE.PointLight(0x2ab8ff, 11, 30, 2);
    cyanGlow.position.set(2, 4, -18);
    scene.add(cyanGlow);

    const rain = buildRain(random, lowPower ? 850 : 2100);
    scene.add(rain);

    const fogUniforms = [];
    for (const [z, opacity, scale] of [
      [-8, 0.22, 1.0],
      [-20, 0.34, 1.35],
      [-34, 0.48, 1.75],
    ]) {
      const material = new THREE.ShaderMaterial({
        vertexShader: fogVertexShader,
        fragmentShader: fogFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uFogColor: { value: new THREE.Color(0x0b2131) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      fogUniforms.push(material.uniforms);
      const veil = new THREE.Mesh(new THREE.PlaneGeometry(30 * scale, 10 * scale), material);
      veil.position.set(0, 4, z);
      scene.add(veil);
    }

    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    const startTime = performance.now();
    let animationFrame;
    let visible = !document.hidden;

    const handlePointerMove = (event) => {
      targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const handleVisibility = () => {
      visible = !document.hidden;
    };
    const handleResize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.15 : 1.6));
      renderer.setSize(width, height);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      if (!visible) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const motionTime = reduceMotion ? 0.4 : elapsed;
      pointer.lerp(targetPointer, 0.035);
      camera.position.x = pointer.x * 0.52;
      camera.position.y = 2.75 - pointer.y * 0.16 + Math.sin(motionTime * 0.16) * 0.035;
      camera.lookAt(pointer.x * 0.20, 3.7, -18.5);
      rain.material.uniforms.uTime.value = motionTime;
      fogUniforms.forEach((uniforms, index) => {
        uniforms.uTime.value = motionTime * (0.72 + index * 0.16);
      });
      tower.rotation.y = Math.sin(motionTime * 0.08) * 0.006;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="tokyo-rain-scene"
      aria-hidden="true"
    />
  );
}
