// SmallProjectsCard.jsx
import React from 'react';
import AnyFader from '../tools/AnyFader.jsx';
import HorizontalCycleBarCentered from '../tools/itemscycleCentered.jsx';
import InlinePdf from '../tools/pdf.jsx';

export default function Shipbuilding() {

  const _items = [
  
  ];

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div class="hero-content">
        <div class="hero-left">
          <h1 class="hero-title" style={{marginRight: "0.5rem"}}>
            Minecraft: Shipbuilding
            {/* <span class="hero-pipe">|</span> */}
            <span style={{marginLeft: "0.5rem"}} class="hero-subtitle">
              | Battleships modelled in Minecraft purely from historical reference images
            </span>
          </h1>

          <p class="hero-lede">
            Models have garnered over <b>6,000 views</b> and nearly <b>700 downloads</b>.
          </p>
          <p class="hero-small">
            <b>Schematic files</b> provided in .schem and .stl
          </p>
        </div>
        <a class="hero-cta" href="#" target="_blank" rel="noopener">
          GO: MY PLANET MINECRAFT PAGE
        </a>
      </div>
      <AnyFader
        interval={[5000, 5000, 3500]}
        items={_items}
      />
    </div>
  );
}