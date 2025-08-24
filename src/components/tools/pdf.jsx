import React, { useEffect, useRef, useState } from "react";

// InlinePdf.jsx
export default function InlinePdf({
  src = "/docs/sample.pdf", // path in /public or full URL
  height = 700,
  className = "",
  hideToolbar = true,
}) {
  const url = hideToolbar ? `${src}#toolbar=0&navpanes=0&scrollbar=0` : src;
  return (
    <div
      className={className}
      style={{
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
        background: "#fff",
      }}
    >
      <embed
        src={url}
        type="application/pdf"
        width="100%"
        height={height}
        style={{ display: "block" }}
      />
    </div>
  );
}