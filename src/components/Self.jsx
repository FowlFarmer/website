import React from 'react';
import useScrollThresholdFade from './jias-react-components/tools/useScrollThresholdFade.jsx';
import DBHCard from './cards/dbh.jsx';
import { Link } from 'react-router-dom';

import WorkExperienceCard from './cards/workExperience.jsx';
import CosplayCard from './cards/cosplay.jsx';
import Spotify from './jias-react-components/tools/Spotify.jsx';
import Macbook from './jias-react-components/tools/Macbook.jsx';

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(-1, 300, 300);

    return (
        <div className="self blossom-home" style={{justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
            <div id="Begin" />
            <div className="mainBlob glass-effect" style={{ width: "60%", padding: "20px", marginTop: "100px", ...first_blob_opacity }}>
                <div style={{ justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img style={{filter: "invert(100%)"}} src="/site/calligraphy_logo.png" alt="Profile" />
                    <span>Hi, I'm Theodore.</span>
                    <span>I also go by Jia.</span>
                    <p style={{ textAlign: "center" }}>I code, make cool projects, and nerd out about random things.</p>
                    <Link to="/gallery">
                        <button className="rounded-button">Feel free to look at my work</button>
                    </Link>
                    <p style={{ textAlign: "center" }}>Or scroll down to have a peek into who I am :) </p>
                </div>
            </div>
            <div id="DetroitBecomeHuman"/>
            {/* Replaced inlined Detroit Become Human card with component */}
            <DBHCard />
            <div className="status-card glass-effect" style={{ width: "90%", marginTop: "40px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center", position: "relative" }}>
                <div className="status-heading current-status" style={{borderColor: "#55da95ff", borderWidth: "2px", borderStyle: "solid", opacity: 0.8, borderRadius: "8px", width: "100%", marginLeft: "30px", marginRight: "30px", position: "relative", minHeight: "40px"}}>
                    <img src="/macbook/sus.png" alt="" style={{position: "absolute", height: "60px", top: "50%", left: "8px", transform: "translateY(-50%)"}} />
                    <p style={{color: "white", margin: "8px 20px"}}>Current Status</p>
                </div>
                <Spotify />
                <Macbook />
            </div>
            {/* <GitHubProfileCard /> */}
            <div id="WorkExperience" />
            <WorkExperienceCard />
            <div id="Cosplay"/>
            <CosplayCard />
            {/* <ShipsGalleryCard /> */}
            <div id="Shipbuilding"/>
            {/* <Shipbuilding /> */}
            {/* <div style={{marginTop: "100000px"}} /> */}

        </div>
    );
}
