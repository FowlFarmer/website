import React, { useEffect, useState } from 'react';
import ProjectFader from '../ProjectFader.jsx';

const ships = [
  {
    name: 'IJN Azuma',
    renders: ['/ships_gallery/ship1.webp', '/ships_gallery/ship3.webp', '/ships_gallery/azuma_plans.webp'],
    about: 'A "Super Type A" cruiser the Imperial Japanese Navy planned before and during WWII, meant to lead its night battle force in the "decisive battle" against the US Navy. It was never built, so this one comes from the plans alone.',
  },
  {
    name: 'IJN Tenryū',
    renders: ['/ships_gallery/tenryu.webp', '/ships_gallery/tenryu_2.webp', '/ships_gallery/tenryu_1925.webp'],
    about: 'Lead ship of the two-ship Tenryū class, built to flag destroyer flotillas: somewhere between a light cruiser and a destroyer, inspired by the Royal Navy\'s Arethusa and C-class cruisers.',
  },
  {
    name: 'IJN Mutsuki',
    renders: ['/ships_gallery/mutsuki.webp', '/ships_gallery/mutsuki_2.webp', '/ships_gallery/mutsuki_3.webp', '/ships_gallery/mutsuki_4.webp', '/ships_gallery/mutsuki_5.webp', '/ships_gallery/mutsuki_ref.webp'],
    about: 'Name ship of a class of twelve destroyers from the 1920s. She fought at Wake Island, New Guinea and the Solomons, and was sunk by American bombers in the Battle of the Eastern Solomons.',
  },
  {
    name: 'Z7 Hermann Schoemann',
    renders: ['/ships_gallery/ship2.webp', '/ships_gallery/richard_beitzen.webp'],
    about: 'A Kriegsmarine destroyer from the mid-1930s, plagued by machinery problems for most of her life. She served in the Norwegian Campaign, Operation Sportpalast and the Channel Dash.',
  },
];

const PHOTO_MS = 2500;

// Crossfades through one ship's renders, then its historical reference, while its slide shows.
function ShipPhotos({ name, srcs }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (srcs.length < 2) return undefined;
    const timer = setInterval(() => setShown(i => (i + 1) % srcs.length), PHOTO_MS);
    return () => clearInterval(timer);
  }, [srcs]);
  return (
    <div className="ship-photos">
      {srcs.map((src, i) => (
        <img key={src} src={src} alt={`${name} view ${i + 1}`} aria-hidden={i !== shown} decoding="async" />
      ))}
    </div>
  );
}

export default function ShipsGalleryCard() {
  const items = ships.map((ship, idx) => (
    <div className="ship-slide">
      <ShipPhotos name={ship.name} srcs={ship.renders} />
      <div className="ship-slide-stack">
        {ships.map((s, j) => (
          <div key={s.name} className="ship-slide-info" aria-hidden={j !== idx}>
            <h3>{s.name}</h3>
            <p>{s.about}</p>
          </div>
        ))}
      </div>
    </div>
  ));

  return (
    <div className="glass-effect" style={{ marginTop: '40px', width: '90%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ textAlign: 'left', flex: '1 1 400px' }}>
          <h2 style={{ margin: 0 }}>Minecraft: Shipbuilding</h2>
          <p style={{ margin: '6px 0 0' }}>Warships modelled block by block from historical reference images. Over <b>8,000 views</b> and <b>1,000 downloads</b>.</p>
        </div>
        <a href="https://www.planetminecraft.com/member/lumeo/" rel="noopener noreferrer" target="_blank">
          <button className="rounded-button">Planet Minecraft Page</button>
        </a>
      </div>
      {/* Each ship stays up long enough to show all its renders at least once. */}
      <ProjectFader interval={ships.map(ship => Math.max(7000, ship.renders.length * PHOTO_MS))} items={items} />
    </div>
  );
}
