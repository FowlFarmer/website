import React from 'react';
import projects from '../data/projects.js';
import ProjectCard from './displays/ProjectCard.jsx';
import ScrollBackground from './tools/ScrollBackground.jsx';
import bg1 from '../assets/calhacks_bg.webp';
import bg2 from '../assets/dbh_bg.jpg';
import bg3 from '../assets/mc_shipbuilding_bg.png';
import bg4 from '../assets/office_bg.jpg';

import GuardianAngel from './cards/ga.jsx';
import Shoebill from './cards/shoebill.jsx';

import HorizontalCycleBar from './tools/itemscycle.jsx';
import useScrollFade from './tools/useScrollFadeBackground.jsx';
import useScrollThresholdFade from './tools/useScrollThresholdFade.jsx';
import TextFader from './tools/TextFader.jsx';
import HoverPopupWrapper from './tools/hoverPopup.jsx';


/**
 * Gallery component
 *
 * The Gallery is responsible for laying out all of the projects in a
 * responsive grid.  It imports the array of project definitions and
 * maps each one to a ProjectCard component.
 */
export default function Gallery() {
      const first_blob_opacity = useScrollThresholdFade(-1, 300, 300);
      const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);
      const items = [
        <div>
          <HoverPopupWrapper popupContent={<div><GuardianAngel /></div>}>
            <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='src/assets/hack_logo_prescriptify.png'></img>
          </HoverPopupWrapper>
        </div>,
        <div>
          <HoverPopupWrapper popupContent={<div><GuardianAngel /></div>}>
            <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='src/assets/hack_logo_freezeframe.png'></img>
          </HoverPopupWrapper>
        </div>,
        <div>
          <HoverPopupWrapper popupContent={<div><GuardianAngel /></div>}>
            <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='src/assets/hack_logo_bugshot.png'></img>
          </HoverPopupWrapper>
        </div>,
        <div>
          <HoverPopupWrapper popupContent={<div><GuardianAngel /></div>}>
            <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='src/assets/hack_logo_preservia.png'></img>
          </HoverPopupWrapper>
        </div>,
        <div>
          <HoverPopupWrapper popupContent={<div><Shoebill /></div>}>
            <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='src/assets/hack_logo_shoebill.jpg'></img>
          </HoverPopupWrapper>
        </div>,
      ];
  return (
     <div className="self" style={{width: "100%", justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
       <ScrollBackground
        // className="scrollFadeBg"
        transitionDuration={0.3}
        images={[
          bg4,
          bg2,
          bg3
        ]}
        breakpoints={[300, 800]}
        />

      <GuardianAngel />
      <div className="glass-effect" style={{
        marginTop: "40px",
        width: "87%",
        // aspectRatio: "16/10",
        position: "relative",
        overflow: "hidden",
        alignContent: "flex-start",
        textAlign: "center",
        padding: "20px"
      }}>
        <p style={{lineHeight: "0", textAlign: "left"}}>Other Hackathon Projects</p>
        <HorizontalCycleBar
          items={items}
          intervalMs={3000}     // wait 3s between steps
          pauseOnHover={true}
          visibleCount={4}
        />
      </div>
    </div>

  );
}