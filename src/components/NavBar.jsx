import React from "react";
import useScrollThresholdFade from "./tools/useScrollThresholdFade";
import { Link } from "react-router-dom";
import { HashLink } from 'react-router-hash-link';
import { useLocation } from "react-router-dom";

export default function Navbar() {
  let nav_opacity;
  if (useLocation().pathname === "/contact" || useLocation().pathname === "/gallery") {
    nav_opacity = { opacity: 1 };
  } else {
    nav_opacity = useScrollThresholdFade(80, Infinity, 300);
  }
  return (
    <nav className="navbar">
      <div className="navbar-hide-background"></div>
      <div className="navbar-gradient-background"></div>
      <div className="navbar-styles nav-hover-parent" style={nav_opacity}>
        <div className="" style={{position: "absolute"}}>
        <Link to="/self" style={{textDecoration: "none", color: "inherit"}}>
          <img
            className="navbar-logo"
            src="/calligraphy_logo.png"
            alt="MySite Logo"
            style={{
              height: "20px",
              borderRadius: "4px",
            }}
          />
          <p className="nav-hover-child navblinker" style={{
              position: "absolute",
              width: "max-content",
              top: -14,
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
          <HashLink className="hover1" smooth to="/gallery#Ross" style={{ textDecoration: "none", color: "inherit" }}>projects</HashLink>
          <HashLink className="hover1" smooth to="/gallery#Hackathons" style={{ textDecoration: "none", color: "inherit" }}>hackathons</HashLink>
          {/* <HashLink smooth to="/gallery#Lab" style={{ textDecoration: "none", color: "inherit" }}>other</HashLink> */}
          <HashLink className="hover1" smooth to="/contact" style={{ textDecoration: "none", color: "inherit" }}>contact</HashLink>
        </div>
            </div>
    </nav>
  );
}
