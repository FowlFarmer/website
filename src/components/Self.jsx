import React from 'react';
import useScrollFade from './useScrollFadeBackground.jsx';
import useScrollThresholdFade from './useScrollThresholdFade.jsx';
import TextFader from './TextFader.jsx';

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(-1, 300, 300);
    const dbh_blob_opacity = useScrollThresholdFade(200, 800, 300);

    // const aboutme_opacity = useScrollFade({
    //     fadeInStart: 100,
    //     fadeInEnd: 400,
    //     fadeOutStart: 500,
    //     fadeOutEnd: 800,
    // });
    const first_bg_opacity = useScrollFade({
        fadeInStart: -1,
        fadeInEnd: -1,
        fadeOutStart: 200,
        fadeOutEnd: 400,
    });
    const dbh_bg_opacity = useScrollFade({
        fadeInStart: 250,
        fadeInEnd: 450,
        fadeOutStart: 800,
        fadeOutEnd: 900,
    });
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
                style={{ backgroundImage: `url(${"src/assets/mc_shipbuilding_bg.png"})`, ...mc_shipbuilding_bg_opacity }}
            />
            <div className="mainBlob glass-effect" style={{ width: "60%", padding: "20px", marginTop: "200px", ...first_blob_opacity }}>
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
                overflow: "hidden",
                alignContent: "center",
                ...dbh_blob_opacity
            }}>
                <div style={{ display: "flex", gap: "20px" }}>
                <div className="flex items-start justify-start" style={{ flex: 1, display: "flex-", padding: "20px"}}>
                    <div style={{ flex: 1, alignItems: "flex-start"}}>
                    <h2>Cover // Detroit: Become Human Opening Theme</h2>
                    <TextFader
                    texts={["Detroit: Become Human is not just a game: it's an incredibly touching story that offers a peek into a potential future world where Artificial Intelligence could be considered a new form of life.", "​With the rapid advances of AI, Robotics, and Neural Interfaces, we should take some time to reflect on our creations and what they mean to us. Are they a tool for us - something that can help improve our lives - or are they an evil?"]}
                    interval={6000}
                    fadeDuration={0.3}
                    height={"150px"}
                    />
                    </div>
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

            <div style={{marginTop: "100000px"}} />

        </div>
    );
}