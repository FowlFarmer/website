import React from 'react';
import HorizontalCycleBarCentered from '../tools/itemscycleCentered.jsx';
import TextFader from '../tools/TextFader.jsx';

export default function GuardianAngel() {
  const _images = [
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.1.jpg" alt="Ross 2" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.2.jpg" alt="Ross 3" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.3.jpg" alt="Ross 4" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.4.jpg" alt="Ross 5" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.5.jpg" alt="Ross 6" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.6.jpg" alt="Ross 7" />
    </div>,
    <div className="w-full overflow-hidden rounded-lg">
      <img src="/ross_1.7.jpg" alt="Ross 8" />
    </div>
  ];
  
  return (

      <div className="glass-effect" style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        // overflow: "hidden",
        height: "auto",
        alignContent: "flex-start",
        textAlign: "center"
      }}>
        <p style={{textAlign: "left", marginTop: "20px", marginLeft: "20px", fontWeight: "bold"}}>Featured Hackathon Project</p>
        <div style={{ display: "flex", gap: "0px", marginTop: "-20px", flexWrap: "wrap", }}>
          <div style={{ flex: "1 1 400px", padding: "20px", alignContent: "flex-start", textAlign: "left" }}>
              <img style={{ borderRadius: "0px", marginTop: "25px" }} src="/htn_banner.png" alt="HTN Banner" />
            <p style={{ fontWeight: "bold", textAlign: "center" }}>Hack The North 2025 Finalist Project</p>
            <p style={{ fontWeight: "bold", textAlign: "center" }}>
              By Theodore Zhu, Jonathan Shan, Tian Yao, and Andre Ke
            </p>
            <p style={{ marginTop: "0px" }}>
              Ross reimagines how the visually impaired experience art. By transforming paintings and sketches into tactile
              brush strokes and synchronized audio, Ross enables users to “feel” and “hear” the story behind each artwork.
              A two-axis robot carefully redraws line-based representations onto the palms using brushes that heat or cool
              to convey warm and cool colours, while an AI-driven narration describes every element in real time.
            </p>
            <p>
              Behind the scenes, Ross integrates Meta’s Segment Anything model for semantic segmentation, curve
              simplification for stroke planning, and precise Arduino-controlled robotics. Combining cutting-edge computer
              vision with hardware innovation, we built a system that bridges vision, touch, and sound — empowering the
              blind to access visual art in a multisensory way for the very first time.
            </p>

            {/* Inline sponsor fader (drop-in) */}
            <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", marginTop: "15px", display: "inline-block", textAlign: "center"}}>
              @University of Waterloo | Sponsored by Y Combinator, Shopify, Amazon
            </span>
            <a href="https://devpost.com/software/ross-42pnvi" rel="noopener noreferrer" target="_blank">
              <button className="rounded-button" style={{ textAlign: "center", marginTop: "15px", marginBottom: "15px" }} onClick={() => console.log('Button clicked!')}>
                Find on Devpost
              </button>
            </a>
            </div>
            <HorizontalCycleBarCentered
                            intervalMs={2500}
                            pauseOnHover={false}
                            visibleCount={1}
                            items={_images}
                            style={{ width: "100%" }}
                          />
        </div>

        <div className="flex items-start justify-start" style={{ flex: "1 1 400px", padding: "20px"}}>
              <div style={{ flex: 1, alignItems: "flex-start"}}>
              <img style={{borderRadius: "0px", marginTop: "25px"}} src="/rosskeynote.png" alt="Ross Keynote" />
              <iframe style={{width: "100%", aspectRatio: "16/9"}} src="https://www.youtube.com/embed/FP0lBdZkyqI" title="Ross" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              </div>
          </div>


        </div>
      </div>


  );
}