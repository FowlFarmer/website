import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TextFader({
  texts = ["First text", "Second text"],
  interval = 3000,       // ms before switching
  fadeDuration = 0.8,    // seconds for fade
//   width = "200px",       // fixed width (configurable)
  height = "1.5rem",      // fixed height (configurable)
  className = "text-xl font-semibold text-center"
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{ height }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className={className + " absolute"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
