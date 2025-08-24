import React from "react";
import useScrollThresholdFade from "./tools/useScrollThresholdFade";
import { Link } from "react-router-dom";


export default function Navbar() {
  const nav_opacity = useScrollThresholdFade(10, Infinity, 300);
  return (
    <nav className="navbar">
      <div className="navbar-styles" style={nav_opacity}>
        <Link to="/self">
          <img
            className="navbar-logo"
            src="/calligraphy_logo.png"
            alt="MySite Logo"
            style={{
              height: "100%",
              borderRadius: "4px",
            }}
          />
        </Link>
      </div>
    </nav>
  );
}
