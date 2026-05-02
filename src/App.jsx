import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NavBar from './components/NavBar.jsx';
import Gallery from './components/Gallery.jsx';
import Self from './components/Self.jsx';
import Contact from './components/Contact.jsx';
import Avalon from './components/Avalon.jsx';
import AvalonPost from './components/AvalonPost.jsx';

import { Analytics } from "@vercel/analytics/react"

// A wrapper that applies fade-out (exit) then fade-in (enter) on route changes
function FadeRoutes() {
  const location = useLocation();

  // Optional: scroll to top on route change to avoid mid-page fades
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* Key by pathname so old page can animate out before unmount */}
      <motion.main
        key={location.pathname}
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}       // fade-out on leave
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/self" replace />} />
          <Route path="/self" element={<Self />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/avalon" element={<Avalon />} />
          <Route path="/avalon/:slug" element={<AvalonPost />} />

          <Route path="*" element={<Gallery />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <div className="app-container" id="popup-root">
        <FadeRoutes />
        <NavBar />
      </div>
        <Analytics />
    </Router>
  );
}