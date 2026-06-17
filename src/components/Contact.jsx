import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import InlinePdf from './jias-react-components/tools/pdf.jsx';

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

  // ✅ LinkedIn badge fix
  useEffect(() => {
    // If LinkedIn script not loaded yet
    if (!window.IN) {
      const script = document.createElement("script");
      script.src = "https://platform.linkedin.com/badges/js/profile.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // If script exists already, re-parse badges
      window.IN.parse();
    }
  }, []);

  return (
    <div className="self" style={{width: "90%", justifyContent: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
      {/* <script src="https://platform.linkedin.com/badges/js/profile.js" async defer type="text/javascript"></script> */}
      <div style={{height: "60px"}} />
      <div style={{width: "90%", position: "relative", top: 0, left: 0, right: 0, bottom: 0, display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center", alignItems: "center"}}>
        <div className='' style={{flex: "1 1 400px", maxWidth: "500px", color: "white", display: "flex", flexDirection: "column"}}>
          
          <h2 style={{fontWeight: "100"}}>Contact Me</h2>
          {/* <p>If you have any questions or inquiries, feel free to reach out!</p> */}
    
          <a className="contact-hover-parent" href="https://github.com/FowlFarmer" target="_blank" rel="noopener noreferrer" style={{textDecoration: "none", color: "inherit"}}>
            <div style={{display: "flex", height: "50px", width: "50px", padding: "10px", textAlign: "left", alignItems: "center", marginTop: "22px"}}>
              <img className="contact-logo-child" src="/contact/gh_logo.png" alt="github" style={{maxHeight: "100%", filter: "invert(100%)"}} />
              <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>FowlFarmer</p>
            </div>
          </a>

          <a className="contact-hover-parent" href={`mailto:${email}?subject=${subject}&body=${body}`} style={{textDecoration: "none", color: "inherit"}}>
            <div style={{display: "flex", width: "50px", padding: "10px", textAlign: "left", alignItems: "center"}}>
              <img className="contact-logo-child" src="/contact/gmail_logo.png" alt="gmail" style={{maxHeight: "100%", filter: "invert(100%)"}} />
              <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>mail to: theodorez888@gmail.com</p>
            </div>
          </a>

          <div className="contact-hover-parent" style={{display: "flex", height: "50px", width: "50px", padding: "10px", textAlign: "left", alignItems: "center"}}>
            <img className="contact-logo-child" src="/contact/discord_logo.png" alt="discord" style={{maxHeight: "100%"}} />
            <p className="contact-hover-child" style={{marginLeft: "40px", fontSize: "1.1rem", fontWeight: "100"}}>zhong.li</p>
          </div>

          <div
            style={{marginTop: "-245px", width: "250px", height: "250px", marginLeft: "auto"}}
            className="contact-linkedin-child "
          >
            <a href="https://www.linkedin.com/in/zhutheodore" style={{textDecoration: "none", color: "inherit", width: "250px", height: "100%", zIndex: 1}}>
            <img src="/contact/linkedin_snapshot.png" alt="linkedin" style={{maxHeight: "250px"}} />
            <div style={{marginTop: "-258px"}} class="badge-base LI-profile-badge" data-locale="en_US" data-size="medium" data-theme="dark" data-type="VERTICAL" data-vanity="zhutheodore" data-version="v1"></div>
            </a>
          </div>

          <div style={{height: "40px"}} />
          <div style={{height: "100px"}} />
        </div>

        <div style={{textAlign: "right"}}>
          <a href="/contact/Theodore_Resume.pdf" download="Theodore_Resume.pdf" style={{textDecoration: "none", color: "inherit"}}>
            <img className='resume-download-hover' src="/contact/download-icon.png" alt="Download Icon" style={{height: "25px", left: 0, filter: "invert(100%)"}} />
          </a>
          <a href="/contact/Theodore_Resume.pdf" style={{textDecoration: "none", color: "inherit"}}>
            <div className='resume-hover' style={{flex: "1 1 400px", maxWidth: "500px", aspectRatio: "8.5/11"}}>
              <img src="/contact/Resume.jpg" alt="Resume" style={{ width: "100%", height: "100%" }} />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}