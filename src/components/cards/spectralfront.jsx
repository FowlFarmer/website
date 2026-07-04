import React from "react";

export default function SpectralFrontCard() {
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <img
          src="/spectralfront/icon.svg"
          alt="Spectral Front icon"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            boxShadow: "0 0 24px rgba(117, 255, 245, 0.18)",
          }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: "bold" }}>Featured Project - Spectral Front</p>
          <p style={{ margin: "2px 0 0", opacity: 0.72 }}>Live tactical graph-artillery duel</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: "1.15 1 520px", minWidth: 0 }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "2894 / 1488",
              overflow: "hidden",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <img
              src="/spectralfront/spectralfront.png"
              alt="Spectral Front gameplay screenshot"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>

        <div style={{ flex: "1 1 360px", alignContent: "center" }}>
          <p style={{ marginTop: 0 }}>
            Spectral Front is a live tactical artillery game where players define
            functions to shoot enemies, move ships, manage energy, and fight around
            planets, moons, and asteroids.
          </p>
          <p>
            Built with Next.js, a canvas renderer, a pure game model, Redis matchmaking,
            WebRTC live matches, and a local bot-training mode.
          </p>
          <a href="https://spectralfront.com" target="_blank" rel="noopener noreferrer">
            <button className="rounded-button" type="button">
              play @ spectralfront.com
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
