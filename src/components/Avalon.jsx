import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createEarthMarker, updateEarthMarker } from "./avalon/earthMarkers.js";
import { latLonToVector3 } from "./avalon/geo.js";
import { avalonLocations } from "./avalon/locations.js";

function createStars(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const white = new THREE.Color("#ffffff");
  const blue = new THREE.Color("#8cc8ff");

  for (let i = 0; i < count; i += 1) {
    const radius = 120 + Math.random() * 260;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const color = white.clone().lerp(blue, Math.random() * 0.65);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
}

export default function Avalon() {
  const mountRef = useRef(null);
  const [activeLocation, setActiveLocation] = useState(avalonLocations[0]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const locationActions = {
      "select-location": setActiveLocation,
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#02030a");

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
    camera.position.set(0, 8, 62);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor("#02030a", 1);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#9ab8ff", 0.7);
    const sun = new THREE.DirectionalLight("#fff1c7", 3);
    sun.position.set(-35, 20, 40);
    scene.add(ambient, sun, createStars(1400));

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(18, 64, 64),
      new THREE.MeshStandardMaterial({
        color: "#2f8cff",
        roughness: 0.85,
        metalness: 0.02,
      }),
    );
    earthGroup.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(18.8, 64, 64),
      new THREE.MeshBasicMaterial({
        color: "#8adfff",
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    earthGroup.add(atmosphere);

    const landMaterial = new THREE.MeshStandardMaterial({ color: "#58c76f", roughness: 0.9 });
    [
      [48, -98, 5.6, 2.7, 0.3],
      [4, -62, 4.8, 2.4, -0.6],
      [50, 18, 5.2, 2.6, 0.1],
      [12, 82, 5.8, 2.5, 0.8],
      [-24, 134, 4.1, 2.0, -0.3],
    ].forEach(([lat, lon, sx, sy, tilt]) => {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), landMaterial);
      patch.position.copy(latLonToVector3(lat, lon, 18.3));
      patch.scale.set(sx, sy, 0.22);
      patch.lookAt(0, 0, 0);
      patch.rotateZ(tilt);
      earthGroup.add(patch);
    });

    const markers = avalonLocations.map((location) => {
      const marker = createEarthMarker(location);
      earthGroup.add(marker);
      return marker;
    });
    const markerRayTargets = markers.flatMap((marker) => marker.userData.rayTargets);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const pick = (event, commit) => {
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

    window.addEventListener("resize", resize);
    renderer.domElement.addEventListener("pointermove", handleMove);
    renderer.domElement.addEventListener("click", handleClick);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      earthGroup.rotation.y = elapsed * 0.16;
      atmosphere.rotation.y = -elapsed * 0.08;

      markers.forEach((marker) => updateEarthMarker(marker, elapsed, marker === hovered));

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
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

      <div className="avalon-overlay">
        <span>Interactive portfolio map</span>
        <h1>Avalon</h1>
        <p>Simple first pass: a procedural Earth with extensible latitude and longitude markers for project locations.</p>
      </div>

      <aside className="avalon-project-panel">
        <span>{activeLocation.label}</span>
        <h2>{activeLocation.title}</h2>
        <p>{activeLocation.description}</p>
      </aside>
    </section>
  );
}
