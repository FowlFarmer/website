import { i } from "framer-motion/client";
import { useEffect, useRef, useState } from "react";

function formatTime(ms) {
  if (!ms || ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function SpotifyNowPlayingWithBar() {
  const [isMobile, setIsMobile] = useState(
  typeof window !== "undefined" ? window.innerWidth <= 600 : false // SSR safe
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // When the DB / API is down, show a small local preview so the component
  // still renders during development. This mirrors the real payload shape
  // that the rest of the component expects.
  const dummyPayload = {
    device: { name: "Local" },
    is_playing: false,
    item: {
      name: "Local Preview",
      duration_ms: 180000,
      artists: [{ name: "Local Artist" }],
      album: { images: [{ url: "/favicon.png" }] },
      external_urls: { spotify: "#" },
    },
    raw: {},
    progress_ms: 0,
  };

  const effectivePayload = payload || dummyPayload;

  // prefer live state-derived duration/progress when available, otherwise
  // fall back to the dummy item's values so the UI shows realistic numbers
  const effectiveDuration =
    durationMs > 0
      ? durationMs
      : Number(effectivePayload.item?.duration_ms) || 0;
  const effectiveDisplayedProg = Math.min(
    effectiveDuration,
    playing ? baseProgMs + elapsedMs : baseProgMs
  );

  const device = effectivePayload.device?.name || "Unknown device";
  const track = effectivePayload.item;
  const track_link = track?.external_urls?.spotify || null;
  const artist =
    (track?.artists || []).map((a) => a.name).join(", ") || "Unknown artist";
  const image = track?.album?.images?.[0]?.url;
  const progressPct =
    effectiveDuration > 0
      ? Math.min(100, (effectiveDisplayedProg / effectiveDuration) * 100)
      : 0;

  const leftText = formatTime(effectiveDisplayedProg);
  const rightText = formatTime(effectiveDuration);

  return (
    <div
      className="glass-effect-2 hoverparent"
      style={{
        // marginTop: "180px",
        width: "90%",
        position: "relative",
  alignContent: "center",
  minWidth: 0,
  minHeight: 0,
      }}
    >
      <a
        style={{ color: "inherit", textDecoration: "none" }}
        href="https://open.spotify.com/user/31y2s65rjrvh3yamr6sbkzy4pmqe?si=08ec26d5af714d24"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div style={{ position: "relative", padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, minHeight: 0 }}>
            {image && (
              <img
                src={image}
                alt="album art"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            )}
        <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0%", minWidth: 0, minHeight: 0 }}>
              <div style={{ fontWeight: 600 }}>Currently Listening...</div>
              <a href={track_link} style={{ color: "inherit", textDecoration: "none" }}
        target="_blank"
        rel="noopener noreferrer">
                <div className="song-hover">
                  {isMobile ? (
                    <>
                      {artist}
                      <br />
                      {track?.name || "Unknown track"}
                    </>
                  ) : (
                    <>
                      {artist} — {track?.name || "Unknown track"}
                    </>
                  )}
                </div>
              </a>

              {/* progress bar replaces the 1.5rem gap */}
              {effectiveDuration > 0 && !isMobile && (
                <div
                  style={{
                    marginTop: 4,
                    height: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: "0 0 auto", fontSize: 12, opacity: 0.85 }}>
                    {leftText}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      height: 6,
                      borderRadius: 9999,
                      background: "rgba(255,255,255,0.35)",
                      overflow: "hidden",
                      marginInline: 8,
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
                  <div style={{ flex: "0 0 auto", fontSize: 12, opacity: 0.85 }}>
                    {rightText}
                  </div>
                </div>
              )}
            </div>




            
          </div>
          {/* progress bar mobile placement */}
          {effectiveDuration > 0 && isMobile && (
            <>
            <div className="playpause-mobile">
                    {effectivePayload.is_playing ? "> now playing" : "|| paused"}
                  </div>
                <div
                  style={{
                    marginTop: 4,
                    height: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: "0 0 auto", fontSize: 12, opacity: 0.85 }}>
                    {leftText}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      height: 6,
                      borderRadius: 9999,
                      background: "rgba(255,255,255,0.35)",
                      overflow: "hidden",
                      marginInline: 8,
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
                  <div style={{ flex: "0 0 auto", fontSize: 12, opacity: 0.85 }}>
                    {rightText}
                  </div>
                </div>
                </>
              )}

        <div
            className="blinker hoverchild"
            style={{
              position: "absolute",
              top: "25%",
              right: "24px",
              transform: "translateY(-50%)",

              fontWeight: "200",
              fontStyle: "italic",
              fontSize: "0.8rem",
            //   opacity: 0.8,
            //   fontWeight: 500,
            }}
          >
            click to connect with me on Spotify →
          </div>

          {/* floating play/paused label */}
          {isMobile ? null : (
            <div className="playpause">
              {effectivePayload.is_playing ? "> now playing" : "|| paused"}
            </div>
          )}

        </div>
      </a>
    </div>
  );
}