import { useEffect, useRef } from 'react';

const PETAL_COLORS = ['#f49ab0', '#ffb5c6', '#ffd0da', '#e986a2'];

export default function SakuraCursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let previousPointer = null;
    let spawnCarry = 0;
    let animationFrame = 0;
    let previousFrameTime = performance.now();

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawPetal = (particle) => {
      const progress = particle.life / particle.maxLife;
      const alpha = Math.sin(Math.PI * Math.min(progress, 1));
      const size = particle.size * (0.72 + progress * 0.36);
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.scale(1, 0.74);
      context.beginPath();
      context.moveTo(0, -size * 0.82);
      context.bezierCurveTo(size * 0.72, -size * 0.44, size * 0.62, size * 0.44, 0, size);
      context.bezierCurveTo(-size * 0.62, size * 0.44, -size * 0.72, -size * 0.44, 0, -size * 0.82);
      context.fillStyle = `${particle.color}${Math.round(alpha * 230).toString(16).padStart(2, '0')}`;
      context.fill();
      context.restore();
    };

    const animate = (time) => {
      const delta = Math.min((time - previousFrameTime) / 16.67, 2.2);
      previousFrameTime = time;
      context.clearRect(0, 0, width, height);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life += time - particle.lastTime;
        particle.lastTime = time;
        particle.x += particle.velocityX * delta;
        particle.y += particle.velocityY * delta;
        particle.velocityX *= Math.pow(0.982, delta);
        particle.velocityY = particle.velocityY * Math.pow(0.986, delta) + 0.025 * delta;
        particle.rotation += particle.spin * delta;

        if (particle.life >= particle.maxLife) {
          particles.splice(index, 1);
        } else {
          drawPetal(particle);
        }
      }

      if (particles.length) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        animationFrame = 0;
      }
    };

    const emitPetal = (x, y, movementX, movementY, time) => {
      const angle = Math.random() * Math.PI * 2;
      const outwardSpeed = 0.55 + Math.random() * 1.35;
      particles.push({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 5,
        velocityX: Math.cos(angle) * outwardSpeed - movementX * 0.018,
        velocityY: Math.sin(angle) * outwardSpeed - movementY * 0.018,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.16,
        size: 2.2 + Math.random() * 3.2,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        life: 0,
        maxLife: 520 + Math.random() * 520,
        lastTime: time,
      });
      if (particles.length > 220) particles.splice(0, particles.length - 220);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const current = { x: event.clientX, y: event.clientY };
      if (!previousPointer) {
        previousPointer = current;
        return;
      }

      const movementX = current.x - previousPointer.x;
      const movementY = current.y - previousPointer.y;
      const distance = Math.hypot(movementX, movementY);
      const spacing = reduceMotion ? 28 : 8;
      spawnCarry += distance / spacing;
      const emitCount = Math.min(Math.floor(spawnCarry), reduceMotion ? 1 : 6);
      spawnCarry -= emitCount;
      const time = performance.now();

      for (let index = 0; index < emitCount; index += 1) {
        const interpolation = emitCount === 1 ? 1 : index / (emitCount - 1);
        emitPetal(
          previousPointer.x + movementX * interpolation,
          previousPointer.y + movementY * interpolation,
          movementX,
          movementY,
          time,
        );
      }

      previousPointer = current;
      if (particles.length && !animationFrame) {
        previousFrameTime = time;
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="sakura-cursor-canvas" aria-hidden="true" />;
}
