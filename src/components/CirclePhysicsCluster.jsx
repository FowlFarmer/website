import React, { useEffect, useRef, useState } from "react";
import Matter, { Engine, World, Bodies, Body, Events } from "matter-js";
import Circle from "./Circle";
import "./CircleCluster.css";

export default function CirclePhysicsCluster({
  count = 8,
  width = 700,
  height = 450,
  baseRadius = 28,
  hoverScale = 1.4,
  growthSpeed = 0.05, // fraction per tick
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const originalsRef = useRef(new Map());
  const hoveredMapRef = useRef(new Map()); // id -> boolean
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const engine = Engine.create();
    engine.gravity.y = 0;
    engineRef.current = engine;
    const world = engine.world;

    // Walls
    const thickness = 200;
    const walls = [
      Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
      Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
    ];
    World.add(world, walls);

    // Circles
    const circles = [];
    for (let i = 0; i < count; i++) {
      const r = baseRadius * (0.85 + Math.random() * 0.3);
      const x = width * (0.3 + Math.random() * 0.4);
      const y = height * (0.3 + Math.random() * 0.4);
      const circle = Bodies.circle(x, y, r, {
        restitution: 0.9,
        frictionAir: 0.02,
      });
      originalsRef.current.set(circle.id, r);
      hoveredMapRef.current.set(circle.id, false); // initial hover state
      circles.push(circle);
    }
    bodiesRef.current = circles;
    World.add(world, circles);

    // Attraction to center
    const center = { x: width / 2, y: height / 2 };
    const centerAttractionK = 0.0002;
    const maxPull = 0.0025;

    // --- Engine tick
    Events.on(engine, "beforeUpdate", () => {
      for (const b of bodiesRef.current) {
        // center attraction
        const dx = center.x - b.position.x;
        const dy = center.y - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const fx = Math.min((dx / dist) * centerAttractionK * b.mass, maxPull);
        const fy = Math.min((dy / dist) * centerAttractionK * b.mass, maxPull);
        Body.applyForce(b, b.position, { x: fx, y: fy });

        // gradual radius adjustment
        const hovered = hoveredMapRef.current.get(b.id);
        const originalR = originalsRef.current.get(b.id);
        const targetR = hovered ? originalR * hoverScale : originalR;
        const currentR = b.circleRadius;
        const deltaR = (targetR - currentR) * growthSpeed;
        if (Math.abs(deltaR) > 0.01) {
          const scaleFactor = (currentR + deltaR) / currentR;
          Body.scale(b, scaleFactor, scaleFactor);
        }
      }
    });

    // RAF tick loop
    let raf;
    const loop = () => {
      Engine.update(engine, 1000 / 60);
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      Engine.clear(engine);
      bodiesRef.current = [];
      originalsRef.current.clear();
      hoveredMapRef.current.clear();
    };
  }, [count, width, height, baseRadius, growthSpeed, hoverScale]);

  // Hover handlers
  const handleHoverStart = (id) => {
    hoveredMapRef.current.set(id, true);
    setHovered(id);

    // optionally push neighbors slightly
    const body = bodiesRef.current.find((b) => b.id === id);
    if (!body) return;
    const repulseK = 0.005;
    for (const other of bodiesRef.current) {
      if (other === body) continue;
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      const dist2 = dx * dx + dy * dy || 1;
      const dist = Math.sqrt(dist2);
      const nx = dx / dist;
      const ny = dy / dist;
      const forceMag = repulseK / Math.max(dist2, 200);
      Body.applyForce(other, other.position, { x: nx * forceMag, y: ny * forceMag });
    }
  };

  const handleHoverEnd = (id) => {
    hoveredMapRef.current.set(id, false);
    setHovered(null);
  };

  return (
    <div
      ref={containerRef}
      className="circle-cluster-container"
      style={{ width, height }}
    >
      {bodiesRef.current.map((b) => (
        <Circle
          key={b.id}
          body={b}
          isHovered={hovered === b.id}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          extraInfo={hovered === b.id ? `ID: ${b.id}` : null}
        />
      ))}
    </div>
  );
}
