import React from 'react';
import { Link } from "react-router-dom";

import InlinePdf from './tools/pdf.jsx';

/**
 * Gallery component
 *
 * The Gallery is responsible for laying out all of the projects in a
 * responsive grid.  It imports the array of project definitions and
 * maps each one to a ProjectCard component.
 */
export default function Contact() {
  const email = "theodorez888@gmail.com";
  const subject = encodeURIComponent("Hey Theodore!");
  const body = encodeURIComponent("Loved your project! quick question…");

  return (
    <div className="self" style={{width: "90%", justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
      <script src="https://platform.linkedin.com/badges/js/profile.js" async defer type="text/javascript"></script>
      <div style={{height: "60px"}} />
      <div style={{width: "90%", position: "relative", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center"}}>
        <div style={{flex: "1 1 400px", maxWidth: "500px", color: "white"}}>
          
          <h2 style={{fontWeight: "100"}}>Contact Me</h2>
          {/* <p>If you have any questions or inquiries, feel free to reach out!</p> */}
          <a href="https://www.linkedin.com/in/zhutheodore" target="_blank" rel="noopener noreferrer" style={{textDecoration: "none", color: "inherit"}}>
            <div className="contact-hover-parent" style={{display: "flex", height: "50px", width: "50px", padding: "10px", textAlign: "left", alignItems: "center"}}>
              <img src="/linkedin_logo.png" alt="linkedin" style={{maxHeight: "100%", filter: "invert(100%)"}} />
              {/* <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>zhutheodore</p> */}
              <div style={{marginTop: "200px", marginLeft: "30px"}} class="contact-hover-child badge-base LI-profile-badge" data-locale="en_US" data-size="medium" data-theme="dark" data-type="VERTICAL" data-vanity="zhutheodore" data-version="v1"><a class="badge-base__link LI-simple-link" href="https://www.linkedin.com/in/zhutheodore?trk=profile-badge"></a></div>
            </div>
          </a>
          <a href="https://github.com/FowlFarmer" target="_blank" rel="noopener noreferrer" style={{textDecoration: "none", color: "inherit"}}>
            <div className="contact-hover-parent" style={{display: "flex", height: "50px", width: "50px", padding: "10px", textAlign: "left", alignItems: "center", marginTop: "22px"}}>
              <img src="/gh_logo.png" alt="github" style={{maxHeight: "100%", filter: "invert(100%)"}} />
              <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>FowlFarmer</p>
            </div>
          </a>

          <a href={`mailto:${email}?subject=${subject}&body=${body}`} style={{textDecoration: "none", color: "inherit"}}>
            <div className="contact-hover-parent" style={{display: "flex", width: "50px", padding: "10px", textAlign: "left", alignItems: "center"}}>
              <img src="/gmail_logo.png" alt="gmail" style={{maxHeight: "100%", filter: "invert(100%)"}} />
              <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>mail to: theodorez888@gmail.com</p>
            </div>
          </a>
            <div className="contact-hover-parent" style={{display: "flex", height: "50px", width: "50px", padding: "10px", textAlign: "left", alignItems: "center"}}>
              <img src="/discord_logo.png" alt="discord" style={{maxHeight: "100%"}} />
              <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>zhong.li</p>
            </div>
        <div style={{height: "100px"}} />
        </div>
        <div style={{flex: "1 1 400px", maxWidth: "500px"}}>
          <InlinePdf src="/Resume.pdf" height={647.06} /> {/* 8.5:11 */}
          
        </div>
      </div>
    </div>
  );
}
      