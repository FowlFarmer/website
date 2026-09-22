import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Scene = lazy(() => import('./CherryBlossomScene.jsx'));
const CursorTrail = lazy(() => import('./SakuraCursorTrail.jsx'));
const STORAGE_KEY = 'scene-low-performance';

function PerformanceToggle({ staticMode, onToggle, notice, noticeVisible, placement, visible }) {
  return (
    <div
      className={`scene-performance-control scene-performance-control--${placement}${visible ? '' : ' is-hidden'}`}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <span
        className={`scene-performance-notice${notice && noticeVisible ? ' is-visible' : ''}`}
        role="status"
        aria-live={visible ? 'polite' : 'off'}
      >
        {notice}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={staticMode}
        aria-label={staticMode ? 'Switch to the live 3D scene' : 'Use a still scene to save graphics power'}
        tabIndex={visible ? 0 : -1}
        onClick={onToggle}
      >
        <span className="scene-performance-mark" aria-hidden="true" />
        <span className="scene-performance-copy">
          <span className="scene-performance-kicker">scene</span>
          <span className="scene-performance-state">{staticMode ? 'still' : 'live'}</span>
        </span>
      </button>
    </div>
  );
}

export default function SceneBackground() {
  const { pathname } = useLocation();
  const navPinned = pathname === '/contact' || pathname === '/gallery' || pathname.startsWith('/avalon');
  const [scrolledPastNav, setScrolledPastNav] = useState(() => window.scrollY >= 80);
  const [staticMode, setStaticMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [notice, setNotice] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const manualOverride = useRef(false);
  const switchAutomatically = useCallback(() => {
    if (manualOverride.current) return;
    setStaticMode(true);
    setNotice('Switched to a still scene. You can turn the 3D back on anytime.');
  }, []);
  useEffect(() => {
    if (navPinned) return undefined;
    const update = () => setScrolledPastNav(window.scrollY >= 80);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [navPinned]);
  useEffect(() => {
    if (!notice) return;
    setNoticeVisible(true);
    const fadeTimer = setTimeout(() => setNoticeVisible(false), 5500);
    const clearTimer = setTimeout(() => setNotice(''), 6100);
    return () => { clearTimeout(fadeTimer); clearTimeout(clearTimer); };
  }, [notice]);
  function toggle() {
    const next = !staticMode;
    manualOverride.current = true;
    setStaticMode(next);
    setNotice('');
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Storage can be unavailable in private browsing. */ }
  }
  const underNav = navPinned || scrolledPastNav;
  return <>
    <div className="scene-snapshot" aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet="/images/scene/snapshot-mobile.webp" />
        <img src="/images/scene/snapshot-desktop.webp" alt="" fetchPriority="high" />
      </picture>
    </div>
    {!staticMode && <Suspense fallback={null}>
      <Scene onLowPerformance={switchAutomatically} />
      <CursorTrail />
    </Suspense>}
    <PerformanceToggle
      placement="corner"
      visible={!underNav}
      staticMode={staticMode}
      onToggle={toggle}
      notice={notice}
      noticeVisible={noticeVisible}
    />
    <PerformanceToggle
      placement="docked"
      visible={underNav}
      staticMode={staticMode}
      onToggle={toggle}
      notice={notice}
      noticeVisible={noticeVisible}
    />
  </>;
}
