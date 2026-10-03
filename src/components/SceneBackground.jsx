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
import { downloadProgress, downloadSceneFiles, onDownloadProgress, sceneFileUrls } from './sceneFiles.js';
import { MOBILE_SCENE_QUERY } from './experience/experienceStage.js';
import { preloadKitsuneStills } from './experience/kitsuneStills.js';
import { SHOW_FRAME_METER, tuning } from './frameStats.js';
const STORAGE_KEY = 'scene-low-performance';
// A first load gives the 3D scene a chance, then settles for 3D off rather than keep the loading
// screen up: SPEED_CHECK_MS into its downloads, it measures how fast they're coming, and waits only
// if the rest would be in within FINISH_WITHIN_MS more; and whatever happens, it's 3D off at
// LOAD_CAP_MS from the page starting to load (visible time only). The downloads carry on behind (the 3D switch shows
// their percentage meanwhile), so switching 3D on later only builds. Switching 3D on by hand waits
// however long it takes.
const SPEED_CHECK_MS = 2000;
const FINISH_WITHIN_MS = 6000;
const LOAD_CAP_MS = 10000;
// A timeout that only counts time the page is visible: a background tab gets no frames, so the 3D
// scene can't finish warming up there, and a load left in a background tab shouldn't be cut short
// for it. Returns the cancel.
function visibleTimeout(callback, ms) {
  let left = ms;
  let started = 0;
  let timer = 0;
  const run = () => {
    started = performance.now();
    timer = window.setTimeout(callback, Math.max(0, left));
  };
  const handleVisibility = () => {
    window.clearTimeout(timer);
    if (document.hidden) left -= performance.now() - started;
    else run();
  };
  if (!document.hidden) run();
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

// Devices too weak for the 3D scene to run well start with 3D off (and nothing downloaded): very
// little memory or very few cores. The frame-rate watch catches the rest once it runs.
const lowEndDevice = () => (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2)
  || (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2);

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
    title: '3D scene was slow to download',
    hint: 'still downloading it in the background',
  },
  ready: {
    title: 'the live scene is ready',
    hint: 'turn 3D on any time',
  },
  device: {
    title: 'showing a still scene',
    hint: 'the live one may run slowly here; turn 3D on any time',
  },
};

function PerformanceToggle({ staticMode, onToggle, soundOn, onSoundToggle, notice, noticeVisible, placement, visible, downloadPercent }) {
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
      {downloadPercent !== null
        // The 3D scene still downloading behind: its percentage, not a switch, until it's in.
        ? <span className="scene-download-percent" role="progressbar" aria-label="3D scene downloading" aria-valuenow={downloadPercent} aria-valuemin={0} aria-valuemax={100}>{downloadPercent}%</span>
        : <button
          type="button"
          role="switch"
          aria-checked={!staticMode}
          aria-label="3D background"
          tabIndex={visible ? 0 : -1}
          onClick={onToggle}
        >
          {staticMode ? '3D off' : '3D on'}
        </button>}
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
  // 3D off from the start: the 2D kitsune's stills come in behind the loading screen too, so the
  // quests page never waits on them. (Settling for 3D off later, the loading screen goes as soon
  // as the still backdrop is in; the stills follow.)
  const offFromStart = useRef(staticMode);
  useEffect(() => {
    if (!staticMode) return undefined;
    const image = snapshotRef.current;
    const stills = offFromStart.current ? preloadKitsuneStills({ mobile: window.matchMedia(MOBILE_SCENE_QUERY).matches }) : null;
    const release = () => (stills ? stills.then(() => releaseLoader('scene')) : releaseLoader('scene'));
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
    if ((reason === 'performance' || reason === 'device') && manualOverride.current) return;
    setStaticMode(true);
    setNotice(PERFORMANCE_NOTICES[reason] ?? PERFORMANCE_NOTICES.performance);
  }, []);
  // The first load's verdict (SPEED_CHECK_MS, FINISH_WITHIN_MS, LOAD_CAP_MS above). Settling for 3D
  // off isn't remembered: the next visit tries again.
  const sceneReady = useRef(false);
  const handleSceneReady = useCallback(() => { sceneReady.current = true; }, []);
  const [downloadPercent, setDownloadPercent] = useState(null);
  // The page-start cap, and the low-end check, from the first render.
  // Before the downloads have started (the still not even in yet), settling is just 3D off.
  const settleRef = useRef(() => { if (!sceneReady.current) switchAutomatically('slow'); });
  useEffect(() => {
    if (staticMode) return undefined;
    if (lowEndDevice() && !manualOverride.current) {
      offFromStart.current = true;
      switchAutomatically('device');
      return undefined;
    }
    // From the page starting to load, counting only while it's visible (a page opened in a
    // background tab starts counting when it's first seen).
    return visibleTimeout(() => settleRef.current(), document.hidden ? LOAD_CAP_MS : LOAD_CAP_MS - performance.now());
    // The first load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The 3D scene's files (sceneFiles.js) and code start the moment the still is in: it comes first,
  // so 3D off is there to settle for (sharing the line with a dozen 3D files, the still was what kept
  // a slow first load's loading screen up). The speed check counts from here.
  useEffect(() => {
    if (!stillIn || staticMode || downloadProgress().elapsed) return undefined;
    downloadSceneFiles(sceneFileUrls({
      mobile: window.matchMedia(MOBILE_SCENE_QUERY).matches,
      rider: (SHOW_FRAME_METER && tuning.riderTextures) || '512',
    }));
    import('./CherryBlossomScene.jsx');
    // The 2D kitsune's stills once the 3D files are in, so switching 3D off later finds them there.
    const stopWatching = onDownloadProgress(({ done }) => {
      if (!done) return;
      stopWatching();
      preloadKitsuneStills({ mobile: window.matchMedia(MOBILE_SCENE_QUERY).matches });
    });
    let settled = false;
    const settle = () => {
      if (settled || sceneReady.current) return;
      settled = true;
      switchAutomatically('slow');
      // 3D off is what shows now: its 2D kitsune comes in at once, beside the rest of the 3D files.
      preloadKitsuneStills({ mobile: window.matchMedia(MOBILE_SCENE_QUERY).matches });
      // Downloading on behind: the 3D switch shows how far, then comes back once it's all in.
      if (downloadProgress().done) {
        setNotice(PERFORMANCE_NOTICES.ready);
        return;
      }
      const stop = onDownloadProgress(({ loaded, total, done }) => {
        if (done) {
          stop();
          setDownloadPercent(null);
          setNotice(PERFORMANCE_NOTICES.ready);
          return;
        }
        const percent = Math.floor((loaded / total) * 100);
        setDownloadPercent((shown) => (shown === percent ? shown : percent));
      });
      const { loaded, total } = downloadProgress();
      setDownloadPercent(Math.floor((loaded / total) * 100));
    };
    settleRef.current = settle;
    // The speed over the window's second half: in its first, the line is also carrying the 3D
    // scene's code, which would make the files look slower than they'll come.
    let halfway = 0;
    const mark = window.setTimeout(() => { halfway = downloadProgress().loaded; }, SPEED_CHECK_MS / 2);
    const check = window.setTimeout(() => {
      const { loaded, total, done } = downloadProgress();
      if (done || sceneReady.current) return;
      const speed = (loaded - halfway) / (SPEED_CHECK_MS / 2); // bytes per ms
      if (!speed || (total - loaded) / speed > FINISH_WITHIN_MS) settle();
    }, SPEED_CHECK_MS);
    return () => {
      window.clearTimeout(mark);
      window.clearTimeout(check);
    };
    // Once, when the still is first in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillIn]);
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
      downloadPercent={downloadPercent}
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
      downloadPercent={downloadPercent}
    />
  </>;
}
