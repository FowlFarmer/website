import React, { useState } from 'react';
import useScrollThresholdFade from '../jias-react-components/tools/useScrollThresholdFade.jsx';
import TextFader from '../jias-react-components/tools/TextFader.jsx';

export default function CosplayCard() {
    const [lightbox, setLightbox] = useState(null);

    const images = [ // 1 - 12
      "/cad/lance1.png",
      "/cad/lance2.png",
      "/cad/wallboard.png",
      "/cosplay/cosplay_1.jpg",
      "/cosplay/cosplay_2.jpg",
      "/cosplay/cosplay_3.jpg",
      "/cosplay/cosplay_4.jpg",
      "/cosplay/cosplay_5.jpg",
      "/cosplay/cosplay_6.jpg",
      "/cosplay/cosplay_7.jpg",
      "/cosplay/cosplay_8.jpg",
      "/cosplay/cosplay_9.jpg",
      "/cosplay/cosplay_10.jpg",
      "/cosplay/cosplay_11.jpg",
      "/cosplay/cosplay_12.jpg",
      "/cosplay/scissors.png",
    ];
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        // height: "400px",
        position: "relative",
        // overflow: "hidden",
        
      }}
    >
      {/* <div style={{ display: "flex", flexWrap: "wrap", width: "80%", gap: "20px", alignContent: "flex-start", */}
        {/* justifyContent: "center", }}> */}
        <div className="flex items-start justify-start" style={{ textAlign: "center", flex: "1 1 100px"}}>
            <h2>Cosplay Gallery</h2>
        </div>
        <div className="flex items-start justify-start" style={{ textAlign: "center", flex: "1 1 100px", margin: "0px 10px"}}>
            <p>tl/dr: big anime/manga fan, went to some cons, and found out cosplay is super fun.</p>
            <p>I also enjoy modelling, 3D printing and crafting my own cosplay props.</p>
        </div>
        {/* </div> */}

        
        <div style={{display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", padding: "20px"}}>
        {images.map((src, idx) => (
            <div key={idx} style={{ maxWidth: "30%", minWidth: "200px" }}>
            <img
            src={src}
            alt={`Image ${idx}`}
            className="cosplay-item glass-effect"
            style={{ cursor: "pointer" }}
            onClick={() => setLightbox(src)}
            />
            </div>
        ))}
        </div>

        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: "relative", width: "60vw" }}
            >
              <button
                onClick={() => setLightbox(null)}
                style={{
                  position: "absolute", top: "8px", right: "8px",
                  background: "rgba(0,0,0,0.6)", border: "none", color: "white",
                  borderRadius: "50%", width: "32px", height: "32px",
                  fontSize: "18px", cursor: "pointer", lineHeight: "32px", textAlign: "center",
                  zIndex: 1001,
                }}
              >×</button>
              <img
                src={lightbox}
                alt="expanded"
                style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", objectPosition: "center", borderRadius: "8px", display: "block" }}
              />
            </div>
          </div>
        )}


    </div>
  );
}