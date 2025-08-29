// GitHubProfileCard.jsx
// Requires: npm i react-github-calendar
import React, { useEffect, useRef } from "react";
import GitHubCalendar from "react-github-calendar";
import useScrollThresholdFade from "../tools/useScrollThresholdFade.jsx";

export default function GitHubProfileCard() {
  const fadeStyle = useScrollThresholdFade(80, 8000000, 300);
  const username = "FowlFarmer";

  const base = "https://github-readme-stats.vercel.app/api";
  const statsURL = `${base}?username=${username}&show_icons=true&theme=transparent`;
  const topLangsURL = `${base}/top-langs/?username=${username}&layout=compact&theme=transparent`;

  const calendarHostRef = useRef(null);

  // Make the calendar SVG responsive (infinite shrink)
  useEffect(() => {
    if (!calendarHostRef.current) return;

    const makeSvgResponsive = () => {
      const svg = calendarHostRef.current.querySelector("svg");
      if (!svg) return;

      // If already processed, skip
      if (svg.dataset.responsive === "1") return;

      // Grab natural size
      let w = parseFloat(svg.getAttribute("width")) || svg.viewBox?.baseVal?.width;
      let h = parseFloat(svg.getAttribute("height")) || svg.viewBox?.baseVal?.height;

      // Fallback: try bounding box if width/height missing
      if ((!w || !h) && svg.getBBox) {
        const bb = svg.getBBox();
        w = w || bb.width || 800;
        h = h || bb.height || 150;
      }
      if (!w || !h) {
        // last resort
        w = 800; h = 150;
      }

      // Ensure a viewBox exists so the SVG can scale
      if (!svg.getAttribute("viewBox")) {
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }

      // Remove fixed sizing and let CSS handle it
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

      // Prevent clipping of labels when scaled
      svg.style.overflow = "visible";

      // mark done
      svg.dataset.responsive = "1";
    };

    // Run once after initial render
    const mo = new MutationObserver(makeSvgResponsive);
    mo.observe(calendarHostRef.current, { childList: true, subtree: true });
    // Try immediately in case it’s already there
    makeSvgResponsive();

    return () => mo.disconnect();
  }, []);

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "180px",
        width: "90%",
        position: "relative",
        alignContent: "center",
        ...fadeStyle,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "20px" }}>
        {/* LEFT: Calendar (now truly responsive) */}
        <div className="flex items-start justify-start" style={{ flex: "1 1 450px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, marginBottom: 12 }}>
              GitHub Activity —{" "}
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {username}
              </a>
            </h2>

            <div
              className="glass-effect"
              style={{
                padding: 12,
                borderRadius: 12,
                overflow: "hidden",
              }}
              ref={calendarHostRef}
            >
              {/* The SVG inside will be converted to fluid sizing via the effect above */}
              <GitHubCalendar
                username={username}
                fontSize={14}
                blockSize={11}
                blockMargin={4}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Stats images */}
        <div style={{ flex: "1 1 450px", alignContent: "center" }}>
          <div
            className="glass-effect"
            style={{
              padding: 12,
              borderRadius: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
              <img
                src={statsURL}
                alt={`${username} GitHub stats`}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
            </a>
            <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
              <img
                src={topLangsURL}
                alt={`${username} top languages`}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}