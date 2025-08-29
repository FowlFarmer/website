import { useEffect, useRef, useState } from "react";

/**
 * Pick only the greatest time unit (e.g., "2 days ago", "4 hours ago").
 */
function formatLargestUnitAgo(then) {
  if (!then) return "just now";
  const t = typeof then === "string" ? new Date(then) : then;
  const now = new Date();
  const diffMs = Math.max(0, now - t);

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mon = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  const fmt = (n, u) => `${n} ${u}${n !== 1 ? "s" : ""} ago`;

  if (yr >= 1) return fmt(yr, "year");
  if (mon >= 1) return fmt(mon, "month");
  if (day >= 1) return fmt(day, "day");
  if (hr >= 1) return fmt(hr, "hour");
  if (min >= 1) return fmt(min, "min");
  return fmt(sec, "sec");
}

/**
 * TelemetryCards
 * Two glass cards in a flexbox:
 *  - Left: Theodore's MacBook Air, battery + last seen
 *  - Right: "Currently Chilling in City"
 */
export default function TelemetryCards({
  endpoint = "/api/macbook",
  pollMs = 20000,
}) {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0); // refresh "ago"
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
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [endpoint, pollMs]);

  // 1s ticker to keep "ago" fresh
  useEffect(() => {
    jitterRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(jitterRef.current);
  }, []);

  const deviceName = "Theodore's MacBook Air";
  const ts = data?.timestamp;
  const ago = formatLargestUnitAgo(ts);

  const battery = data?.battery?.percent;
  console.log("battery", battery);
  const batteryEmoji = battery != null ? (Math.round(battery) > 20 ? "🔋" : "🪫") : "🔋❓";
  const batteryLine =
    battery != null ? `${batteryEmoji} ${Math.round(battery)}%` : `${batteryEmoji} unknown %`;

  const city = data?.location?.city;
  const country = data?.location?.country;
  const chillLine =
    city && country
      ? `Currently chilling in ${city}, ${country}`
      : city
      ? `Currently chilling in ${city}`
      : country
      ? `Currently chilling in ${country}`
      : "Currently chilling somewhere";

  return (
    <div
      style={{
        marginTop: "20px",
        width: "90%",
        display: "flex",
        flexWrap: "wrap",
        gap: "20px",
        justifyContent: "center",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {/* MacBook card */}
      <div className="glass-effect" style={{ flex: "1 1 300px", padding: 16, minWidth: 0, minHeight: 0 }}>
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
            <div style={{ opacity: 0.9 }}>Last seen {ago}</div>
            <div style={{ opacity: 0.8 }}>{batteryLine}</div>
          </div>
        </div>
      </div>

      {/* Chill card */}
  <div className="glass-effect" style={{ flex: "1 1 300px", padding: 16, minWidth: 0, minHeight: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "1.1rem",
            textAlign: "center",
          }}
        >
          {chillLine}
        </div>
      </div>
    </div>
  );
}