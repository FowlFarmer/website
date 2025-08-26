import React, { useEffect, useRef, useState } from "react";

export default function HorizontalCycleBarCentered({

    // just the other one but vertically centered divs
  items,
  intervalMs = 2000,     // time between scrolls
  transitionMs = 400,     // slide duration
  visibleCount = 1,       // number of items visible
  pauseOnHover = true     // enable/disable pause on hover
}) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  // Auto-advance loop
  useEffect(() => {
    if (!items?.length || paused) return;
    const id = setInterval(() => {
      setAnimating(true);
      setIndex((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items, intervalMs, paused]);

  // Snap back when reaching the clones
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleTransitionEnd = () => {
      if (index >= items.length) {
        // Snap back instantly to real first item
        setAnimating(false);
        setIndex(0);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setAnimating(true))
        );
      }
    };

    track.addEventListener("transitionend", handleTransitionEnd);
    return () => track.removeEventListener("transitionend", handleTransitionEnd);
  }, [index, items]);

  // Clone first `visibleCount` items for seamless loop
  const clones = items.slice(0, visibleCount);
  const extendedItems = [...items, ...clones];

  return (
    <div
      className="hcyclebarcentered"
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <div
        ref={trackRef}
        className={`hcyclebarcentered-track ${animating ? "is-animating" : ""}`}
        style={{
          transform: `translateX(-${(index * 100) / visibleCount}%)`,
          transitionDuration: animating ? `${transitionMs}ms` : "0ms"
        }}
      >
        {extendedItems.map((it, i) => (
          <div
            key={i}
            className="hcyclebarcentered-item"
            style={{ flex: `0 0 ${100 / visibleCount}%` }}
          >
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}
