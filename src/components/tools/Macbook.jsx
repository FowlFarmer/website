import { useEffect, useRef, useState } from "react";

/**
 * Pick only the greatest time unit (e.g., "2 days ago", "4 hours ago", "7 min ago").
 * Accepts an ISO timestamp string or Date.
 */
function formatLargestUnitAgo(then) {
  if (!then) return "just now";
  const t = typeof then === "string" ? new Date(then) : then;
  const now = new Date();
  const diffMs = Math.max(0, now - t);

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mon = Math.floor(day / 30);     // coarse (ok for display)
  const yr  = Math.floor(day / 365);    // coarse

  const fmt = (n, u) => `${n} ${u}${n !== 1 ? "s" : ""} ago`;

  if (yr  >= 1) return fmt(yr,  "year");
  if (mon >= 1) return fmt(mon, "month");
  if (day >= 1) return fmt(day, "day");
  if (hr  >= 1) return fmt(hr,  "hour");
  if (min >= 1) return fmt(min, "min");
  return fmt(sec, "sec");
}

/**
 * TelemetryCard
 * Fetches latest doc from your telemetry API and shows:
 *  - device name (fixed)
 *  - "Last seen … ago"
 *  - "Chilling in (City) (Country)" on the right
 *
 * Expected API shape (example):
 * {
 *   "timestamp": "2025-08-28T19:20:00-04:00",
 *   "battery": { "percent": 88.0 },
 *   "location": { "city": "Montreal", "country": "CA", "region": "Quebec" }
 * }
 */
export default function Macbook({
  endpoint = "/api/macbook",
  pollMs = 20000, // 20s
}) {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0); // for “ago” live update
  const timerRef = useRef(null);
  const jitterRef = useRef(null);

  // Poll the API
  useEffect(() => {
    let stopped = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!stopped) setData(json);
      } catch (e) {
        console.error("telemetry fetch error:", e);
        if (!stopped) setData(null);
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => { stopped = true; clearInterval(id); };
  }, [endpoint, pollMs]);

  // Light 1s tick to make “ago” text update smoothly
  useEffect(() => {
    jitterRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(jitterRef.current);
  }, []);

  const deviceName = "Theodore's MacBook Air";
  const ts = data?.timestamp;
  const ago = formatLargestUnitAgo(ts);

  // Location line (right side)
  const city = data?.location?.city;
  const country = data?.location?.country;
  const locationRight = city && country
    ? `Chilling in ${city} ${country}`
    : city
      ? `Chilling in ${city}`
      : country
        ? `Chilling in ${country}`
        : "Chilling somewhere";

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "180px",
        width: "90%",
        position: "relative",
        alignContent: "center",
      }}
    >
      <div style={{ position: "relative", padding: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img
            src="/macbook.png"
            alt="device"
            style={{
              width: 72,
              height: 72,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 600 }}>{deviceName}</div>
            <div style={{ opacity: 0.9 }}>
              Last seen {ago}
            </div>
            {/* spacer to preserve layout like your Spotify card */}
            <div style={{ height: "1.5rem" }} />
          </div>
        </div>

        {/* Right-side floating label (where play/pause was) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "24px",
            transform: "translateY(-50%)",
            opacity: 0.85,
            fontWeight: 500,
            textAlign: "right",
            whiteSpace: "nowrap",
            maxWidth: "40ch",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={locationRight}
        >
          {locationRight}
        </div>
      </div>
    </div>
  );
}
