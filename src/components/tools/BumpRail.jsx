// BumpRail.jsx
import React from "react";
import { motion } from "framer-motion";

/**
 * BumpRail
 * - draws the baseline and "^" bumps
 * - expects bumps: [{ id, x, opacity }]
 */
export default function BumpRail({
  width,
  height = 48,
  baselineY = 28,
  caretSize = 8,
  bumps = [],
  onBumpClick,
}) {
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <motion.line
        x1={0}
        y1={baselineY}
        x2={width}
        y2={baselineY}
        stroke="black"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3 }}
      />
      {bumps.map(({ id, x, opacity }) => {
        const yTop = baselineY - caretSize;
        const yBot = baselineY + caretSize * 0.75;
        return (
          <motion.g
            key={id}
            animate={{ opacity }}
            transition={{ duration: 0.15 }}
            onClick={onBumpClick ? () => onBumpClick(id) : undefined}
            style={{ cursor: onBumpClick ? "pointer" : "default" }}
          >
            <line
              x1={x - caretSize}
              y1={yBot}
              x2={x}
              y2={yTop}
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={x}
              y1={yTop}
              x2={x + caretSize}
              y2={yBot}
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.g>
        );
      })}
    </svg>
  );
}