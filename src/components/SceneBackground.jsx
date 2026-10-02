import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

const Scene = lazy(() => import('./CherryBlossomScene.jsx'));
const CursorTrail = lazy(() => import('./SakuraCursorTrail.jsx'));
import InspoPopup from './InspoPopup.jsx';
import StaticKitsune from './experience/StaticKitsune.jsx';
import { onPageScroll, pageScrollY } from './pageScroll.js';
import { MirrorCanvas, useMirrorHosts } from './sceneMirror.jsx';
import { onSoundChange, setSoundOn, soundOn } from './soundSetting.js';
import { SCENE_PROGRESS_WEIGHT, holdLoader, releaseLoader, setStage, showLoader } from '../bootLoader.js';
const STORAGE_KEY = 'scene-low-performance';
// On a first load, how long (ms from the page starting to load) the 3D scene gets to be ready before
// the site settles for 3D off rather than keep the loading screen up. Switching 3D on by hand
// waits however long it takes.
const SLOW_LOAD_MS = 6000;

// A speaker, with sound waves when on, crossed out when off.
function SoundIcon({ on }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6h2.5l3.5-3v10l-3.5-3h-2.5z" fill="currentColor" />
      {on
        ? <><path d="M10.8 5.8a3 3 0 0 1 0 4.4" /><path d="M12.6 4a5.5 5.5 0 0 1 0 8" /></>
        : <><path d="M11 6l3.5 4" /><path d="M14.5 6l-3.5 4" /></>}
    </svg>
  );
}

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
  slow: {
    title: 'the live scene was slow to load',
    hint: 'showing a still one; turn 3D on any time',
  },
};

function PerformanceToggle({ staticMode, onToggle, soundOn, onSoundToggle, notice, noticeVisible, placement, visible }) {
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
        className="scene-sound-toggle"
        role="switch"
        aria-checked={soundOn}
        aria-label="Sound"
        tabIndex={visible ? 0 : -1}
        onClick={onSoundToggle}
      >
        <SoundIcon on={soundOn} />
      </button>
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
  // The loading screen waits for the backdrop: the 3D scene lets go once it's built and drawn
  // (CherryBlossomScene.jsx); with 3D off, the still photo once it's in.
  useState(() => holdLoader('scene', staticMode ? 0.2 : SCENE_PROGRESS_WEIGHT));
  const snapshotRef = useRef(null);
  useEffect(() => {
    if (!staticMode) return undefined;
    const image = snapshotRef.current;
    const release = () => releaseLoader('scene');
    if (!image || image.complete) {
      release();
      return undefined;
    }
    image.addEventListener('load', release);
    image.addEventListener('error', release);
    return () => {
      image.removeEventListener('load', release);
      image.removeEventListener('error', release);
    };
  }, [staticMode]);
  // The still backdrop first, so 3D off is ready to fall back on; the 3D scene starts loading after.
  const [stillIn, setStillIn] = useState(false);
  useEffect(() => {
    const image = snapshotRef.current;
    const done = () => {
      setStillIn(true);
      if (!staticMode) setStage('3D code');
    };
    if (!image || image.complete) {
      done();
      return undefined;
    }
    setStage('backdrop');
    image.addEventListener('load', done);
    image.addEventListener('error', done);
    return () => {
      image.removeEventListener('load', done);
      image.removeEventListener('error', done);
    };
  }, []);
  // With 3D off, the quests page shows the kitsune's stills: loaded on the first visit there.
  const onQuests = pathname === '/quests';
  const [questsVisited, setQuestsVisited] = useState(onQuests);
  useEffect(() => { if (onQuests) setQuestsVisited(true); }, [onQuests]);
  const [notice, setNotice] = useState(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const manualOverride = useRef(initialChoice === 'false');
  const switchAutomatically = useCallback((reason = 'performance') => {
    if (reason === 'performance' && manualOverride.current) return;
    setStaticMode(true);
    setNotice(PERFORMANCE_NOTICES[reason] ?? PERFORMANCE_NOTICES.performance);
  }, []);
  // A first load that runs past SLOW_LOAD_MS settles for 3D off (not remembered: the next visit tries
  // again). What's downloaded by then stays (three.js's file cache), so switching 3D on finishes
  // the rest rather than starting over.
  const sceneReady = useRef(false);
  const handleSceneReady = useCallback(() => { sceneReady.current = true; }, []);
  useEffect(() => {
    if (staticMode) return undefined;
    const timer = window.setTimeout(() => {
      if (!sceneReady.current) switchAutomatically('slow');
    }, Math.max(0, SLOW_LOAD_MS - performance.now()));
    return () => window.clearTimeout(timer);
    // The first load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Switching 3D on builds the scene again: behind the loading screen, up before it renders.
    if (!next) {
      showLoader();
      holdLoader('scene', SCENE_PROGRESS_WEIGHT);
      setStage('3D code');
    }
    setStaticMode(next);
    setNotice(null);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Storage can be unavailable in private browsing. */ }
  }
  const [sound, setSound] = useState(soundOn);
  useEffect(() => onSoundChange(setSound), []);
  const toggleSound = () => setSoundOn(!sound);
  const underNav = navPinned || scrolledPastNav;
  const mirrorHosts = useMirrorHosts();
  // The backdrop's layers again in each masked scrolling area, for its glass to blur (sceneMirror.jsx).
  const mirror = <>
    <div className="scene-snapshot">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet="/images/scene/snapshot-mobile.webp" />
        <img src="/images/scene/snapshot-desktop.webp" alt="" />
      </picture>
    </div>
    {!staticMode && <MirrorCanvas />}
    {staticMode && questsVisited && <StaticKitsune shown={onQuests} mirror />}
    <div className="blossom-atmosphere" />
  </>;
  return <>
    {mirrorHosts.map((host, index) => createPortal(mirror, host, `mirror-${index}`))}
    <div className="scene-snapshot" aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet="/images/scene/snapshot-mobile.webp" />
        <img ref={snapshotRef} src="/images/scene/snapshot-desktop.webp" alt="" fetchPriority="high" />
      </picture>
    </div>
    {!staticMode && <Suspense fallback={null}>
      {stillIn && <Scene onLowPerformance={switchAutomatically} onReady={handleSceneReady} />}
      <CursorTrail />
    </Suspense>}
    {staticMode && questsVisited && <StaticKitsune shown={onQuests} />}
    <InspoPopup />
    <PerformanceToggle
      placement="corner"
      visible={!underNav}
      staticMode={staticMode}
      onToggle={toggle}
      soundOn={sound}
      onSoundToggle={toggleSound}
      notice={notice}
      noticeVisible={noticeVisible}
    />
    <PerformanceToggle
      placement="docked"
      visible={underNav}
      staticMode={staticMode}
      onToggle={toggle}
      soundOn={sound}
      onSoundToggle={toggleSound}
      notice={notice}
      noticeVisible={noticeVisible}
    />
  </>;
}
