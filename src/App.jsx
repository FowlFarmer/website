import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
// The quests page (its cards, the gallery and the traced region emblems) is its own download: the
// home page fetches it once idle, and a click towards it fetches it at once, while the old page
// fades out.
const loadQuests = () => import('./components/Quests.jsx');
const loadGallery = () => import('./components/Gallery.jsx');
const Quests = lazy(loadQuests);
const Gallery = lazy(loadGallery);
const PAGE_LOADERS = { '/quests': loadQuests };
import Self from './components/Self.jsx';
import Contact from './components/Contact.jsx';
const ExperienceLab = lazy(() => import('./components/ExperienceLab.jsx'));
const RiderShaderLab = lazy(() => import('./components/shaderLab/RiderShaderLab.jsx'));
const KitsuneLab = lazy(() => import('./components/KitsuneLab.jsx'));
const Avalon = lazy(() => import('./components/Avalon.jsx'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard.jsx'));
import SceneBackground from './components/SceneBackground.jsx';
import { experienceStage } from './components/experience/experienceStage.js';

// Dev only: bake the 3D-off kitsune stills (components/experience/bakeKitsuneStills.js).
if (import.meta.env.DEV) {
  window.__bakeKitsuneStills = () => import('./components/experience/bakeKitsuneStills.js').then((bake) => bake.bakeKitsuneStills());
}

import { Analytics } from "@vercel/analytics/react"
import { usePersistentAnalytics } from './persistentAnalytics.js';

// Route changes fade the page out, swap it while it's invisible (back at the top), then fade the
// new page in. One persistent <main> carries the fade, so a page never appears before its fade-in
// starts or blinks as it ends (mounting a fresh animated element per page did both).
const PAGE_FADE_MS = 350;
// Paths that only redirect: there's no page to fade out.
const REDIRECTS = ['/', '/gallery'];

function FadeRoutes() {
  const location = useLocation();
  const [shown, setShown] = useState(location);
  const [leaving, setLeaving] = useState(false);
  const mainRef = useRef(null);

  // The scene behind switches with the address, as the old page starts fading, not once it's gone:
  // the kitsune behind the quests, the Lawson store everywhere else.
  useEffect(() => {
    experienceStage.show = location.pathname === '/quests' ? 'kitsune' : 'lawson';
    PAGE_LOADERS[location.pathname]?.();
  }, [location.pathname]);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 2000));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const task = idle(() => loadQuests(), { timeout: 5000 });
    return () => cancel(task);
  }, []);

  useEffect(() => {
    if (location.pathname === shown.pathname || REDIRECTS.includes(shown.pathname)) {
      // Same page (a hash or search change), or arriving through a redirect: no fade.
      if (location !== shown) setShown(location);
      setLeaving(false);
      return undefined;
    }
    setLeaving(true);
    // Swap once the fade-out has actually finished (a busy frame can start it late), with a
    // timer in case the transition never runs (reduced motion, an already-invisible page).
    const main = mainRef.current;
    let fallback = 0;
    const swap = () => {
      main.removeEventListener('transitionend', onFaded);
      window.clearTimeout(fallback);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setShown(location);
      setLeaving(false);
    };
    const onFaded = (event) => {
      if (event.target === main && event.propertyName === 'opacity') swap();
    };
    main.addEventListener('transitionend', onFaded);
    fallback = window.setTimeout(swap, PAGE_FADE_MS * 3);
    return () => {
      main.removeEventListener('transitionend', onFaded);
      window.clearTimeout(fallback);
    };
  }, [location]);

  return (
    <main
      ref={mainRef}
      className={`main-content${shown.pathname === '/avalon' ? ' main-content--archive' : ''}`}
      style={{ opacity: leaving ? 0 : 1, transition: `opacity ${PAGE_FADE_MS}ms ease-in-out` }}
    >
      <Routes location={shown}>
        <Route path="/" element={<Navigate to="/self" replace />} />
        <Route path="/self" element={<Self />} />
        <Route path="/quests" element={<Suspense fallback={null}><Quests /></Suspense>} />
        {/* The gallery's projects are the World Quests now. */}
        <Route path="/gallery" element={<Navigate to="/quests" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/analytics" element={<Suspense fallback={null}><AnalyticsDashboard /></Suspense>} />
        <Route path="/lab/experience" element={<Suspense fallback={null}><ExperienceLab /></Suspense>} />
        <Route path="/lab/shaders" element={<Suspense fallback={null}><RiderShaderLab /></Suspense>} />
        <Route path="/lab/kitsune" element={<Suspense fallback={null}><KitsuneLab /></Suspense>} />
        <Route path="/avalon" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#060f21' }} />}><Avalon /></Suspense>} />

        <Route path="*" element={<Suspense fallback={null}><Gallery /></Suspense>} />
      </Routes>
    </main>
  );
}

function SiteChrome() {
  const { pathname } = useLocation();
  usePersistentAnalytics();
  if (pathname === '/avalon' || pathname === '/lab/kitsune' || pathname === '/analytics') return null;
  return <><SceneBackground /><div className="blossom-atmosphere" aria-hidden="true" /><NavBar /></>;
}

export default function App() {
  return (
    <Router>
      <div className="app-container" id="popup-root">
        <SiteChrome />
        <FadeRoutes />
      </div>
        <Analytics />
    </Router>
  );
}
