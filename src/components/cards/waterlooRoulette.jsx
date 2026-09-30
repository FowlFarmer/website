import React from "react";
import QuestTag from '../experience/QuestIcons.jsx';

// Live stats from waterloo.careers, checked September 29, 2026.
const STATS = [
  ['1,522', 'players'],
  ['4,888', 'runs completed'],
  ['726', 'hours played'],
  ['19,736', 'co-op jobs landed'],
];

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
      <QuestTag type="world" />
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
          className="roulette-intro"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flex: "1 1 520px",
            minWidth: 0,
          }}
        >
          <img loading="lazy" decoding="async"
            src="/waterloo_roulette/favicon-transparent.webp"
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
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", opacity: 0.85 }}>
              Edit: Somehow more jobs have been acquired on waterloo.careers than WaterlooWorks this year LMAO
            </p>
          </div>
        </div>

        <div className="roulette-side" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: "0 0 auto" }}>
          <a href="https://waterloo.careers" target="_blank" rel="noopener noreferrer">
            <span className="rounded-button">
              play @ waterloo.careers
            </span>
          </a>
          <dl className="roulette-stats">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <dt>{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
