// SmallProjectsCard.jsx
import React from 'react';
import AnyFader from '../jias-react-components/tools/AnyFader.jsx';
import HorizontalCycleBarCentered from '../jias-react-components/tools/itemscycleCentered.jsx';
import InlinePdf from '../jias-react-components/tools/pdf.jsx';

export default function SmallProjectsCard() {
  const _bedmaker_images = [
    <div>
      <img src="/bedmaker_2.png" alt="Bedmaker 2" />
    </div>,
    <div>
      <img src="/bedmaker_3.png" alt="Bedmaker 3" />
    </div>,
    <div>
      <img src="/bedmaker_4.png" alt="Bedmaker 4" />
    </div>,
    <div>
      <img src="/bedmaker_5.png" alt="Bedmaker 5" />
    </div>
  ];

  const _items = [
    // ---- Item 1: BreathMentor
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ marginTop: '0px', marginLeft: '10px' }}>
          BreathMentor | Wearable Breathing Monitor
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: "center" }}>
          <div style={{ flex: "1 1 400px", display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px' }}>
            <p style={{ fontWeight: 'bold', marginTop: "-10px" }}>
              Annually, Guillain-Barré Syndrome develops in 150,000 people worldwide and 6,000 Americans. Patients suffer from hardness of breathing, amongst other symptoms.
            </p>
            <p style={{ marginTop: "0px" }}>
              This device attempts to aid patients who suffer from this disease by tracking the volumes of each of their breaths, which helps create a more accurate electronic health record and provides a detection method for disease progression. By applying the ideal gas law, the piezoresistivity law, and the linear elasticity law, the device calculates breathing volumes in mols from a piezoresistive stretch sensor.
            </p>
            <p style={{ marginTop: "10px" }}>
              <strong>OnShape, Blender, C++, C, HAL Library, STM32, CubeIDE, I2C, LCD</strong>
            </p>
          </div>

          <div style={{ flex: "0.7 0.7 350px", display: 'flex', gap: '10px', alignItems: 'stretch', justifyContent: "center" }}>
            <img
              src="/breathmentor_1.png"
              alt="BreathMentor"
              style={{ width: 'auto', height: '300px', objectFit: 'cover', display: 'block' }}
            />

            <img
              src="/breathmentor_2.gif"
              alt="BreathMentor_2"
              style={{ width: 'auto', height: '300px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: "wrap", padding: '20px', marginTop: "-20px", gap: "10px", justifyContent: "center", alignItems: "center" }}>
          <div className="big-zoom" style={{ display: 'flex', alignItems: 'stretch' }}>
            <InlinePdf src="/breathmentor_doc.pdf" height={200} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '0px 10px' }}>
            <img src="/breathmentor_3.png" alt="BreathMentor_3" style={{ width: 'auto', height: '200px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '0px 10px' }}>
            <img src="/breathmentor_4.png" alt="BreathMentor_4" style={{ width: 'auto', height: '200px' }} />
          </div>
      </div>
    </div>,

    // ---- Item 2: Automatic Bedmaker
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ marginTop: '0px', marginLeft: '10px' }}>Automatic Bedmaker</h2>

        <div style={{ display: 'flex', flexWrap: "wrap", gap: '20px', alignItems: 'stretch', justifyContent: "center" }}>
          <div style={{ flex: "1 1 450px", display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', marginTop: "-10px" }}>
            <p>
              The idea of this device is simple: it consists of four nodes, one at each corner of a bed. Each node houses a motor that, through gear ratios to increase torque, spins a spool attached to a cord connected to a blanket corner. With the push of a button, the blanket is pulled taut and the bed is made. When finished, the motors reverse, unspooling the cords so you can snuggle up with your blanket in any cozy position you like.
            </p>
            <p>
              (Without unspooling, the blanket would remain locked in its tight, organized but uncomfortable position during sleep.)
            </p>
            <p>
              I faced more challenges than expected while building this. Most notably, I underestimated how little torque stepper motors provide. My preliminary calculations for normal forces and friction assumed ideal conditions. Even though I left margin when selecting motors, the additional force required to pull a blanket with just a small pillow on top proved enough to make the system unreliable, requiring higher gear ratios and voltage input changes.
            </p>
            <p>
              <strong>​​Built with C++, C, Blender, Prusa, STM32, HAL Library, and Cube IDE.</strong>
            </p>
          </div>

          <div style={{ flex: "0.5 0.5 200px" }}>
            <img
              src="/bedmaker_loop.gif"
              alt="Bedmaker Gif"
              style={{ width: '100%', height: 'auto', borderRadius: "12px" }}
            />
            <div
              style={{
                height: "200px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: "12px",
              }}
            >
              <HorizontalCycleBarCentered
                intervalMs={2500}
                pauseOnHover={false}
                visibleCount={1}
                items={_bedmaker_images}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,

    // ---- Item 3: Ethereum Paper
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ marginTop: '0px', marginLeft: '10px' }}>
          ​Ethereum Health Records: Ethical Analysis Paper
        </h2>

        <div style={{ display: 'flex', flexWrap: "wrap", gap: '20px', alignItems: 'stretch' }}>
          <div style={{ flex: "1 1 300px", textAlign: "right", alignItems: "center" }}>
            <p>The rapid pace of blockchain's maturation as a technology has profound impacts on many non-financial sectors.</p>
            <p>In this paper, I analyzed the specific case of the ethics within Ethereum 's impact on electronic health records.</p>
          </div>
          <div className="zoom" style={{ flex: "1.2 1.2 450px" }}>
            <InlinePdf src="/ethereum.pdf" />
          </div>
        </div>
      </div>
    </div>,
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
      <AnyFader
        interval={[8000, 8000, 5000]}
        items={_items}
      />
    </div>
  );
}