import * as THREE from "three";

export const EARTH_RADIUS = 18;
export const MOON_RADIUS = EARTH_RADIUS * 0.2727;
export const MOON_DISTANCE = EARTH_RADIUS * 2 * 30.1;
export const SUN_RADIUS = EARTH_RADIUS * 109.2;
export const SUN_DISTANCE = EARTH_RADIUS * 2 * 11740;
export const MILKY_WAY_RADIUS = 54;
export const SUN_GALACTOCENTRIC_RADIUS = MILKY_WAY_RADIUS * 0.52;
export const SUN_GALACTIC_ANGLE = -0.72;

export function smooth01(value) {
  return THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(value, 0, 1), 0, 1);
}

export function setObjectOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material.userData.skipSceneOpacity) return;
      material.transparent = true;
      material.opacity = opacity;
    });
  });
}

export function createStarField(count, radius, options = {}) {
  const positions = new Float32Array(count * 3);
  const minRadius = options.minRadius || 0;

  for (let i = 0; i < count; i += 1) {
    const distance = minRadius + Math.random() * (radius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = distance * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: options.color || "#ffffff",
      size: options.size || 1,
      sizeAttenuation: false,
      transparent: true,
      opacity: options.opacity ?? 1,
      depthWrite: false,
    }),
  );
  points.frustumCulled = true;
  return points;
}

export function createFlatGalaxy(count, radius, options = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const arms = options.arms || 4;
  const thickness = options.thickness || 5;
  const barLength = options.barLength || radius * 0.34;
  const barWidth = options.barWidth || radius * 0.12;
  const armPitch = options.armPitch || 0.21;
  const sunOffset = options.sunOffset || null;
  const coreColor = new THREE.Color("#ffd48a");
  const barColor = new THREE.Color("#ffc06a");
  const diskColor = new THREE.Color("#fff4dc");
  const armColor = new THREE.Color("#8fc8ff");
  const redHiiColor = new THREE.Color("#ff6f7d");
  const dustColor = new THREE.Color("#705041");

  for (let i = 0; i < count; i += 1) {
    const reveal = i / Math.max(count - 1, 1);
    const localArmReveal = Boolean(sunOffset) && reveal > 0.72;
    const armOnlyReveal = Boolean(sunOffset) && reveal > 0.28;
    const arm = i % arms;
    const inBar = !localArmReveal && Math.random() < (armOnlyReveal ? 0.08 : 0.34);
    let distance;
    let angle;
    let armInfluence;
    let x;
    let z;

    if (localArmReveal) {
      const tangent = new THREE.Vector3(1, 0, 0.28).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const localProgress = (reveal - 0.72) / 0.28;
      const length = THREE.MathUtils.lerp(42, 8, localProgress);
      const width = THREE.MathUtils.lerp(5.5, 1.1, localProgress);
      const along = (Math.random() + Math.random() + Math.random() - 1.5) * length;
      const cross = (Math.random() + Math.random() + Math.random() - 1.5) * width;
      const curve = Math.sin(along * 0.13) * width * 0.35;
      const position = sunOffset
        .clone()
        .add(tangent.clone().multiplyScalar(along))
        .add(normal.clone().multiplyScalar(cross + curve));
      x = position.x;
      z = position.z;
      distance = Math.hypot(x, z);
      angle = Math.atan2(z, x);
      armInfluence = THREE.MathUtils.clamp(1 - Math.abs(cross) / (width * 1.9), 0, 1);
    } else if (inBar) {
      const signed = (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 0.72) * barLength;
      const taper = Math.sqrt(Math.max(0, 1 - (signed / barLength) ** 2));
      const cross = (Math.random() + Math.random() + Math.random() - 1.5) * barWidth * taper;
      const curve = Math.sin((signed / barLength) * Math.PI) * barWidth * 0.22;
      x = signed;
      z = cross + curve;
      distance = Math.hypot(x, z);
      angle = Math.atan2(z, x);
      armInfluence = 0;
    } else {
      const armStart = barLength * 0.72;
      distance = armStart + Math.pow(Math.random(), 0.7) * (radius - armStart);
      const normalized = (distance - armStart) / (radius - armStart);
      const baseAngle = arm * ((Math.PI * 2) / arms) + (arm % 2 === 0 ? 0.28 : -0.28);
      angle = baseAngle + Math.log(distance / armStart) / armPitch;
      const width = THREE.MathUtils.lerp(1.4, 6.2, normalized);
      const alongScatter = (Math.random() - 0.5) * 0.12;
      const crossScatter = (Math.random() + Math.random() + Math.random() - 1.5) * width;
      x = Math.cos(angle + alongScatter) * distance - Math.sin(angle) * crossScatter;
      z = Math.sin(angle + alongScatter) * distance + Math.cos(angle) * crossScatter;
      armInfluence = THREE.MathUtils.clamp(1 - Math.abs(crossScatter) / (width * 1.7), 0, 1);
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * thickness * (inBar ? 1.35 : localArmReveal ? 0.34 : 1);
    positions[i * 3 + 2] = z;

    const radial = THREE.MathUtils.clamp(distance / radius, 0, 1);
    const dustLane = !inBar && armInfluence > 0.55 && Math.random() < 0.18 + radial * 0.12;
    const hiiRegion = !inBar && armInfluence > 0.62 && radial > 0.28 && Math.random() < 0.1;

    let color = coreColor.clone().lerp(diskColor, radial);
    if (inBar) color = barColor.clone().lerp(coreColor, Math.random() * 0.45);
    else color.lerp(armColor, armInfluence * THREE.MathUtils.smoothstep(radial, 0.22, 0.95));
    if (hiiRegion) color.lerp(redHiiColor, 0.65);
    if (dustLane) color.lerp(dustColor, 0.72);

    const brightness = THREE.MathUtils.lerp(1.2, 0.55, radial) * (dustLane ? 0.45 : 1);
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
    sizes[i] = (options.size || 1.1) * THREE.MathUtils.lerp(0.45, 1.35, Math.random() ** 2.8);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("starSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setDrawRange(0, options.initialDrawCount || count);
  geometry.computeBoundingSphere();

  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      uniforms: {
        opacity: { value: options.opacity ?? 1 },
        brightnessBoost: { value: options.brightnessBoost ?? 1 },
        sizeBoost: { value: options.sizeBoost ?? 1 },
      },
      vertexShader: `
        attribute float starSize;
        uniform float sizeBoost;
        varying vec3 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(starSize * sizeBoost, 4.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform float brightnessBoost;
        varying vec3 vColor;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float falloff = smoothstep(0.5, 0.08, length(centered));
          if (falloff <= 0.01) discard;
          vec3 boostedColor = 1.0 - exp(-vColor * brightnessBoost);
          gl_FragColor = vec4(boostedColor, opacity * falloff);
        }
      `,
    }),
  );
  points.frustumCulled = true;
  points.userData.totalPointCount = count;
  points.userData.initialDrawCount = options.initialDrawCount || count;
  return points;
}

export function createLocalGroup() {
  const group = new THREE.Group();
  const companions = new THREE.Group();
  const halo = createStarField(500, 78, { minRadius: 8, size: 0.8, opacity: 0.7 });
  const andromeda = createFlatGalaxy(850, 34, { size: 1.05, opacity: 0.82 });
  const triangulum = createFlatGalaxy(420, 18, { size: 0.9, opacity: 0.72 });

  const sunOffset = new THREE.Vector3(
    Math.cos(SUN_GALACTIC_ANGLE) * SUN_GALACTOCENTRIC_RADIUS,
    0,
    Math.sin(SUN_GALACTIC_ANGLE) * SUN_GALACTOCENTRIC_RADIUS,
  );
  const milkyWay = createFlatGalaxy(18000, MILKY_WAY_RADIUS, {
    size: 0.78,
    thickness: 5.4,
    opacity: 1,
    sunOffset,
    initialDrawCount: 1600,
  });
  const milkyWayRotation = new THREE.Euler(1.1, 0.2, -0.3);
  const rotatedSunOffset = sunOffset.clone().applyEuler(milkyWayRotation);
  milkyWay.position.copy(rotatedSunOffset.clone().multiplyScalar(-1));
  milkyWay.rotation.copy(milkyWayRotation);
  milkyWay.userData.sunGalacticPosition = sunOffset;

  andromeda.position.set(42, 14, -24);
  andromeda.rotation.set(1.2, -0.4, 0.5);
  triangulum.position.set(20, -26, 18);
  triangulum.rotation.set(1.1, 0.3, 0.2);

  companions.add(halo, andromeda, triangulum);
  group.add(companions, milkyWay);
  group.userData.companions = companions;
  group.userData.milkyWay = milkyWay;
  return group;
}

export function createSun() {
  const group = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(32, 48, 48),
    new THREE.MeshBasicMaterial({ color: "#fff3b0" }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(42, 48, 48),
    new THREE.MeshBasicMaterial({
      color: "#ffb347",
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(glow, sun);
  return group;
}

export function createScaledSun() {
  const group = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS, 64, 64),
    new THREE.MeshBasicMaterial({ color: "#fff3b0" }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS * 1.18, 64, 64),
    new THREE.MeshBasicMaterial({
      color: "#ffb347",
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(glow, sun);
  return group;
}

export function createEarthProxyDot() {
  return new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3)),
    new THREE.PointsMaterial({
      color: "#ffffff",
      size: 7,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
}

export function createMoon() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(MOON_RADIUS, 48, 48),
    new THREE.MeshStandardMaterial({
      color: "#9a9a9a",
      roughness: 0.92,
      metalness: 0.01,
    }),
  );
}
