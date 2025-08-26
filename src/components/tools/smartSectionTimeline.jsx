// ScrollableBumpStrip.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import BumpRail from "./BumpRail";

export default function SmartSectionTimeline({
  bumpCount = 5,
  bumpSpacing = 100,
  sidePadding = 24,
  height = 48,
  baselineY = 28,
  falloff = 1.2, // × bumpSpacing
  onBumpClick,
}) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [cw, setCw] = useState(0);
  const [centerX, setCenterX] = useState(0);

  // measure container width
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseW = sidePadding * 2 + (bumpCount - 1) * bumpSpacing;
  const contentW = Math.max(baseW, Math.ceil(cw * 2));

  const bumps = useMemo(
    () =>
      Array.from({ length: bumpCount }, (_, i) => ({
        id: i,
        x: sidePadding + i * bumpSpacing,
      })),
    [bumpCount, bumpSpacing, sidePadding]
  );

  const falloffPx = bumpSpacing * falloff;
  const opacityAt = (x) =>
    Math.max(0, Math.min(1, 1 - Math.abs(x - centerX) / falloffPx));

  // update center on scroll / resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setCenterX(el.scrollLeft + el.clientWidth / 2);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // hijack wheel for horizontal scroll
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!hovered) return;
      el.scrollLeft += e.deltaY + e.deltaX;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hovered]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        touchAction: "pan-x",
        cursor: hovered ? "ew-resize" : "default",
      }}
    >
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
      <BumpRail
        width={contentW}
        height={height}
        baselineY={baselineY}
        bumps={bumps.map((b) => ({ ...b, opacity: opacityAt(b.x) }))}
        onBumpClick={onBumpClick}
      />
    </div>
  );
}