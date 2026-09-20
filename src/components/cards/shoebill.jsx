import React from 'react';
import LazyYouTube from '../LazyYouTube.jsx';

export default function Shoebill() {
  return (

      <div className="glass-effect" style={{
        // marginTop: "40px",
        width: "1000px",
        aspectRatio: "16/10",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        overflow: "hidden",
        alignContent: "flex-start",
        textAlign: "center"
      }}>
        <div className="glass-effect" style={{display: "flex", gap: "20px", backgroundColor: "white", height: "50px"}}>
            <img style={{borderRadius: "10px"}} src="/shoebill/shoebill_logo.png" alt="shoebill" />
            <img style={{borderRadius: "10px"}} src="/hackathons/calhacks_logo.png" alt="calhacks" />
            <p>Cal Hacks 10 | University of California, Berkeley</p>
          </div>
        <div style={{ display: "flex", gap: "20px" }}>
        <div className="flex items-start justify-start" style={{ flex: 3, display: "flex-", padding: "20px"}}>
            <div style={{ flex: 1, alignItems: "flex-start"}}>
            <p>Shoebill is a web application that tracks, detects, documents and provides solutions to gaming addiction. Its analytics are able to track your mental stability, mood and emotions while you game through interfacing with Hume AI voice and facial expression categorizer and Zepp smartwatch biometric data.</p>
            <p>Achieved an Honorable Mention by Cal Hacks sponsor Zepp Health</p>
            <p>Built with Python, Django, Mediapipe, OpenCV, Vite, React, MySQL, HTML,  Multithreading, and Hume & Zepp APIs.</p>
            <LazyYouTube videoId="qP-S0vukCM4" title="Shoebill demo" className="media-frame" />
            </div>
        </div>
        <div style={{ flex: 1, padding: "20px", alignContent: "center" }}>
            <img src="/shoebill/shoebill_figma.png"/ >
        </div>
        </div>
      </div>


  );
}