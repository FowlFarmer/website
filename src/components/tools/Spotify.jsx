import { useEffect, useRef, useState } from "react";

export default function SpotifyNowPlayingWithBar() {
  const [payload, setPayload] = useState(null);       // last response from /api/spotify
  const [playing, setPlaying] = useState(false);      // boolean
  const [durationMs, setDurationMs] = useState(0);    // track duration
  const [baseProgMs, setBaseProgMs] = useState(0);    // progress reported by API at last poll
  const baseTimeRef = useRef(0);                      // Date.now() at last poll
  const rafRef = useRef(null);                        // animation loop
  const [renderTick, setRenderTick] = useState(0);    // forces re-render for the smooth bar

  // poll the API every 5s
  useEffect(() => {
    let stopped = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/spotify");
        const json = await res.json();

        // not active
        if (json?.active === false || !json?.raw) {
          if (!stopped) {
            setPayload(null);
            setPlaying(false);
            setDurationMs(0);
            setBaseProgMs(0);
            baseTimeRef.current = Date.now();
          }
          return;
        }

        const item = json.item;
        const dMs = Number(item?.duration_ms) || 0;
        const pMs =
          typeof json.progress_ms === "number"
            ? json.progress_ms
            : Number(json.raw?.progress_ms) || 0;

        if (!stopped) {
          setPayload(json);
          setPlaying(Boolean(json.is_playing));
          setDurationMs(dMs);
          setBaseProgMs(Math.min(pMs, dMs));
          baseTimeRef.current = Date.now(); // ground truth timestamp
        }
      } catch (e) {
        console.error("Spotify API error:", e);
      }
    };

    fetchStatus(); // immediate
    const id = setInterval(fetchStatus, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // smooth bar animation: re-render ~60fps while playing; else every 1s
  useEffect(() => {
    let mounted = true;
    const step = () => {
      if (!mounted) return;
      setRenderTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    };
    if (playing) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      // paused: update once a second just to keep timestamps fresh
      const id = setInterval(() => setRenderTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // compute displayed progress (never exceed duration)
  const elapsedMs = Math.max(0, Date.now() - baseTimeRef.current);
  const displayedProgMs = Math.min(
    durationMs,
    playing ? baseProgMs + elapsedMs : baseProgMs
  );

  if (!payload) {
    return <div>not playing</div>;
  }

  const device = payload.device?.name || "Unknown device";
  const track = payload.item;
  const artist =
    (track?.artists || []).map((a) => a.name).join(", ") || "Unknown artist";
  const image = track?.album?.images?.[0]?.url;
  const progressPct =
    durationMs > 0 ? Math.min(100, (displayedProgMs / durationMs) * 100) : 0;

  // round left text to the nearest second (per your spec)
  const leftMs = Math.min(durationMs, Math.floor(displayedProgMs / 1000) * 1000);
  const rightMs = durationMs || 0;

  return (
    <div style={{ position: "relative", padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {image && (
          <img
            src={image}
            alt="album art"
            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600 }}>{device}</div>
          <div>
            {artist} — {track?.name || "Unknown track"}
          </div>
          <div style={{ opacity: 0.8 }}>{payload.is_playing ? "play" : "paused"}</div>
        </div>
      </div>

      {/* Bottom progress bar (your style, with smooth width) */}
      {durationMs > 0 && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: 15,
            height: 6,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.35)",
            overflow: "hidden",
            marginInline: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 9999,
              transition: "none", // we drive it manually via animation frames
              willChange: "width",
              transform: "translateZ(0)",
            }}
          />
        </div>
      )}

      {/* Counter row: left = current ms (ticks each second), right = total ms */}
      {durationMs > 0 && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: 28, // a bit above the bar
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            opacity: 0.85,
          }}
        >
          <div style={{ flex: 1, textAlign: "left" }}>{leftMs} ms</div>
          <div style={{ flex: 1, textAlign: "right" }}>{rightMs} ms</div>
        </div>
      )}
    </div>
  );
}