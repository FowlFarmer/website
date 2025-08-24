// AnyFader.jsx
import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * AnyFader
 * - Fades between ANY React nodes (text, images, JSX trees, components)
 *
 * Props:
 *   items: React.ReactNode[]           // content to cycle through
 *   interval: number = 3000            // ms between switches
 *   fadeDuration: number = 0.8         // seconds for fade
 *   height: string | number = "1.5rem" // fixed height to prevent layout shift
 *   className: string                  // wrapper classes (centering, fonts, etc.)
 *   contentClassName: string           // classes applied to the inner content container
 *   startIndex: number = 0
 *   pauseOnHover: boolean = true
 *   getKey?: (item: React.ReactNode, index: number) => React.Key // stable keys (optional)
 */
export default function AnyFader({
  items = [<span key="a">First</span>, <span key="b">Second</span>],
  interval = 3000,
  fadeDuration = 0.8,
  height = "1.5rem",
  className = "relative flex items-center justify-center overflow-hidden",
  contentClassName = "",
  startIndex = 0,
  pauseOnHover = true,
  getKey,
}) {
  const [index, setIndex] = useState(startIndex % Math.max(items.length, 1));
  const [paused, setPaused] = useState(false);
  const lenRef = useRef(items.length);

  // If items length changes, keep index in range
  useEffect(() => {
    if (items.length !== lenRef.current) {
      lenRef.current = items.length;
      setIndex((i) => (items.length ? i % items.length : 0));
    }
  }, [items.length]);

  // Auto-advance timer
  useEffect(() => {
    if (!items.length || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(id);
  }, [items.length, interval, paused]);

  const current = items.length ? items[index] : null;
  const key =
    (getKey && current != null ? getKey(current, index) : undefined) ??
    `anyfader-${index}`;

  return (
    <div
      className={className}
      style={{ height }}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
      aria-live="polite"
    >
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
  );
}