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
    const handleScroll = () => {
      const scrollY = window.scrollY;
      let index = 0;
      for (let i = 0; i < breakpoints.length; i++) {
        if (scrollY >= breakpoints[i]) index = i + 1;
        else break;
      }
      if (index !== activeIndex) setActiveIndex(index);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // initialize
    return () => window.removeEventListener("scroll", handleScroll);
  }, [breakpoints, activeIndex]);

  return (
    <div >
      {images.map((src, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            backgroundSize: "cover",
            backgroundImage: `url(${src})`,
            opacity: i === activeIndex ? 1 : 0,
            transition: `opacity ${transitionDuration}s ease-in-out`,
            pointerEvents: "none", // allow scrolling
            zIndex: -1, // behind content
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            inset: 0,
          }}
        />
      ))}
    </div>
  );
}
