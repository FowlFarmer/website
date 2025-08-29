import React from 'react';
import useScrollThresholdFade from './tools/useScrollThresholdFade.jsx';
import ScrollBackground from './tools/ScrollBackground.jsx';
import DBHCard from './cards/dbh.jsx';   
import { Link } from 'react-router-dom';

import CosplayCard from './cards/cosplay.jsx';
import Shipbuilding from './cards/ships.jsx';
import Spotify from './tools/Spotify.jsx';
import Macbook from './tools/Macbook.jsx';
import GitHubProfileCard from './cards/gh.jsx';

// Backgrounds moved to public/ — reference via public path
const bg1 = '/first_bg.gif';
const bg2 = '/dbh_bg.jpg';
const bg3 = '/shrine_bg.jpg';
const bg4 = '/mc_shipbuilding_bg.png';

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(-1, 300, 300);

    return (
        <div className="self" style={{justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>

            {/* <ScrollBackground
                transitionDuration={0.6}
                images={[bg1, bg2, bg3, bg4]}
                breakpointIds={["DetroitBecomeHuman", "Cosplay", "Shipbuilding"]}
            /> */}

            <div className="mainBlob glass-effect" style={{ width: "60%", padding: "20px", marginTop: "100px", ...first_blob_opacity }}>
                <div style={{ justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img style={{filter: "invert(100%)"}} src="/calligraphy_logo.png" alt="Profile" />
                    <span>Hi, I'm Theodore</span>
                    <p style={{ textAlign: "center" }}>I code, make cool projects, and nerd out about random things.</p>
                    <Link to="/gallery">
                        <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Feel free to look at my work</button>
                    </Link>
                    <p style={{ textAlign: "center" }}>Or scroll down to have a peek into who I am :) </p>
                </div>
            </div>
                
            <div id="DetroitBecomeHuman"/>
            {/* Replaced inlined Detroit Become Human card with component */}
            <DBHCard />
            <div className="glass-effect" style={{ width: "90%", marginTop: "40px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center" }}>
            <div style={{height: "20px", width: "100%"}} />
            <div style={{height: "40px", width: "90%", borderColor: "#55da95ff", borderWidth: "2px", borderStyle: "solid", opacity: 0.8, borderRadius: "8px"}} />
            <p style={{color: "white", position: "absolute", top: "25px", left: "50%", transform: "translate(-50%, 0%)"}}>Current Status</p>
            <img src="sus.png" alt="Current Status" style={{position: "absolute", scale: 0.9, height: "60px", top: "24px", left: "30px"}} />
            <div style={{height: "10px", width: "100%"}} />
            <Spotify />
            <Macbook />
            <div style={{height: "20px", width: "100%"}} />
            </div>
            {/* <GitHubProfileCard /> */}
            <div id="Cosplay"/>
            <CosplayCard />
            <div id="Shipbuilding"/>
            {/* <Shipbuilding /> */}
            {/* <div style={{marginTop: "100000px"}} /> */}

        </div>
    );
}