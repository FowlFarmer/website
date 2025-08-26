import { useEffect, useRef, useState } from "react";

/**
 * ScrollBreakpointBackground (center-trigger)
 *
 * images.length === breakpointIds.length + 1
 * Breakpoint i triggers when CENTER(#breakpointIds[i]) aligns with VIEWPORT CENTER.
 */
export default function ScrollBreakpointBackground({
  images = [],
  breakpointIds = [],
  transitionDuration = 0.8,
  viewportBias = 0, // extra bias in viewport heights (+ right/down, - left/up). 0 = exact center
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const yBreaksRef = useRef([]); // scrollY values at which we switch to the next image

  // Compute the scrollY at which each element's CENTER hits the viewport CENTER
  useEffect(() => {
    const resolveBreaks = () => {
      const vh = window.innerHeight;
      const biasPx = vh * viewportBias; // optional nudge from exact center
      const ys = breakpointIds.map((id) => {
        const el = document.getElementById(id);
        if (!el) {
          console.warn(`[ScrollBG] Missing element for id="${id}"`);
          return Infinity;
        }
        const rect = el.getBoundingClientRect();
        const pageTop = rect.top + window.scrollY;
        const elCenter = pageTop + rect.height / 2;
        // Scroll position where element center aligns with viewport center (plus bias)
        const triggerAt = elCenter - vh / 2 + biasPx;
        return triggerAt;
      });
      yBreaksRef.current = ys;
    };

    resolveBreaks();
    // Recompute on resize/orientation/font/layout shifts
    window.addEventListener("resize", resolveBreaks);
    window.addEventListener("orientationchange", resolveBreaks);
    const raf = requestAnimationFrame(resolveBreaks); // catch late layout

    // Optional: track late DOM mutations that shift layout
    let mo;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(resolveBreaks);
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("resize", resolveBreaks);
      window.removeEventListener("orientationchange", resolveBreaks);
      cancelAnimationFrame(raf);
      if (mo) mo.disconnect();
    };
  }, [breakpointIds.join("|"), viewportBias]);

  // Scroll logic: count how many center-breakpoints we've passed
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      let idx = 0;
      const breaks = yBreaksRef.current;
      for (let i = 0; i < breaks.length; i++) {
        if (y >= breaks[i]) idx = i + 1;
        else break;
      }
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActiveIndex(idx);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // init once
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "black",
        }}
      />
      {images.map((src, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: i === activeIndex ? 1 : 0,
            transition: `opacity ${transitionDuration}s ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}