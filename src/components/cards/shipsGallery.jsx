import React from 'react';
import ProjectFader from '../ProjectFader.jsx';

const ships = [
  {
    name: 'IJN Azuma',
    kind: 'Design B-65 super cruiser',
    render: '/ships_gallery/ship1.webp',
    about: 'A "Super Type A" cruiser the Imperial Japanese Navy planned before and during WWII, meant to lead its night battle force in the "decisive battle" against the US Navy. It was never built, so this one comes from the plans alone.',
    reference: '/ships_gallery/azuma_plans.webp',
    caption: 'The historical design plans (Shipbucket)',
  },
  {
    name: 'IJN Tenryū',
    kind: 'Light cruiser · "Heavenly Dragon"',
    render: '/ships_gallery/tenryu.webp',
    about: 'Lead ship of the two-ship Tenryū class, built to flag destroyer flotillas: somewhere between a light cruiser and a destroyer, inspired by the Royal Navy\'s Arethusa and C-class cruisers.',
    reference: '/ships_gallery/tenryu_1925.webp',
    caption: 'Tenryū in Yokosuka, 1925',
  },
  {
    name: 'IJN Mutsuki',
    kind: 'Destroyer · "January"',
    render: '/ships_gallery/mutsuki.webp',
    about: 'Name ship of a class of twelve destroyers from the 1920s. She fought at Wake Island, New Guinea and the Solomons, and was sunk by American bombers in the Battle of the Eastern Solomons.',
    reference: '/ships_gallery/mutsuki_ref.webp',
    caption: 'Mutsuki, historical reference',
  },
  {
    name: 'Z7 Hermann Schoemann',
    kind: 'Type 1934A destroyer',
    render: '/ships_gallery/ship2.webp',
    about: 'A Kriegsmarine destroyer from the mid-1930s, plagued by machinery problems for most of her life. She served in the Norwegian Campaign, Operation Sportpalast and the Channel Dash.',
    reference: '/ships_gallery/richard_beitzen.webp',
    caption: 'Sister ship Z4 Richard Beitzen (Bundesarchiv)',
  },
];

export default function ShipsGalleryCard() {
  const items = ships.map((ship, idx) => (
    <div className="ship-slide">
      <img src={ship.render} alt={`${ship.name} built in Minecraft`} loading="lazy" decoding="async" />
      <div className="ship-slide-stack">
        {ships.map((s, j) => (
          <div key={s.name} className="ship-slide-info" aria-hidden={j !== idx}>
            <h3>{s.name}</h3>
            <small>{s.kind}</small>
            <p>{s.about}</p>
            <figure>
              <img src={s.reference} alt={s.caption} loading="lazy" decoding="async" />
              <figcaption>{s.caption}</figcaption>
            </figure>
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
      <ProjectFader interval={7000} items={items} />
    </div>
  );
}
