// ProjectFader.jsx — AnyFader (jias-react-components/tools/AnyFader.jsx) with small arrows either
// side of its progress bars (one per project: earlier ones full, the current one filling) to skip to
// the previous or next project. The bar sits at the top, so the
// arrows stay put however the height changes below them. It moves on by itself after each item's
// `interval` (a number, or one per item), pauses while hovered or off screen, fades between items
// and eases its height to fit each one.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";

export default function ProjectFader({
  items = [],
  interval = 3000,
  fadeDuration = 0.35,
  className = "",
  startIndex = 0,
  onIndexChange,
}) {
  const [index, setIndex] = useState(startIndex);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const isPaused = hoverPaused || !inView;

  const currentDelay = useMemo(() => {
    if (Array.isArray(interval)) {
      const delays = interval.filter((n) => Number.isFinite(n) && n > 0);
      return delays.length ? delays[index % delays.length] : 0;
    }
    return Number.isFinite(interval) ? Math.max(0, interval) : 0;
  }, [interval, index]);

  const goTo = (next) => {
    const wrapped = (next + items.length) % items.length;
    onIndexChange?.(wrapped);
    setIndex(wrapped);
    setElapsedMs(0);
  };

  // Advance the progress bar every frame, and the item once it's full.
  useEffect(() => {
    let frame = 0;
    let last = null;
    const tick = (now) => {
      const dt = last == null ? 0 : now - last;
      last = now;
      if (!isPaused && items.length > 1 && currentDelay > 0) {
        setElapsedMs((prev) => {
          const next = prev + dt;
          if (next >= currentDelay) {
            const nextIndex = (index + 1) % items.length;
            onIndexChange?.(nextIndex);
            setIndex(nextIndex);
            return 0;
          }
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, isPaused, items.length, currentDelay, onIndexChange]);

  // Ease the height to the current item's natural height.
  const contentRef = useRef(null);
  const [targetH, setTargetH] = useState(0);
  useEffect(() => {
    if (!contentRef.current) return undefined;
    const measure = () => {
      // The rect is in zoomed screen pixels (phone cards use `zoom: 0.9`) but the height is set in
      // the card's own pixels, so undo the zoom or the bottom of the item gets clipped.
      const el = contentRef.current;
      const rect = el?.getBoundingClientRect();
      const h = rect?.width ? rect.height * (el.offsetWidth / rect.width) : 0;
      if (h > 0) setTargetH(h);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    measure();
    return () => observer.disconnect();
  }, [index, items]);

  // Pause while off screen.
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.1),
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!items.length) return null;
  const current = items[index % items.length];
  const progressPct = currentDelay > 0 ? Math.max(0, Math.min(100, (elapsedMs / currentDelay) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      {items.length > 1 && currentDelay > 0 && (
        <div className="project-fader-controls">
          <button type="button" aria-label="Previous project" onClick={() => goTo(index - 1)}>‹</button>
          {/* One bar per project: the ones before the current one full, the current one filling. */}
          <div className="project-fader-bars" aria-label={`Project ${(index % items.length) + 1} of ${items.length}`}>
            {items.map((_, i) => (
              <div key={i} className="project-fader-bar">
                <div style={{ width: i < index % items.length ? '100%' : i === index % items.length ? `${progressPct}%` : 0 }} />
              </div>
            ))}
          </div>
          <button type="button" aria-label="Next project" onClick={() => goTo(index + 1)}>›</button>
        </div>
      )}
      <motion.div
        style={{ overflow: "hidden" }}
        animate={{ height: targetH }}
        initial={false}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <div ref={contentRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: fadeDuration } }}
            >
              {current}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
