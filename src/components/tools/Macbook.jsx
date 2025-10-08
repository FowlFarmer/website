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

/** Resolve IANA timezone from lat/lon using tz-lookup (loaded lazily). */
async function latLonToIana(lat, lon) {
  try {
    const mod = await import("tz-lookup");
    const tzlookup = mod.default || mod;
    return tzlookup(lat, lon); // e.g., "America/Toronto"
  } catch (e) {
    console.warn("tz-lookup not available, falling back to UTC:", e);
    return "UTC"; // graceful fallback
  }
}

/** Format a nice time string in a given IANA zone. */
function formatTimeInZone(date, zone, withSeconds = true) {
  const opts = {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  };
  return new Intl.DateTimeFormat("en-CA", opts).format(date);
}

/** Get a readable short zone label like "EDT" or "GMT-4" (best-effort). */
function formatZoneAbbrev(zone) {
  try {
    // Try short name (e.g., "EDT") or fallback to offset (e.g., "GMT-4")
    const s = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const part = s.find(p => p.type === "timeZoneName")?.value;
    return part || zone;
  } catch {
    return zone;
  }
}

/**
 * TelemetryCards
 * Two glass cards in a flexbox:
 *  - Left: Theodore's MacBook Air, battery + last seen
 *  - Right: "Currently Chilling in City" + Local Time (from lat/lon)
 */
export default function TelemetryCards({
  endpoint = "/api/macbook",
  pollMs = 20000,
}) {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0); // refresh "ago"/clock each second
  const [zone, setZone] = useState("UTC");
  const [zoneAbbrev, setZoneAbbrev] = useState("UTC");
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

  // 1s ticker to keep "ago" and clock fresh
  useEffect(() => {
    jitterRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(jitterRef.current);
  }, []);

  // Resolve timezone whenever coords change
  const lat =
    data?.location?.lat ??
    data?.location?.latitude ??
    43.4705;
  const lon =
    data?.location?.lon ??
    data?.location?.lng ??
    data?.location?.longitude ??
    -80.5392;

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (lat == null || lon == null) {
        if (!canceled) {
          setZone("UTC");
          setZoneAbbrev("UTC");
        }
        return;
      }
      const z = await latLonToIana(lat, lon);
      if (!canceled) {
        setZone(z);
        setZoneAbbrev(formatZoneAbbrev(z));
      }
    })();
    return () => { canceled = true; };
  }, [lat, lon]);

  const deviceName = "Theodore's MacBook Air";
  const ts = data?.timestamp;
  const ago = formatLargestUnitAgo(ts);

  const battery = data?.battery_percent;
  const batteryEmoji = battery != null ? (battery > 20 ? "🔋" : "🪫") : "🔋❓";
  const batteryLine =
    battery != null ? `${batteryEmoji} ${battery}%` : `${batteryEmoji} unknown %`;

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

  // Live time for the right card (updates via tick)
  const now = new Date(); // re-evaluated each render due to tick
  const localTime = formatTimeInZone(now, zone, true);

  // Build a friendly subline including zone name and coords
  const coordLine =
    lat != null && lon != null
      ? `(${lat.toFixed(4)}, ${lon.toFixed(4)})`
      : "";

  return (
    <div
      style={{
        marginTop: "20px",
        width: "90.5%", // temp tweak to match other card width
        display: "flex",
        flexWrap: "wrap",
        gap: "20px",
        justifyContent: "center",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {/* MacBook card */}
      <div className="glass-effect-2" style={{ flex: "1 1 220px", padding: 12, minWidth: 0, minHeight: 0 }}>
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

      {/* Chill + Local Time card (replaces the map) */}
      <div className="glass-effect-2" style={{ flex: "1 1 220px", padding: 12, minWidth: 0, minHeight: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "1.1rem",
            textAlign: "left",
            marginBottom: 8,
          }}
        >
          {chillLine} 
        </div>
        <p style={{ lineHeight: "0", marginTop: "14px", fontSize: "1.5rem", fontWeight: "100" }}>{localTime}</p>
        <p style={{ opacity: 0.7, lineHeight: "0", marginTop: "0px" }}>local time</p>
      </div>
    </div>
  );
}