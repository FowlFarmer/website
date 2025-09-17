import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export function InlineTextFader({
  texts,
  index,
  fadeDuration = 0.25,
  className = "",
}) {
  const reserve = texts?.reduce((a, b) => (b.length > a.length ? b : a), "") ?? "";

  return (
    // inline-grid overlays children in the same inline box (no absolute/floats)
    <span
      className="inline-grid align-baseline"
      style={{ lineHeight: "inherit" }}
    >
      {/* Sizer: hidden but sets the box width; sits in the same grid cell */}
      <span
        className={className}
        style={{
          gridArea: "1 / 1",
          visibility: "hidden",
          whiteSpace: "nowrap",
        }}
        aria-hidden="true"
      >
        {reserve}
      </span>

      {/* Animated visible layer, perfectly overlapped with the sizer */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${index}:${texts?.[index] ?? ""}`}
          className={className}
          style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
          aria-live="polite"
        >
          {texts?.[index] ?? ""}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}