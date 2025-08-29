import { useEffect, useRef, useState } from "react";

function formatTime(ms) {
  if (!ms || ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function SpotifyNowPlayingWithBar() {
  const [payload, setPayload] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [baseProgMs, setBaseProgMs] = useState(0);
  const baseTimeRef = useRef(0);
  const rafRef = useRef(null);
  const [renderTick, setRenderTick] = useState(0);

  // poll the API every 5s
  useEffect(() => {
    let stopped = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/spotify");
        const json = await res.json();

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
          baseTimeRef.current = Date.now();
        }
      } catch (e) {
        console.error("Spotify API error:", e);
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // smooth bar animation
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
      const id = setInterval(() => setRenderTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

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

  const leftText = formatTime(displayedProgMs);
  const rightText = formatTime(durationMs);

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "180px",
        width: "90%",
        position: "relative",
        // overflow: "hidden",
        alignContent: "center",
      }}>

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
          <div style={{ display: "flex" }}>

            <div style={{ flex: 1, textAlign: "left" }}>
                {artist} — {track?.name || "Unknown track"}
            </div>
            <div style={{ opacity: 0.8, flex: 1, textAlign: "right" }}>{payload.is_playing ? "play" : "paused"}</div>
          </div>
        </div>
      </div>

      {/* [progress] row */}
      {durationMs > 0 && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: 15,
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            opacity: 0.85,
          }}
        >
          <div style={{ flex: "0 0 auto", textAlign: "left" }}>{leftText}</div>
          <div
          style={{
            position: "relative",
            flex: 1,
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
              transition: "none",
              willChange: "width",
              transform: "translateZ(0)",
            }}
          />
        </div>
          <div style={{ flex: "0 0 auto", textAlign: "right" }}>{rightText}</div>
        </div>
      )}
    </div>
    </div>
  );
}