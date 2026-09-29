import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Sends one page view per route change to /api/track, which keeps it in
// MongoDB forever. Visitor id lives in localStorage (returning visitors),
// session id in sessionStorage (one tab visit).
function storedId(storageName, key) {
  try {
    const storage = window[storageName];
    let id = storage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

let firstView = true;

export function usePersistentAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // "/" always redirects to /self, so it would double count.
    if (import.meta.env.DEV || pathname === '/') return;
    const body = JSON.stringify({
      path: pathname,
      query: search,
      // External referrer only counts for the landing page, like Vercel.
      referrer: firstView ? document.referrer : '',
      visitor: storedId('localStorage', 'pa_visitor'),
      session: storedId('sessionStorage', 'pa_session'),
      width: window.innerWidth,
    });
    firstView = false;
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/track', blob)) {
      fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }, [pathname, search]);
}
