import React from 'react';
import useScrollFade from './useScrollFadeBackground.jsx';
import useScrollThresholdFade from './useScrollThresholdFade.jsx';

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(-1, 10, 300);
    const glassStyle = {
        depth: 20,
        segments: 70,
        radius: 20,
        tint: null,
        reflectivity: 0.1,
        thickness: 28,
        dispersion: 2.2,
        roughness: 0.2,
    }
    const aboutme_opacity = useScrollFade({
        fadeInStart: 100,
        fadeInEnd: 400,
        fadeOutStart: 500,
        fadeOutEnd: 800,
    });
    const first_bg_opacity = useScrollThresholdFade(-1, 10, 300);
    const dbh_bg_opacity = useScrollThresholdFade(10, 1300, 300);
    const mc_shipbuilding_bg_opacity = useScrollFade({
        fadeInStart: 600,
        fadeInEnd: 1000,
        fadeOutStart: 1200,
        fadeOutEnd: 1600,
    });
    return (
        <div className="self" style={{justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>


            {/* Backgrounds */}
            <div
                className="scrollFadeBg"
                style={{ backgroundImage: `url(${"src/assets/first_bg.gif"})`, ...first_bg_opacity }}
            />
            <div
                className="scrollFadeBg"
                style={{ backgroundImage: `url(${"src/assets/dbh_bg.jpg"})`, ...dbh_bg_opacity }}
            />
            <div
                className="scrollFadeBg"
                style={{ backgroundImage: `url(${"src/assets/mc_shipbuilding_bg.png"})`, opacity: mc_shipbuilding_bg_opacity }}
            />
            <div className="mainBlob" style={{ ...first_blob_opacity }}>
                <div style={{ justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img style={{filter: "invert(100%)"}} src="src/assets/calligraphy_logo.png" alt="Profile" />
                    <span>Hi, I'm Theodore</span>
                    <p style={{ textAlign: "center" }}>I code, make cool projects, and nerd out about random things.</p>
                    <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Feel free to look at my work</button>
                    <p style={{ textAlign: "center" }}>Or scroll down to have a peek into who I am :) </p>
                </div>
            </div>

            <div className="glass-effect" style={{
                marginTop: "40px",
                width: "90%",
                height: "400px",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1, padding: "20px" }}>
                    <h2>Cover // Detroit: Become Human Opening</h2>
                    <p>Detroit: Become Human is not just a game: it's a peek into what could very well be, and an incredibly touching story.</p>
                    <p>​With the rapid advances of AI, Robotics, and Neural Interfaces, we should take some time to reflect on our creations and what they mean to us. Are they a tool for us - something that can help solve our greatest problems - or are they an evil?</p>
                </div>
                <div style={{ flex: 1, padding: "20px", alignContent: "center" }}>
                    <iframe
                        src="https://www.youtube.com/embed/c0F4bFpVJVI"
                        title="YouTube video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="glass-effect"
                        style={{ width: "100%", aspectRatio: "16/9" }}
                    ></iframe>
                </div>
                </div>
            </div>

        </div>
    );
}