import { useEffect, useState, useRef } from "react";

export default function FadeProps(minVisiblePx = 100, fadeDuration = 300) {
  const [opacity, setOpacity] = useState(0); // start hidden
  const ref = useRef(null);

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Amount of the element visible
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);

      const isVisible = visibleHeight >= minVisiblePx;
      setOpacity(isVisible ? 1 : 0);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [minVisiblePx]);

  return {
    ref,
    style: {
      opacity,
      transition: `opacity ${fadeDuration}ms ease-in-out`,
    },
  };
}
