import React from "react";
import useScrollThresholdFade from "./jias-react-components/tools/useScrollThresholdFade";
import { Link } from "react-router-dom";
import { HashLink } from 'react-router-hash-link';
import { useLocation } from "react-router-dom";
import { useNavFormation } from "./navFormation.js";
import { setNavFadeShown } from "./navFade.js";

export default function Navbar() {
  const { pathname } = useLocation();
  const scrollFade = useScrollThresholdFade(80, Infinity, 300);
  const formation = useNavFormation();
  const alwaysShown = pathname === "/contact" || pathname === "/quests" || pathname.startsWith("/avalon");
  // The name's petals build the bar, then its items fade in: on the home page, and on the way to
  // the quests while petals launched from home are still landing.
  const formed = formation.managed;
  // Arriving home, the bar takes the home page's shape (bar and items shown only once scrolled
  // past the name) before the page mounts and its petals take over, so the handover is seamless.
  const home = !formed && pathname === "/self";
  const scrolled = scrollFade.opacity === 1;
  const barState = formed ? formation.bar : scrolled;
  const itemsState = formed ? formation.items : scrolled;
  const nav_opacity = formed || home ? undefined : alwaysShown ? { opacity: 1 } : scrollFade;
  const barShown = formed || home ? barState : alwaysShown || scrolled;
  React.useEffect(() => setNavFadeShown(barShown), [barShown]);
  return (
    <nav className="navbar">
      <div
        className="navbar-styles nav-hover-parent"
        style={nav_opacity}
        data-formed={formed || undefined}
        data-bar={formed || home ? (barState ? "shown" : "hidden") : undefined}
        data-items={formed || home ? (itemsState ? "shown" : "hidden") : undefined}
      >
        <div className="" style={{position: "absolute"}}>
        <Link
          to="/self"
          style={{textDecoration: "none", color: "inherit"}}
          onClick={(e) => {
            // Already home: scroll back to the top instead of re-navigating.
            if (pathname === "/self") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img
            className="navbar-logo"
            src="/site/calligraphy_logo.png"
            alt="MySite Logo"
            style={{
              height: "20px",
              borderRadius: "4px",
            }}
          />
          <p className="nav-hover-child navblinker" style={{
              position: "absolute",
              width: "max-content",
              left: "50px",
              fontWeight: "100",
              fontStyle: "italic",
              fontSize: "0.8rem",
            }}>return to home</p>
        </Link>
        </div>
        <div style={{ 
          display: "flex", 
          gap: "40px",
          top: "0",
          alignItems: "center", 
          // fontWeight: "500", 
          justifyContent: "center",
          fontWeight: "300",
          // fontStyle: "italic",
          fontSize: "0.9rem",
          color: "black"
          }}>
          {/* <HashLink className="hover1" to="/self#Begin" style={{ textDecoration: "none", color: "inherit" }}>me</HashLink> */}
          <Link className="hover1" to="/quests" style={{ textDecoration: "none", color: "inherit" }}>quests</Link>
          {/* <HashLink className="hover1" smooth to="/gallery#Hackathons" style={{ textDecoration: "none", color: "inherit" }}>hackathons</HashLink> */}
          {/* <HashLink smooth to="/gallery#Lab" style={{ textDecoration: "none", color: "inherit" }}>other</HashLink> */}
          <HashLink className="hover1" smooth to="/contact" style={{ textDecoration: "none", color: "inherit" }}>contact</HashLink>
        </div>
            </div>
    </nav>
  );
}
