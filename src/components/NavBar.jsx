import React from 'react';
import { Link, NavLink } from 'react-router-dom';

/**
 * Navigation bar component.
 *
 * This component renders a simple header with a site title on the left
 * and navigation links on the right.  The active link is highlighted
 * using NavLink from react‑router‑dom.
 */
export default function NavBar() {
  return (
    <header className="navbar">
      <h1 className="navbar-title">Theodore's Portfolio</h1>
      <nav className="navbar-links">
        <NavLink
          to="/gallery"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Gallery
        </NavLink>
        {/* Additional links can be added here */}
      </nav>
    </header>
  );
}