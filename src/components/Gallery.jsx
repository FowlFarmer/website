import React from 'react';

import WaterlooRouletteCard from './cards/waterlooRoulette.jsx';
import ROSS from './cards/ross.jsx';
import LabCard from './cards/lab.jsx';
import GuardianAngel from './cards/ga.jsx';
import SpectralFrontCard from './cards/spectralfront.jsx';
import Gerb2Card from './cards/gerb2.jsx';
import SmallProjectsCard from './cards/smallProjects.jsx';
import QuestTag from './experience/QuestIcons.jsx';

/**
 * Gallery component
 *
 * The Gallery is responsible for laying out all of the projects in a
 * responsive grid.  It imports the array of project definitions and
 * maps each one to a ProjectCard component.
 */
export default function Gallery() {
      // The other hackathon projects, each thumbnail showing its tagline while hovered.
      const hackathons = [
        { href: "https://devpost.com/software/scriptshield", src: "/hackathons/hack_logo_prescriptify.webp", alt: "prescriptify", tagline: "Easy-to-understand visualization of dangerous drug interactions" },
        { href: "https://devpost.com/software/time-capsule-qfsd9j", src: "/hackathons/hack_logo_freezeframe.webp", alt: "freezeframe", tagline: "Disposable camera / anti-instant-gratification social media" },
        { href: "https://dorahacks.io/buidl/21694", src: "/hackathons/hack_logo_bugshot.webp", alt: "bugshot", tagline: "Autonomous bug-shooting watergun" },
        { href: "https://devpost.com/software/expierly", src: "/hackathons/hack_logo_preservia.webp", alt: "preservia", tagline: "Grocery tracker and receipt classifier to prevent food waste" },
        { href: "https://devpost.com/software/discovervoice", src: "/hackathons/hack_logo_shoebill.jpg", alt: "shoebill", tagline: "Track health metrics through wearables to boost gaming performance" },
      ];
      const items = hackathons.map(({ href, src, alt, tagline }) => (
        <a href={href} rel="noopener noreferrer" target="_blank">
          <figure className="media-frame hack-thumb">
            <img loading="lazy" decoding="async" src={src} alt={alt} />
            <figcaption>{tagline}</figcaption>
          </figure>
        </a>
      ));
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
      <SpectralFrontCard/>
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
        <QuestTag type="world" />
        <p style={{textAlign: "left", fontWeight: "bold", marginTop: 0}}>Other Hackathon Projects</p>
        <div className="hackathon-grid">{items.map((item, index) => <div key={index}>{item}</div>)}</div>
        </div>
      </div>
      <div id="Lab"/>
      <LabCard/>
    </div>

  );
}
      
