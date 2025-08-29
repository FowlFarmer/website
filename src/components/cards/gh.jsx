// GitHubProfileCard.jsx
import React from "react";
import GitHubCalendar from "react-github-calendar";
import useScrollThresholdFade from "../tools/useScrollThresholdFade.jsx";

export default function GitHubProfileCard() {
  const fadeStyle = useScrollThresholdFade(80, 8000000, 300);
  const username = "FowlFarmer";

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
      {/* Make the two columns behave symmetrically */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          padding: "20px",
          alignItems: "stretch",
        }}
      >
        {/* LEFT: Calendar */}
        <h2 style={{ margin: 0, marginBottom: 12 }}>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              />
              The Cycle of Software Life{" "}
              <span style={{ opacity: 0.4 }}>(Building)</span> and Death{" "}
              <span style={{ opacity: 0.4 }}>(I Broke Stuff)</span>
            </h2>
        <div style={{ flex: "1 1 320px", display: "flex" }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            <div
              className="glass-effect"
              style={{
                padding: 12,
                borderRadius: 12,
                /* key: allow shrinking instead of forcing horizontal scroll */
                overflow: "hidden",
              }}
            >
              {/* Force the calendar SVG to be responsive */}
              <div className="calendar-wrap">
                <GitHubCalendar
                  username={username}
                  fontSize={14}
                  blockSize={11}
                  blockMargin={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Stats images */}
        <div style={{ flex: "1 1 320px", display: "flex" }}>
          <div
            className="glass-effect"
            style={{
              padding: 12,
              borderRadius: 12,
              display: "grid",
              gap: 12,
              width: "100%",
            }}
          >
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block" }}
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
              style={{ display: "block" }}
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

      {/* Scoped CSS to make the calendar responsive */}
      <style>{`
        .calendar-wrap .react-activity-calendar {
          width: 100%;
        }
        .calendar-wrap .react-activity-calendar svg {
          width: 100% !important;
          height: auto !important;
        }
      `}</style>
    </div>
  );
}