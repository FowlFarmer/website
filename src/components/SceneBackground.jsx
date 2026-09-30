import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Scene = lazy(() => import('./CherryBlossomScene.jsx'));
const CursorTrail = lazy(() => import('./SakuraCursorTrail.jsx'));
import InspoPopup from './InspoPopup.jsx';
import StaticKitsune from './experience/StaticKitsune.jsx';
import { onPageScroll, pageScrollY } from './pageScroll.js';
const STORAGE_KEY = 'scene-low-performance';

function storedPerformanceChoice() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

const PERFORMANCE_NOTICES = {
  performance: {
    title: 'paused the blossoms',
    hint: 'this page was working too hard',
  },
  unavailable: {
    title: 'the live scene could not start',
    hint: 'showing a still one instead',
  },
};

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
        {notice && <>
          <span className="scene-performance-notice-title">{notice.title}</span>
          <span className="scene-performance-notice-hint">{notice.hint}</span>
        </>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!staticMode}
        aria-label="3D background"
        tabIndex={visible ? 0 : -1}
        onClick={onToggle}
      >
        {staticMode ? '3D off' : '3D on'}
      </button>
    </div>
  );
}

export default function SceneBackground() {
  const { pathname } = useLocation();
  const navPinned = pathname === '/contact' || pathname === '/quests' || pathname.startsWith('/avalon');
  const [scrolledPastNav, setScrolledPastNav] = useState(() => pageScrollY() >= 80);
  const initialChoice = storedPerformanceChoice();
  const [staticMode, setStaticMode] = useState(() => {
    if (initialChoice === 'true') return true;
    if (initialChoice === 'false') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  // With 3D off, the quests page shows the kitsune's stills: loaded on the first visit there.
  const onQuests = pathname === '/quests';
  const [questsVisited, setQuestsVisited] = useState(onQuests);
  useEffect(() => { if (onQuests) setQuestsVisited(true); }, [onQuests]);
  const [notice, setNotice] = useState(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const manualOverride = useRef(initialChoice === 'false');
  const switchAutomatically = useCallback((reason = 'performance') => {
    if (reason !== 'unavailable' && manualOverride.current) return;
    setStaticMode(true);
    setNotice(PERFORMANCE_NOTICES[reason] ?? PERFORMANCE_NOTICES.performance);
  }, []);
  useEffect(() => {
    if (navPinned) return undefined;
    const update = () => setScrolledPastNav(pageScrollY() >= 80);
    update();
    return onPageScroll(update);
  }, [navPinned]);
  useEffect(() => {
    if (!notice) return;
    setNoticeVisible(true);
    const fadeTimer = setTimeout(() => setNoticeVisible(false), 7000);
    const clearTimer = setTimeout(() => setNotice(null), 7600);
    return () => { clearTimeout(fadeTimer); clearTimeout(clearTimer); };
  }, [notice]);
  function toggle() {
    const next = !staticMode;
    manualOverride.current = true;
    setStaticMode(next);
    setNotice(null);
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
    {staticMode && questsVisited && <StaticKitsune shown={onQuests} />}
    <InspoPopup />
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
