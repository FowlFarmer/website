import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Gallery from './components/Gallery.jsx';
import Self from './components/self.jsx';

// The top‑level application component.  It sets up routing and the
// navigation bar.  Currently there's only a single route for the
// gallery, but additional pages could be added later.
export default function App() {
  return (
    <Router>
      <div className="app-container">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/gallery" replace />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/self" element={<Self />} />
            {/* Placeholder routes for future expansion */}
            <Route path="*" element={<Gallery />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}