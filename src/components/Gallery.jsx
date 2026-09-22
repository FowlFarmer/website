import React from 'react';

import WaterlooRouletteCard from './cards/waterlooRoulette.jsx';
import ROSS from './cards/ross.jsx';
import LabCard from './cards/lab.jsx';
import GuardianAngel from './cards/ga.jsx';
import MikuUnsubscriberCards from './cards/mikuUnsubscriber.jsx';
import SpectralFrontCard from './cards/spectralfront.jsx';
import ImaginecraftCard from './cards/imaginecraft.jsx';
import Gerb2Card from './cards/gerb2.jsx';
import SmallProjectsCard from './cards/smallProjects.jsx';

/**
 * Gallery component
 *
 * The Gallery is responsible for laying out all of the projects in a
 * responsive grid.  It imports the array of project definitions and
 * maps each one to a ProjectCard component.
 */
export default function Gallery() {
      const items = [
        <div>
            <a href="https://devpost.com/software/scriptshield" rel="noopener noreferrer" target="_blank">
              <img className="media-frame" style={{width: "100%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hackathons/hack_logo_prescriptify.png' alt="prescriptify" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/time-capsule-qfsd9j" rel="noopener noreferrer" target="_blank">
              <img className="media-frame" style={{width: "100%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hackathons/hack_logo_freezeframe.png' alt="freezeframe" />
            </a>
        </div>,
        <div>
            <a href="https://dorahacks.io/buidl/21694" rel="noopener noreferrer" target="_blank">
              <img className="media-frame" style={{width: "100%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hackathons/hack_logo_bugshot.webp' alt="bugshot" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/expierly" rel="noopener noreferrer" target="_blank">
              <img className="media-frame" style={{width: "100%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hackathons/hack_logo_preservia.png' alt="preservia" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/discovervoice" rel="noopener noreferrer" target="_blank">
              <img className="media-frame" style={{width: "100%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hackathons/hack_logo_shoebill.jpg' alt="shoebill" />
            </a>
        </div>,
      ];
  return (
     <div className="self gallery-page" style={{width: "100%", justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
       {/* <ScrollBackground
        // className="scrollFadeBg"
        transitionDuration={0.6}
        images={[
          // "/imaginecraft/minecraft_bg.webp",
          "/imaginecraft/minecraft_bg.webp",
          "/imaginecraft/walle_bg.webp",
          "/hackathons/hackathons_bg.webp",
          "/lab/lab_bg.webp",
        ]}
        breakpointIds={[
          // "Imaginecraft",
          "Projects",
          "Hackathons",
          "Lab",
        ]}
        /> */}

      {/* <Test /> */}
      <WaterlooRouletteCard/>
      <div id="Ross"/>
      <ROSS />
      {/* <CADCard /> */}
      <div id="Projects"/>
      <Gerb2Card/>
      <SmallProjectsCard/>
      <div id="Hackathons"/>
      <GuardianAngel/>
      <MikuUnsubscriberCards/>
      <SpectralFrontCard/>
      <div id="Imaginecraft"/>
      <ImaginecraftCard/>
      <div className="glass-effect" style={{
        marginTop: "40px",
        width: "90%",
        // aspectRatio: "16/10",
        position: "relative",
        overflow: "hidden",
        alignContent: "flex-start",
        textAlign: "center",
        // padding: "20px",
        // boxSizing: "border-box"
      }}>
        <div style={{padding: "20px"}}>
        <p style={{textAlign: "left", fontWeight: "bold"}}>Other Hackathon Projects</p>
        <div className="hackathon-grid">{items.map((item, index) => <div key={index}>{item}</div>)}</div>
        </div>
      </div>
      <div id="Lab"/>
      <LabCard/>
    </div>

  );
}
      
