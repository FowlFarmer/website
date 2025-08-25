// AnyFader.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * AnyFader
 * - `interval`: number | number[]   // per-switch delay(s) in ms
 *   If array: delay before switching from item i -> i+1 is interval[i % interval.length]
 */
export default function AnyFader({
  items = [],
  interval = 3000,                  // number OR number[]
  fadeDuration = 0.8,               // seconds
  defaultHeight = "1.5rem",
  heights,
  className = "",
  glassClassName = "",
  contentClassName = "",
  startIndex = 0,
  onIndexChange,
  heightTransitionMs = 400,
}) {
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);

  const key = useMemo(() => `${index}`, [index]);

  // Resolve the delay for the *current* step
  const currentDelay = useMemo(() => {
    if (Array.isArray(interval)) {
      const arr = interval.filter((n) => Number.isFinite(n) && n > 0);
      if (arr.length === 0) return 0;
      return arr[index % arr.length];
    }
    return Number.isFinite(interval) ? Math.max(0, interval) : 0;
  }, [interval, index]);

  // Resolve current height: per-item height if provided, else fallback default
  const resolvedHeight = useMemo(() => {
    if (Array.isArray(heights) && heights.length > 0) {
      const h = heights[index % heights.length];
      return h ?? defaultHeight;
    }
    return defaultHeight;
  }, [heights, index, defaultHeight]);

  // rAF ticker (pausable), using the *currentDelay* per step
  useEffect(() => {
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (!paused && items.length > 0 && currentDelay > 0) {
        setElapsedMs((prev) => {
          const next = prev + dt;
          if (next >= currentDelay && items.length > 1) {
            const newIndex = (index + 1) % items.length;
            onIndexChange?.(newIndex);
            setIndex(newIndex);
            return 0; // reset progress for next step (which will use a new delay)
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
  }, [index, paused, items.length, currentDelay, onIndexChange]);

  if (!items || items.length === 0) return null;

  const current = items[index % items.length];
  const progressPct =
    currentDelay > 0 ? Math.max(0, Math.min(100, (elapsedMs / currentDelay) * 100)) : 0;

  return (
    <motion.div
      className={`relative w-full overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      animate={{
        height:
          typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight,
      }}
      initial={false}
      transition={{ duration: heightTransitionMs / 1000, ease: "easeInOut" }}
      style={{ willChange: "height" }}
    >
      {/* Optional glass layer */}
      <div className={`absolute inset-0 pointer-events-none ${glassClassName || ""}`} />

      {/* Stage */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            className={`absolute inset-0 flex items-center justify-center ${contentClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: fadeDuration }}
          >
            {current}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom progress bar (no CSS transition on width) */}
      {items.length > 1 && currentDelay > 0 && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: 8,
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