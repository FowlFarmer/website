// useScrollFade.js
import { useEffect, useRef, useState } from "react";

export default function useScrollFade({
  fadeInStart = 0,
  fadeInEnd = 300,
  fadeOutStart = 800,
  fadeOutEnd = 1200,
} = {}) {
  const [opacity, setOpacity] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const interp01 = (start, end, x) =>
      clamp((x - start) / (end - start), 0, 1);

    const computeOpacity = (y) => {
      if (y <= fadeInStart) return 0;
      if (y < fadeInEnd) return interp01(fadeInStart, fadeInEnd, y);
      if (y < fadeOutStart) return 1;
      if (y < fadeOutEnd) return 1 - interp01(fadeOutStart, fadeOutEnd, y);
      return 0;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setOpacity(computeOpacity(window.scrollY || window.pageYOffset));
        ticking.current = false;
      });
    };

    onScroll(); // initial
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]);

  return { opacity };
}
