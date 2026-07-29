import React from "react";

export default function WaterlooRouletteCard() {
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        overflow: "hidden",
        padding: "18px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flex: "1 1 520px",
            minWidth: 0,
          }}
        >
          <img
            src="/waterloo_roulette/favicon-transparent.png"
            alt="Waterloo Roulette"
            style={{
              width: "52px",
              height: "52px",
              objectFit: "contain",
              flex: "0 0 auto",
              filter: "drop-shadow(0 0 16px rgba(255, 214, 87, 0.18))",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 6px", fontWeight: "bold", fontSize: "1.1rem" }}>
              try my new game!!
            </p>
            <p style={{ margin: 0 }}>
              waterloo.careers is your second home if you got unlucky during this
              term&apos;s job search! Why apply to REAL jobs if you could spend those
              hours gambling on a roulette table for FAKE jobs in a fantasy Isekai
              world? 🤔🤔
            </p>
          </div>
        </div>

        <a href="https://waterloo.careers" target="_blank" rel="noopener noreferrer">
          <button className="rounded-button" type="button">
            play @ waterloo.careers
          </button>
        </a>
      </div>
    </div>
  );
}
