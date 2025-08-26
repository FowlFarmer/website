// AnyFader.jsx — flow-based + smooth height tween + absolute bottom progress bar
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function AnyFader({
  items = [],
  interval = 3000,           // number OR number[]
  fadeDuration = 0.35,       // seconds
  className = "",
  startIndex = 0,
  onIndexChange,
}) {
  const [index, setIndex] = useState(startIndex);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [inView, setInView] = useState(true); // assume true; IO will correct
  const [elapsedMs, setElapsedMs] = useState(0);

  // Pause if either hovered OR off-screen
  const isPaused = hoverPaused || !inView;

  // Resolve per-step delay (supports array)
  const currentDelay = useMemo(() => {
    if (Array.isArray(interval)) {
      const arr = interval.filter((n) => Number.isFinite(n) && n > 0);
      if (arr.length === 0) return 0;
      return arr[index % arr.length];
    }
    return Number.isFinite(interval) ? Math.max(0, interval) : 0;
  }, [interval, index]);

  // rAF ticker (updates elapsedMs so progress bar animates smoothly)
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  useEffect(() => {
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (!isPaused && items.length > 0 && currentDelay > 0) {
        setElapsedMs((prev) => {
          const next = prev + dt;
          if (next >= currentDelay && items.length > 1) {
            const nextIndex = (index + 1) % items.length;
            onIndexChange?.(nextIndex);
            setIndex(nextIndex);
            return 0;
          }
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [index, isPaused, items.length, currentDelay, onIndexChange]);

  // Smooth height tween: measure the current slide's natural height
  const contentRef = useRef(null);
  const [targetH, setTargetH] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;

    const measure = () => {
      const h = contentRef.current?.getBoundingClientRect().height ?? 0;
      if (h > 0) setTargetH(h);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(contentRef.current);

    measure();
    const onWin = () => measure();
    window.addEventListener("resize", onWin);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [index, items]);

  // Detect visibility in viewport; pause when off-screen
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // Consider "in view" when at least 10% visible
        setInView(e.isIntersecting && e.intersectionRatio > 0.1);
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    io.observe(containerRef.current);
    return () => io.disconnect();
  }, []);

  if (!items.length) return null;

  const key = useMemo(() => `${index}`, [index]);
  const current = items[index % items.length];
  const progressPct =
    currentDelay > 0 ? Math.max(0, Math.min(100, (elapsedMs / currentDelay) * 100)) : 0;

  return (
    <motion.div
      ref={containerRef}
      className={`relative w-full ${className}`} // relative so the bar can be absolute
      style={{ overflow: "hidden" }}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      animate={{ height: targetH + 20 }}              // smooth tween to natural height
      initial={false}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Slide content stays in normal flow so it's always visible */}
      <div ref={contentRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: fadeDuration } }}
          >
            {current}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom progress bar (same style/css as before) */}
      {items.length > 1 && currentDelay > 0 && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: 15,
            height: 6,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.35)",
            overflow: "hidden",
            marginInline: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 9999,
              transition: "none",
              willChange: "width",
              transform: "translateZ(0)",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}