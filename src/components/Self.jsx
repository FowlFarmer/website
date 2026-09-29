import React, { useEffect, useState } from 'react';
import useScrollThresholdFade from './jias-react-components/tools/useScrollThresholdFade.jsx';
import DBHCard from './cards/dbh.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { formNav } from './navFormation.js';

import CalligraphyName from './CalligraphyName.jsx';

import CosplayCard from './cards/cosplay.jsx';
import ShipsGalleryCard from './cards/shipsGallery.jsx';
import Spotify from './jias-react-components/tools/Spotify.jsx';
import Macbook from './jias-react-components/tools/Macbook.jsx';

function homePanelsAreVisible() {
    if (typeof window === "undefined") return 0;
    return (window.scrollY || 0) >= 80 ? 1 : 0;
}

export default function Self() {
    const first_blob_opacity = useScrollThresholdFade(-1, 300, 300);
    const [homePanelOpacity, setHomePanelOpacity] = useState(homePanelsAreVisible);
    const navigate = useNavigate();
    // The name flies up into the menu bar (as on scrolling) while the quests open.
    const openQuests = (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        formNav();
        navigate('/quests');
    };

    useEffect(() => {
        const update = () => setHomePanelOpacity(homePanelsAreVisible());
        update();
        window.addEventListener("scroll", update, { passive: true });
        return () => window.removeEventListener("scroll", update);
    }, []);

    return (
        <div className="self blossom-home" style={{justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center", "--home-panel-opacity": homePanelOpacity}}>
            <div id="Begin" />
            <div className="mainBlob glass-effect" style={{ width: "60%", padding: "20px", marginTop: "100px", ...first_blob_opacity }}>
                <div style={{ justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <CalligraphyName />
                    <span>Hi, I'm Theodore.</span>
                    <span>I also go by Jia.</span>
                    <p style={{ textAlign: "center" }}>I code, make cool projects, and nerd out about random things.</p>
                    <Link to="/quests" onClick={openQuests}>
                        <button className="rounded-button">Feel free to look at my work</button>
                    </Link>
                    <p style={{ textAlign: "center" }}>Or scroll down to have a peek into who I am :) </p>
                </div>
            </div>
            <div id="DetroitBecomeHuman"/>
            {/* Replaced inlined Detroit Become Human card with component */}
            <DBHCard />
            <div className="glass-effect" style={{ width: "90%", marginTop: "40px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center" }}>
                <div style={{height: "20px", width: "100%"}} />
                <div className='current-status' style={{height: "40px", marginLeft: "30px", marginRight: "30px", width: "100%", borderColor: "#55da95ff", borderWidth: "2px", borderStyle: "solid", opacity: 0.8, borderRadius: "8px"}}>
                    <p style={{color: "white", margin: "0 20px 0 0", lineHeight: "36px"}}>Current Status</p>
                </div>
                <img src="/macbook/sus.png" alt="" style={{position: "absolute", scale: 0.9, height: "60px", top: "24px", left: "25px"}} />
                <div style={{height: "10px", width: "100%"}} />
                <Spotify />
                <Macbook />
                <div style={{height: "20px", width: "100%"}} />
            </div>
            {/* <GitHubProfileCard /> */}
            <div id="Cosplay"/>
            <CosplayCard />
            <ShipsGalleryCard />
            <div id="Shipbuilding"/>
            {/* <Shipbuilding /> */}
            {/* <div style={{marginTop: "100000px"}} /> */}

        </div>
    );
}
