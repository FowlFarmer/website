import { useEffect, useState } from "react";

export default function Spotify() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/spotify");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Spotify API error:", e);
      }
    };

    // fetch immediately
    fetchStatus();
    // fetch every 5s
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return <div>not playing</div>;
  }

  // if API says no active session
  if (data.active === false || !data.raw) {
    return <div>not playing</div>;
  }

  const device = data.device?.name || "Unknown device";
  const track = data.item;
  const artist = track?.artists?.map(a => a.name).join(", ") || "Unknown artist";
  const image = track?.album?.images?.[0]?.url;

  return (
    <div>
      <div>{device}</div>
      {image && <img src={image} alt="album art" style={{ width: 100, height: 100 }} />}
      <div>{artist} — {track?.name || "Unknown track"}</div>
      <div>{data.is_playing ? "play" : "paused"}</div>
    </div>
  );
}