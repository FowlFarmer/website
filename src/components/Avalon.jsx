import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createEarthMarker, updateEarthMarker } from "./avalon/earthMarkers.js";
import { latLonToVector3 } from "./avalon/geo.js";
import { avalonLocations } from "./avalon/locations.js";
import {
  EARTH_RADIUS,
  MOON_DISTANCE,
  SUN_DISTANCE,
  createEarthProxyDot,
  createLocalGroup,
  createMoon,
  createScaledSun,
  setObjectOpacity,
  smooth01,
} from "./avalon/spaceScene.js";

const INTRO_DURATION = 8;
const SOLAR_SCALE_START = 0.82;
const SOLAR_SCALE_END = 0.88;
const SOLAR_APPROACH_END = 0.94;
const EARTH_MOON_END = 0.985;
const MILKY_WAY_START_DISTANCE = 12000;
const MILKY_WAY_DEEP_DISTANCE = 0.08;

function createCartoonEarth() {
  const group = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
    new THREE.MeshStandardMaterial({
      color: "#2f8cff",
      roughness: 0.85,
      metalness: 0.02,
    }),
  );
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.8, 64, 64),
    new THREE.MeshBasicMaterial({
      color: "#8adfff",
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  group.add(earth, atmosphere);
  group.userData.atmosphere = atmosphere;

  const landMaterial = new THREE.MeshStandardMaterial({ color: "#58c76f", roughness: 0.9 });
  [
    [48, -98, 5.6, 2.7, 0.3],
    [4, -62, 4.8, 2.4, -0.6],
    [50, 18, 5.2, 2.6, 0.1],
    [12, 82, 5.8, 2.5, 0.8],
    [-24, 134, 4.1, 2.0, -0.3],
  ].forEach(([lat, lon, sx, sy, tilt]) => {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), landMaterial);
    patch.position.copy(latLonToVector3(lat, lon, EARTH_RADIUS + 0.3));
    patch.scale.set(sx, sy, 0.22);
    patch.lookAt(0, 0, 0);
    patch.rotateZ(tilt);
    group.add(patch);
  });

  return group;
}

function getPhaseLabel(progress) {
  if (progress < 0.18) return "Local Group";
  if (progress < SOLAR_SCALE_START) return "Milky Way";
  if (progress < SOLAR_SCALE_END) return "Solar scale";
  if (progress < SOLAR_APPROACH_END) return "Solar approach";
  if (progress < EARTH_MOON_END) return "Earth and Moon";
  return "Project map";
}

function setMilkyWayDetailOpacity(milkyWay, baseOpacity, zoomProgress) {
  const uniforms = milkyWay.material.uniforms;
  if (uniforms?.opacity) uniforms.opacity.value = baseOpacity;
  else milkyWay.material.opacity = baseOpacity;
  if (uniforms?.brightnessBoost) {
    const brightnessProgress = Math.log10(1 + smooth01(zoomProgress) * 99) / 2;
    uniforms.brightnessBoost.value = THREE.MathUtils.lerp(0.8, 2.35, brightnessProgress);
  }
  if (uniforms?.sizeBoost) {
    const sizeProgress = Math.log10(1 + smooth01(zoomProgress) * 99) / 2;
    uniforms.sizeBoost.value = THREE.MathUtils.lerp(0.9, 2.6, sizeProgress);
  }
  const total = milkyWay.userData.totalPointCount || milkyWay.geometry.getAttribute("position").count;
  const initial = milkyWay.userData.initialDrawCount || total;
  const densityProgress = Math.log10(1 + smooth01(zoomProgress) * 99) / 2;
  milkyWay.geometry.setDrawRange(0, Math.round(THREE.MathUtils.lerp(initial, total, densityProgress)));
}

function logLerp(start, end, amount) {
  return Math.exp(THREE.MathUtils.lerp(Math.log(start), Math.log(end), amount));
}

export default function Avalon() {
  const mountRef = useRef(null);
  const [activeLocation, setActiveLocation] = useState(avalonLocations[0]);
  const [phase, setPhase] = useState("Local Group");
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const locationActions = {
      "select-location": setActiveLocation,
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, SUN_DISTANCE * 2);
    camera.position.set(0, 0, 420);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor("#000000", 1);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#9ab8ff", 0.55);
    const solarLight = new THREE.PointLight("#fff1c7", 4, 1800, 1.15);
    solarLight.position.set(260, 22, -520);
    scene.add(ambient, solarLight);

    const localGroup = createLocalGroup();
    scene.add(localGroup);
    const localGroupCompanions = localGroup.userData.companions;
    const milkyWay = localGroup.userData.milkyWay;

    const solarScaleGroup = new THREE.Group();
    solarScaleGroup.scale.setScalar(0.00042);
    scene.add(solarScaleGroup);

    const earthProxyDot = createEarthProxyDot();
    solarScaleGroup.add(earthProxyDot);

    const scaledSun = createScaledSun();
    scaledSun.position.set(SUN_DISTANCE, 0, 0);
    solarScaleGroup.add(scaledSun);

    const earthSystem = new THREE.Group();
    scene.add(earthSystem);

    const earthGroup = createCartoonEarth();
    earthSystem.add(earthGroup);

    const moon = createMoon();
    moon.position.set(MOON_DISTANCE, 0, 0);
    earthSystem.add(moon);

    const markers = avalonLocations.map((location) => {
      const marker = createEarthMarker(location);
      earthGroup.add(marker);
      return marker;
    });
    const markerRayTargets = markers.flatMap((marker) => marker.userData.rayTargets);
    markers.forEach((marker) => {
      marker.visible = false;
    });

    setObjectOpacity(earthSystem, 0);
    setObjectOpacity(solarScaleGroup, 0);
    solarScaleGroup.visible = false;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;
    let currentPhase = "Local Group";
    let markerInteractionEnabled = false;
    let autoplayComplete = false;
    let timelineProgress = 0;

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const pick = (event, commit) => {
      if (!markerInteractionEnabled) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObjects(markerRayTargets, false);
      hovered = hit?.object?.userData.markerGroup || null;
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";
      if (commit && hovered?.userData.location) {
        const { location } = hovered.userData;
        const action = locationActions[location.action];
        if (action) action(location);
      }
    };

    const handleMove = (event) => pick(event, false);
    const handleClick = (event) => pick(event, true);
    const handleWheel = (event) => {
      if (!autoplayComplete) return;
      event.preventDefault();
      timelineProgress = THREE.MathUtils.clamp(timelineProgress + event.deltaY * 0.0007, 0, 1);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("wheel", handleWheel, { passive: false });
    renderer.domElement.addEventListener("pointermove", handleMove);
    renderer.domElement.addEventListener("click", handleClick);
    resize();

    const clock = new THREE.Clock();
    const cameraTarget = new THREE.Vector3();
    const setEarthCenteredCamera = (distance) => {
      camera.position.set(0, 0, distance);
      cameraTarget.set(0, 0, 0);
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      if (!autoplayComplete) {
        timelineProgress = smooth01(elapsed / INTRO_DURATION);
        if (timelineProgress >= 0.999) {
          timelineProgress = 1;
          autoplayComplete = true;
        }
      }

      const phaseLabel = getPhaseLabel(timelineProgress);
      if (phaseLabel !== currentPhase) {
        currentPhase = phaseLabel;
        setPhase(phaseLabel);
      }

      earthGroup.rotation.y = elapsed * 0.13;
      earthGroup.userData.atmosphere.rotation.y = -elapsed * 0.07;

      const interactionNowEnabled = timelineProgress >= EARTH_MOON_END;
      if (interactionNowEnabled !== markerInteractionEnabled) {
        markerInteractionEnabled = interactionNowEnabled;
        markers.forEach((marker) => {
          marker.visible = markerInteractionEnabled;
        });
        setIntroComplete(markerInteractionEnabled);
        if (!markerInteractionEnabled) {
          hovered = null;
          renderer.domElement.style.cursor = "default";
        }
      }

      if (timelineProgress < SOLAR_SCALE_START) {
        const p = smooth01(timelineProgress / SOLAR_SCALE_START);
        setEarthCenteredCamera(logLerp(MILKY_WAY_START_DISTANCE, MILKY_WAY_DEEP_DISTANCE, p));
        setObjectOpacity(localGroupCompanions, 1 - smooth01((p - 0.18) / 0.34));
        setMilkyWayDetailOpacity(milkyWay, 1, p);
        setObjectOpacity(solarScaleGroup, 0);
        solarScaleGroup.visible = false;
        setObjectOpacity(earthSystem, 0);
        earthSystem.visible = false;
      } else if (timelineProgress < SOLAR_SCALE_END) {
        const p = smooth01((timelineProgress - SOLAR_SCALE_START) / (SOLAR_SCALE_END - SOLAR_SCALE_START));
        setEarthCenteredCamera(logLerp(MILKY_WAY_DEEP_DISTANCE, 0.065, p));
        setObjectOpacity(localGroupCompanions, 0);
        setMilkyWayDetailOpacity(milkyWay, 1, 1);
        setObjectOpacity(earthSystem, 0);
        earthSystem.visible = false;
        solarScaleGroup.visible = true;
        setObjectOpacity(solarScaleGroup, p);
        earthProxyDot.material.opacity = p;
      } else if (timelineProgress < SOLAR_APPROACH_END) {
        const p = smooth01((timelineProgress - SOLAR_SCALE_END) / (SOLAR_APPROACH_END - SOLAR_SCALE_END));
        setEarthCenteredCamera(logLerp(0.065, 0.058, p));
        setObjectOpacity(localGroupCompanions, 0);
        setMilkyWayDetailOpacity(milkyWay, 1, 1);
        solarScaleGroup.visible = true;
        setObjectOpacity(solarScaleGroup, 1 - p);
        setObjectOpacity(earthSystem, 0);
        earthSystem.visible = false;
      } else if (timelineProgress < EARTH_MOON_END) {
        const p = smooth01((timelineProgress - SOLAR_APPROACH_END) / (EARTH_MOON_END - SOLAR_APPROACH_END));
        setEarthCenteredCamera(logLerp(0.058, 0.052, p));
        setObjectOpacity(localGroupCompanions, 0);
        setMilkyWayDetailOpacity(milkyWay, 1, 1);
        setObjectOpacity(earthSystem, p);
        setObjectOpacity(solarScaleGroup, 0);
        solarScaleGroup.visible = false;
        earthSystem.visible = true;
      } else {
        const settle = smooth01((timelineProgress - EARTH_MOON_END) / (1 - EARTH_MOON_END));
        setEarthCenteredCamera(logLerp(0.052, 0.05, settle));
        setObjectOpacity(localGroupCompanions, 0);
        setMilkyWayDetailOpacity(milkyWay, 1, 1);
        setObjectOpacity(earthSystem, 1);
        setObjectOpacity(solarScaleGroup, 0);
        solarScaleGroup.visible = false;
        earthSystem.visible = true;
      }

      markers.forEach((marker) => updateEarthMarker(marker, elapsed, marker === hovered));
      moon.rotation.y = elapsed * 0.03;

      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("pointermove", handleMove);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section className="avalon-space" aria-label="Interactive Three.js Earth portfolio">
      <div className="avalon-stage" ref={mountRef} />

      <div className={`avalon-overlay ${introComplete ? "is-compact" : ""}`}>
        <span>{phase}</span>
        <h1>Avalon</h1>
        <p>
          {introComplete
            ? "Scroll to scrub back out through the approach, or click a location marker on Earth."
            : "Loading through the Local Group, Milky Way, a starfield, the Sun, and into an Earth-Moon system with real Moon scale."}
        </p>
      </div>

      <aside className={`avalon-project-panel ${introComplete ? "is-visible" : ""}`}>
        <span>{activeLocation.label}</span>
        <h2>{activeLocation.title}</h2>
        <p>{activeLocation.description}</p>
      </aside>
    </section>
  );
}
