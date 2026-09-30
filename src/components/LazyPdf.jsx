import React, { useEffect, useRef, useState } from "react";

// LazyPdf.jsx
// An inline PDF viewer, scrollable in place. Each one runs the browser's whole PDF viewer, so it
// loads only once it comes near the screen; until then it shows a picture of the document's
// opening page (`poster`, by default the PDF's name with `_preview.webp`).
export default function InlinePdf({
  src = "/docs/sample.pdf", // path in /public or full URL
  height = 700,
  className = "",
  hideToolbar = true,
  poster = src.replace(/\.pdf$/, "_preview.webp"),
}) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: "300px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);

  const url = hideToolbar ? `${src}#toolbar=0&navpanes=0&scrollbar=0` : src;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
        background: "#fff",
      }}
    >
      {near ? (
        <embed
          src={url}
          type="application/pdf"
          width="100%"
          height={height}
          style={{ display: "block" }}
        />
      ) : (
        <div className="lazy-pdf" style={{ height }}>
          <img src={poster} alt="" loading="lazy" decoding="async" />
        </div>
      )}
    </div>
  );
}
