import React from "react";
import useScrollThresholdFade from "./tools/useScrollThresholdFade";

export default function Navbar() {
  const nav_opacity = useScrollThresholdFade(10, Infinity, 300);
  return (
    <nav className="navbar">
      <div className="navbar-styles" style={nav_opacity}>
        <img
          src="src/assets/calligraphy_logo.png"
          alt="MySite Logo"
          style={{
            height: "100%",
            width: "auto",
            // borderRadius: "0px"
          }}
        />
      </div>
    </nav>
  );
}
