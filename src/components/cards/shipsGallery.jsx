import React from 'react';
import ProjectSwitcher from '../ProjectSwitcher.jsx';

const ships = [
  '/ships_gallery/ship1.webp',
  '/ships_gallery/ship2.webp',
  '/ships_gallery/ship3.webp',
];

export default function ShipsGalleryCard() {
  // Every slide is the same fixed 16:9 frame, so switching ships never moves the page.
  const items = ships.map((src, idx) => (
    <div style={{ padding: '0 20px 20px' }}>
      <img
        src={src}
        alt={`Minecraft ship ${idx + 1}`}
        loading="lazy"
        decoding="async"
        style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '8px' }}
      />
    </div>
  ));

  return (
    <div className="glass-effect" style={{ marginTop: '40px', width: '90%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Minecraft Ships</h2>
        <a href="https://www.planetminecraft.com/member/lumeo/" rel="noopener noreferrer" target="_blank">
          <button className="rounded-button">Planet Minecraft Page</button>
        </a>
      </div>
      <ProjectSwitcher items={items} labels={ships.map((_, i) => `Ship ${i + 1}`)} />
    </div>
  );
}
