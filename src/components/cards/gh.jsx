// GitHubProfileCard.jsx
import React from "react";
import GitHubCalendar from "react-github-calendar";
import useScrollThresholdFade from "../tools/useScrollThresholdFade.jsx";

export default function GitHubProfileCard() {
  const fadeStyle = useScrollThresholdFade(80, 8000000, 300);
  const username = "FowlFarmer";

  // GitHub stats image URLs
  const base = "https://github-readme-stats.vercel.app/api";
  const statsURL = `${base}?username=${username}&show_icons=true&theme=transparent`;
  const topLangsURL = `${base}/top-langs/?username=${username}&layout=compact&theme=transparent`;

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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          padding: "20px",
        }}
      >
        {/* LEFT: Calendar */}
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
                overflowX: "auto",
                borderRadius: 12,
              }}
            >
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
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={statsURL}
                alt={`${username} GitHub stats`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: 8,
                  background: "transparent",
                }}
              />
            </a>
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={topLangsURL}
                alt={`${username} top languages`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: 8,
                  background: "transparent",
                }}
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}