import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';
import AnyFader from '../tools/AnyFader.jsx';
import HorizontalCycleBar from '../tools/itemscycle.jsx';

import InlinePdf from '../tools/pdf.jsx';


export default function SmallProjectsCard() {
//   const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);
  const _bedmaker_images=[
    <div>
      <img src="/bedmaker_2.png" />
    </div>, 
    <div>
      <img src="/bedmaker_3.png" />
    </div>,
    <div>
      <img src="/bedmaker_4.png" />
    </div>,
    <div>
      <img src="/bedmaker_5.png" />
    </div>
  ]
  const _bedmaker_heights = [200, 200, 200, 200];

  const _items = [

    <div>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{ marginTop: '0px', marginLeft: '10px'  }}>BreathMentor | Wearable Breathing Monitor</h2>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px' }}>
          <p style={{ fontWeight: 'bold', marginTop: "-10px" }}>Annually, Guillain-Barré Syndrome develops in 150,000 people worldwide and 6,000 Americans. Patients suffer from hardness of breathing, amongst other symptoms.</p>
          <p style={{marginTop: "0px"}}>This device attempts to aid patients who suffer from this disease by tracking the volumes of each of their breaths, which helps create a more accurate electronic health record and provides a detection method for disease progression. By applying the ideal gas law, the piezoresistivity law, and the linear elasticity law, the device calculates breathing volumes in mols from a piezoresistive stretch sensor.</p>
          <p style={{marginTop: "10px"}}><strong>OnShape, Blender, C++, C, HAL Library, STM32, CubeIDE, I2C, LCD</strong></p>
        </div>
        <div style={{ flex: 0.4, display: 'flex', alignItems: 'stretch' }}>
          <img
            src="/breathmentor_1.png"
            alt="BreathMentor"
            style={{ width: 'auto', height: '300px', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ flex: 0.4, display: 'flex', alignItems: 'stretch' }}>
          <img
            src="/breathmentor_2.gif"
            alt="BreathMentor_2"
            style={{ width: 'auto', height: '300px', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>
    </div>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', marginTop: "-20px" }}>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>
        <div className="big-zoom" style={{display: 'flex', alignItems: 'stretch' }}>
          <InlinePdf src="/breathmentor_doc.pdf" height={200} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '0px 10px' }}>
          <img src="/breathmentor_3.png" alt="BreathMentor_3" style={{ width: 'auto', height: '200px'}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '0px 10px' }}>
          <img src="/breathmentor_4.png" alt="BreathMentor_4" style={{ width: 'auto', height: '200px'}} />
        </div>
      </div>
    </div>
    </div>,


    <div>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{ marginTop: '0px', marginLeft: '10px' }}>Automatic Bedmaker</h2>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', marginTop: "-10px" }}>
          <p>The idea of this device is simple: it consists of four nodes, one at each corner of a bed. Each node houses a motor that, through gear ratios to increase torque, spins a spool attached to a cord connected to a blanket corner. With the push of a button, the blanket is pulled taut and the bed is made. When finished, the motors reverse, unspooling the cords so you can snuggle up with your blanket in any cozy position you like.</p>
          <p>(Without unspooling, the blanket would remain locked in its tight, organized—but uncomfortable—position during sleep.)</p>
          <p>I faced more challenges than expected while building this. Most notably, I underestimated how little torque stepper motors provide. My preliminary calculations for normal forces and friction assumed ideal conditions. Even though I left margin when selecting motors, the additional force required to pull a blanket with just a small pillow on top proved enough to make the system unreliable, requiring higher gear ratios and voltage input changes.</p>
          <p>​​Built with C++, C, Blender, Prusa, STM32, HAL Library, and Cube IDE.</p>
        </div>
        <div style={{ flex: 0.5}}>
          <img
            src="/bedmaker_loop.gif"
            alt="Bedmaker Gif"
            style={{ width: '100%', height: 'auto', borderRadius: "12px" }}
          />
          <div
          style={{
            height: "200px",
            width: "100%",             // fill width
            display: "flex",
            alignItems: "center",      // vertical center
            justifyContent: "center",  // horizontal center (if you want it centered horizontally too)
            overflow: "hidden",
            borderRadius: "12px",
          }}
        >
          <HorizontalCycleBar
            intervalMs={2500}     // wait 2.5s between steps
            pauseOnHover={false}
            visibleCount={1}
            items={_bedmaker_images}
            style={{ width: "100%" }}  // makes bar stretch across full width
          />
        </div>
        </div>
      </div>
    </div>
    </div>,

   <div>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{ marginTop: '0px', marginLeft: '10px' }}>Small Coursework Projects</h2>
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', marginTop: "-10px" }}>
          <h3>Mo Money</h3>
          <p>A Linked List-based implementation which computes ETF Capital Gains and Losses using Adjusted Cost Base. Utilizes dynamic memory allocation and tested with no memory leaks. Completed with C++ on VScode.</p>
        </div>
        <div style={{ flex: 0.2}}>
          <a
            href="/momoney.zip"
            download
          >
            <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Download</button>
          </a>
        </div>
        </div>

          <hr />

        <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', marginTop: "-10px", textAlign: "right" }}>
            <h3>​Ethereum Health Records: Ethical Analysis Paper</h3>
            <p>The rapid pace of blockchain's maturation as a technology has profound impacts on many non-financial sectors.</p>
            <p>In this paper, I analyzed the specific case of the ethics within Ethereum 's impact on electronic health records.</p>
          </div>
          <div className="zoom" style={{ flex: 0.1}}>
              <InlinePdfViewer pdfUrl="/ethereum_health_records.pdf" />
          </div>
        </div>

                <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'stretch' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', marginTop: "-10px" }}>
            <h3>Geesespotter</h3>
            <p>A Southwestern Ontario spinoff of the classic Minesweeper game, tracking the positions of angry Canadian geese using their droppings. Completed with C++ on VScode.</p>
          </div>
          <div style={{ flex: 0.2}}>
            <a
              href="/geesespotter.zip"
              download
            >
              <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Download</button>
            </a>
          </div>
        </div>

      </div>
    </div>,

  ]
  const _heights = [650, 580, 600];
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        height: "auto",
        position: "relative",
        overflow: "hidden",
        // alignContent: "center",
        // ...dbh_blob_opacity
      }}
    >
      <AnyFader
        interval={[10000, 10000, 7000]}
        height={400}
        items={_items}
        heights={_heights}
      />
    </div>
  );
}