import React, { useState } from 'react';

export default function ShipsGalleryCard() {
  const [lightbox, setLightbox] = useState(null);

  const images = [
    '/ships_gallery/ship1.webp',
    '/ships_gallery/ship2.webp',
    '/ships_gallery/ship3.webp',
  ];

  return (
    <div className="glass-effect" style={{ marginTop: '40px', width: '90%', position: 'relative' }}>

      <div style={{ padding: '20px 20px 0px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>Minecraft: Shipbuilding</h2>
          <a href="https://www.planetminecraft.com/member/lumeo/" rel="noopener noreferrer" target="_blank">
            <button className="rounded-button">Planet Minecraft Page</button>
          </a>
        </div>
        <p style={{ margin: '10px 0 0' }}>Battleships modelled in Minecraft purely from historical reference images.</p>
        <p style={{ margin: '4px 0 16px' }}>Models have garnered over <b>8,000 views</b> and nearly <b>1,000 downloads</b>. Schematic files provided in <b>.schem</b> and <b>.stl</b>.</p>
      </div>

      {/* Photo grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', padding: '0 20px 20px' }}>
        {images.map((src, idx) => (
          <div key={idx} style={{ maxWidth: '30%', minWidth: '200px', flex: '1 1 200px' }}>
            <img
              src={src}
              alt={`Ship ${idx + 1}`}
              className="cosplay-item glass-effect"
              style={{ cursor: 'pointer', width: '100%' }}
              onClick={() => setLightbox(src)}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '60vw' }}>
            <button
              onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer', lineHeight: '32px', textAlign: 'center', zIndex: 1001 }}
            >×</button>
            <img
              src={lightbox}
              alt="expanded"
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', objectPosition: 'center', borderRadius: '8px', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
