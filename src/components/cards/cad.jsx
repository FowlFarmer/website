import React from 'react';
import AnyFader from '../jias-react-components/tools/AnyFader.jsx';

const Slide = ({ images, title, caption }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0px', padding: '20px', alignItems: 'center' }}>
    <div style={{ flex: '0 0 auto', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', maxWidth: '60%' }}>
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={title}
          className="glass-effect"
          style={{ height: '280px', width: 'auto', maxWidth: images.length > 1 ? `calc(50% - 5px)` : '100%', objectFit: 'contain', borderRadius: '8px', flexShrink: 1 }}
        />
      ))}
    </div>
    <div style={{ flex: '1 1 150px', padding: '10px 20px', textAlign: 'left', minWidth: 0 }}>
      <p style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>{title}</p>
      <p style={{ marginTop: '0px' }}>{caption}</p>
    </div>
  </div>
);

const items = [
  <Slide
    images={['/cad/fork1.png', '/cad/fork2.png']}
    title="Ergonomic Fork"
    caption="Somehow my friend and I ended up in a situation with some buldak, a 3d printer and no forks... and hungry bellies. So we did the only logical thing and designed and printed our own forks, using pencils for handles. Don't ask about the microplastics..."
  />,
  <Slide
    images={['/cad/lance1.png', '/cad/lance2.png']}
    title="Cool stick"
    caption="Lance that is wielded by a certain Fate Grand Order character. Looks even more awesomer in person."
  />,
  <Slide
    images={['/cad/wallboard.png']}
    title="Wall-Mounted Board"
    caption="A selection of anime stuff I designed and printed."
  />,
];

export default function CADCard() {
  return (
    <div
      className="glass-effect"
      style={{ marginTop: '40px', width: '90%', alignContent: 'flex-start', textAlign: 'center' }}
    >
      <p style={{ textAlign: 'left', marginTop: '20px', marginLeft: '20px', fontWeight: 'bold' }}>
        CAD Designs
      </p>
      <AnyFader items={items} interval={4000} fadeDuration={0.3} />
    </div>
  );
}
