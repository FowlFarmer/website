import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';

export default function CosplayCard() {
    const images = [ // 1 - 12
        "/cosplay_1.jpg",
        "/cosplay_2.jpg",
        "/cosplay_3.jpg",
        "/cosplay_4.jpg",
        "/cosplay_5.jpg",
        "/cosplay_6.jpg",
        "/cosplay_7.jpg",
        "/cosplay_8.jpg",
        "/cosplay_9.jpg",
        "/cosplay_10.jpg",
        "/cosplay_11.jpg",
        "/cosplay_12.jpg",
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
      <div style={{ display: "flex", flexWrap: "wrap", width: "80%", gap: "20px", alignContent: "flex-start",
        justifyContent: "center", }}>
        <div className="flex items-start justify-start" style={{ textAlign: "right", flex: "1 1 100px", padding: "20px" }}>
            <h2>Cosplay Gallery</h2>
        </div>
        <div className="flex items-start justify-start" style={{ textAlign: "left", flex: "1 1 100px", padding: "20px" }}>
            <p>tl/dr: big anime/manga fan, went to some cons, and found out cosplay is super fun.</p>
        </div>
        </div>

        
        <div style={{display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", padding: "20px"}}>
        {images.map((src, idx) => (
            <div style={{ maxWidth: "30%", minWidth: "200px" }}>
            <img
            key={idx}
            src={src}
            alt={`Image ${idx}`}
            className="cosplay-item glass-effect"
            />
            </div>
        ))}
        </div>


    </div>
  );
}