import { useState, useEffect } from "react";

/**
 * ScrollBreakpointBackground
 *
 * Props:
 *  - images: array of image URLs in order
 *  - breakpoints: array of scrollY numbers where image switches
 *      -> breakpoints.length should be images.length - 1
 *  - transitionDuration: seconds for fade in/out
 */
export default function ScrollBreakpointBackground({
  images = [],
  breakpoints = [],
  transitionDuration = 0.8,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      let idx = 0;
      for (let i = 0; i < breakpoints.length; i++) {
        if (y >= breakpoints[i]) idx = i + 1; else break;
      }
      if (idx !== setActiveIndex.current) setActiveIndex(idx);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [breakpoints]);

  return (
    // fixed stack ABOVE the body, BELOW your content
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,                   // <- not negative
      }}
    >
      {/* solid fallback color visible during fades/load */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "black", // or pink/whatever
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
