// src/components/Spotify.jsx
import { useEffect, useRef, useState } from "react";

export default function Spotify() {
  const [info, setInfo] = useState({
    loading: true,
    error: null,
    deviceName: null,
    isPlaying: false,
    title: null,
    artists: null,
    image: null,
    progressMs: 0,
    durationMs: 0,
  });

  const lastSync = useRef(Date.now());

  const fetchState = async (signal) => {
    const res = await fetch("/api/spotify", { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "API error");
    setInfo({
      loading: false,
      error: null,
      deviceName: data.device_name || null,
      isPlaying: Boolean(data.is_playing),
      title: data.title || null,
      artists: data.artists || null,
      image: data.image || null,
      progressMs: data.progress_ms || 0,
      durationMs: data.duration_ms || 0,
    });
    lastSync.current = Date.now();
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchState(ctrl.signal).catch((e) =>
      setInfo((s) => ({ ...s, loading: false, error: e.message }))
    );

    // Re-sync every 10s to correct drift / track changes
    const poll = setInterval(() => {
      fetchState(ctrl.signal).catch(() => {});
    }, 10000);

    // Local progress tick every 1s
    const tick = setInterval(() => {
      setInfo((s) => {
        if (!s.isPlaying || !s.durationMs) return s;
        const elapsed = s.progressMs + 1000;
        return { ...s, progressMs: Math.min(elapsed, s.durationMs) };
      });
    }, 1000);

    return () => {
      ctrl.abort();
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  if (info.loading) return <div>Loading Spotify…</div>;
  if (info.error) return <div>Spotify error: {info.error}</div>;

  const pct =
    info.durationMs > 0 ? Math.min(100, (info.progressMs / info.durationMs) * 100) : 0;

  return (
    <div>
      <div>Device: {info.deviceName ?? "—"}</div>
      <div>
        Track: {info.title ?? "—"}
        {info.artists ? ` — ${info.artists}` : ""}
      </div>
      <div>Paused: {info.isPlaying ? "No" : "Yes"}</div>

      {info.image && (
        <div style={{ marginTop: 8 }}>
          <img
            src={info.image}
            alt={info.title || "Artwork"}
            style={{ width: 128, height: 128, objectFit: "cover" }}
          />
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: 12, width: 300, height: 8, background: "#e5e7eb", borderRadius: 9999 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 9999,
            background: "#111827",
            transition: "width 300ms linear",
          }}
        />
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
        {msToClock(info.progressMs)} / {msToClock(info.durationMs)}
      </div>
    </div>
  );
}

function msToClock(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}