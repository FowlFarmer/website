import React from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-styles">
        <NavLink to="/self" className="navbar-home" aria-label="Theodore Zhu — home">
          <img className="navbar-logo" src="/site/calligraphy_logo.png" alt="" />
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/gallery">projects</NavLink>
          <NavLink to="/contact">contact</NavLink>
          <NavLink to="/avalon">avalon</NavLink>
        </div>
      </div>
    </nav>
  );
}
