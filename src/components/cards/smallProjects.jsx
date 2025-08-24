import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';
import AnyFader from '../tools/AnyFader.jsx';


import InlinePdf from '../tools/pdf.jsx';


export default function SmallProjectsCard() {
//   const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);
  const _items = [


    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{ marginTop: '0px' }}>BreathMentor | Wearable Breathing Monitor</h2>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>
        <div style={{ flex: 0.6, display: 'flex', alignItems: 'stretch' }}>
          <img
            src="/breathmentor_1.png"
            alt="BreathMentor"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px' }}>
          <p style={{ fontWeight: 'bold' }}>Annually, Guillain-Barré Syndrome develops in 150,000 people worldwide and 6,000 Americans. Patients suffer from hardness of breathing, amongst other symptoms.</p>
          <p>This device attempts to aid patients who suffer from this disease by tracking the volumes of each of their breaths, which helps create a more accurate electronic health record and provides a detection method for disease progression. By applying the ideal gas law, the piezoresistivity law, and the linear elasticity law, the device calculates breathing volumes in mols from a piezoresistive stretch sensor.</p>
        </div>
        <div style={{ flex: 0.5, padding: '20px', display: 'flex', alignItems: 'stretch' }}>
          <img
            src="/breathmentor_2.gif"
            alt="BreathMentor_2"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>
    </div>,



    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{ marginTop: '0px' }}>BreathMentor | Design Docs</h2>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
          <InlinePdf src="/breathmentor_doc.pdf" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '0px 10px' }}>
          <img src="/breathmentor_3.png" alt="BreathMentor_3" style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }} />
          <img src="/breathmentor_4.png" alt="BreathMentor_4" style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>
    </div>,

  ]
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        height: "600px",
        position: "relative",
        overflow: "hidden",
        // alignContent: "center",
        // ...dbh_blob_opacity
      }}
    >
      <AnyFader
        interval={4000}
        height={400}
        items={_items}
      />
    </div>
  );
}