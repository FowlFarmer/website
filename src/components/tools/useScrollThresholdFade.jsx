import { useEffect, useState } from "react";

export default function useScrollThresholdFade(minPx = 0, maxPx = Infinity, fadeDuration = 300) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const target = y < minPx || y > maxPx ? 0 : 1;
      setOpacity(target);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [minPx, maxPx]);

  // Return style object so you can just spread it
  return {
    opacity
    // transition: `opacity ${fadeDuration}ms ease-in-out`
  };
}
