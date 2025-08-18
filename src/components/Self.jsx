import React from 'react';
import useScrollFade from './useScrollFadeBackground.jsx';
import useScrollThresholdFade from './useScrollThresholdFade.jsx';
import LiquidGlass from 'liquid-glass-react'

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(0, 500, 300);
    const aboutme_opacity = useScrollFade({
        fadeInStart: 100,
        fadeInEnd: 400,
        fadeOutStart: 500,
        fadeOutEnd: 800,
    });
    const dbh_bg_opacity = useScrollFade({
        fadeInStart: 100,
        fadeInEnd: 400,
        fadeOutStart: 500,
        fadeOutEnd: 800,
    });
    const mc_shipbuilding_bg_opacity = useScrollFade({
        fadeInStart: 600,
        fadeInEnd: 1000,
        fadeOutStart: 1200,
        fadeOutEnd: 1600,
    });
    return (
        <div className="self">
            <div className="mainBlob" style={first_blob_opacity}>
                <img src="src/assets/calligraphy_logo.png" alt="Calligraphy Logo" />
                    <div>
                        <h2>Hi, I'm Theodore</h2>
                        <p style={{ textAlign: "left" }}>I code, make cool projects, and nerd out about random things.
Feel free to look at my work</p>
                        <button className="rounded-button" onClick={() => console.log('Button clicked!')}>View My Work</button>
                        <p style={{ textAlign: "left" }}>Or scroll down to have a peek into who I am :) </p>
                    </div>
            </div>


            {/* Backgrounds */}
            <div
                className="scrollFadeBg"
                style={{ backgroundImage: `url(${"src/assets/dbh_bg.jpg"})`, opacity: dbh_bg_opacity }}
            />
            <div
                className="scrollFadeBg"
                style={{ backgroundImage: `url(${"src/assets/mc_shipbuilding_bg.png"})`, opacity: mc_shipbuilding_bg_opacity }}
            />



            <LiquidGlass
              displacementScale={64}
  blurAmount={0}
  saturation={0}
  aberrationIntensity={0}
  elasticity={0}
  cornerRadius={30}
  padding="8px 16px"
  onClick={() => console.log('Button clicked!')}>
            <div className="p-6">
                <h2>Your content here</h2>
                <p>This will have the liquid glass effect</p>
            </div>
            </LiquidGlass>
                    <LiquidGlass>
            <div className="p-6">
                <h2>Your content here</h2>
                <p>This will have the liquid glass effect</p>
            </div>
            </LiquidGlass>
                    <LiquidGlass>
            <div className="p-6">
                <h2>Your content here</h2>
                <p>This will have the liquid glass effect</p>
            </div>
            </LiquidGlass>
        </div>
    );
}