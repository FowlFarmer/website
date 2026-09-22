import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const Scene = lazy(() => import('./CherryBlossomScene.jsx'));
const CursorTrail = lazy(() => import('./SakuraCursorTrail.jsx'));
const STORAGE_KEY = 'scene-low-performance';

export default function SceneBackground() {
  const [staticMode, setStaticMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [notice, setNotice] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const manualOverride = useRef(false);
  const switchAutomatically = useCallback(() => {
    if (manualOverride.current) return;
    setStaticMode(true);
    setNotice('Low performance detected. 3D switched off — re-enable it anytime.');
  }, []);
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
    <div className="scene-performance-control">
      <span className={`scene-performance-notice${notice && noticeVisible ? ' is-visible' : ''}`} role="status" aria-live="polite">{notice}</span>
      <button type="button" role="switch" aria-checked={staticMode} onClick={toggle} title="Use a still background to save graphics power">
        <span className="scene-performance-indicator" aria-hidden="true" />
        <span>Low performance</span>
      </button>
    </div>
  </>;
}
