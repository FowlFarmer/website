import React from 'react';
import { Link } from "react-router-dom";

import ScrollBackground from './jias-react-components/tools/ScrollBackground.jsx';

import Test from './cards/test.jsx';

import ROSS from './cards/ross.jsx';
import LabCard from './cards/lab.jsx';
import GuardianAngel from './cards/ga.jsx';
import ImaginecraftCard from './cards/imaginecraft.jsx';
import Gerb2Card from './cards/gerb2.jsx';
import SmallProjectsCard from './cards/smallProjects.jsx';

import HorizontalCycleBar from './jias-react-components/tools/itemscycle.jsx';
import useScrollFade from './jias-react-components/tools/useScrollFadeBackground.jsx';
import useScrollThresholdFade from './jias-react-components/tools/useScrollThresholdFade.jsx';
import TextFader from './jias-react-components/tools/TextFader.jsx';

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
            <a href="https://devpost.com/software/scriptshield" rel="noopener noreferrer" target="_blank">
              <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hack_logo_prescriptify.png' alt="prescriptify" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/time-capsule-qfsd9j" rel="noopener noreferrer" target="_blank">
              <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hack_logo_freezeframe.png' alt="freezeframe" />
            </a>
        </div>,
        <div>
            <a href="https://dorahacks.io/buidl/21694" rel="noopener noreferrer" target="_blank">
              <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hack_logo_bugshot.png' alt="bugshot" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/expierly" rel="noopener noreferrer" target="_blank">
              <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hack_logo_preservia.png' alt="preservia" />
            </a>
        </div>,
        <div>
            <a href="https://devpost.com/software/discovervoice" rel="noopener noreferrer" target="_blank">
              <img className="glass-effect" style={{width: "90%", aspectRatio: "16/9", objectFit: "cover", objectPosition: "center"}} src='/hack_logo_shoebill.jpg' alt="shoebill" />
            </a>
        </div>,
      ];
  return (
     <div className="self" style={{width: "100%", justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
       {/* <ScrollBackground
        // className="scrollFadeBg"
        transitionDuration={0.6}
        images={[
          // "/minecraft_bg.webp",
          "/minecraft_bg.webp",
          "/walle_bg.jpeg",
          "/hackathons_bg.jpg",
          "/lab_bg.jpg",
        ]}
        breakpointIds={[
          // "Imaginecraft",
          "Projects",
          "Hackathons",
          "Lab",
        ]}
        /> */}

      {/* <Test /> */}
      <div id="Ross"/>
      <ROSS />
      <div id="Imaginecraft"/>
      <ImaginecraftCard/>
      <div id="Projects"/>
      <Gerb2Card/>
      <SmallProjectsCard/>
      <div id="Hackathons"/>
      <GuardianAngel/>
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
        <p style={{lineHeight: "0", textAlign: "left", fontWeight: "bold"}}>Other Hackathon Projects</p>
        <HorizontalCycleBar
          items={items}
          intervalMs={3000}     // wait 3s between steps
          pauseOnHover={true}
          visibleCount={4}
        />
        </div>
      </div>
      <div id="Lab"/>
      <LabCard/>
      <div
            className="glass-effect"
            style={{
              marginTop: "100px",
              // width: "40%",
              position: "relative",
              // overflow: "hidden",
              textAlign: "center"
            }}
          >
        {/* <p style={{ lineHeight: "0px" }}>There's an older website that contains some deprecated stuff. You can find it <a href="https://portfoliotheodore.weebly.com" target="_blank" rel="noopener noreferrer">here</a>.</p> */}
      </div>
    </div>

  );
}
      