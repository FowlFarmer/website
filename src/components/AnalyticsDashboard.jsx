import React, { useEffect, useState } from 'react';
import './analytics.css';

// Unlisted page at /analytics: reads the all-time page views kept by /api/track.
const RANGES = [['7 days', 7], ['30 days', 30], ['90 days', 90], ['All time', 0]];
const LISTS = [
  ['Pages', 'pages'], ['Referrers', 'referrers'], ['UTM sources', 'utm_sources'],
  ['Countries', 'countries'], ['Cities', 'cities'], ['Devices', 'devices'],
  ['Browsers', 'browsers'], ['Operating systems', 'os'],
];

function TopList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <section className="an-card">
      <h2>{title}</h2>
      {rows.length === 0 && <p className="an-empty">No data</p>}
      {rows.map((r) => (
        <div className="an-row" key={r.key}>
          <span className="an-bar" style={{ width: `${(r.visitors / max) * 100}%` }} />
          <span className="an-key">{r.key}</span>
          <span className="an-num">{r.visitors}</span>
        </div>
      ))}
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let live = true;
    setError(false);
    fetch(`/api/track?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [days]);

  const daily = data?.daily ?? [];
  const peak = Math.max(1, ...daily.map((d) => d.views));

  return (
    <div className="an-page">
      <header className="an-head">
        <h1>Analytics</h1>
        <div className="an-ranges">
          {RANGES.map(([label, value]) => (
            <button key={value} className={value === days ? 'is-on' : ''} onClick={() => setDays(value)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="an-empty">Couldn't load analytics.</p>}
      {!data && !error && <p className="an-empty">Loading…</p>}
      {data && (
        <>
          <div className="an-totals">
            <div><span>Visitors</span><strong>{data.totals.visitors}</strong></div>
            <div><span>Page views</span><strong>{data.totals.views}</strong></div>
          </div>
          <section className="an-card an-chart">
            {daily.map((d) => (
              <div key={d.day} className="an-col" title={`${d.day}: ${d.visitors} visitors, ${d.views} views`}>
                <span style={{ height: `${(d.views / peak) * 100}%` }} />
              </div>
            ))}
            {daily.length === 0 && <p className="an-empty">No data</p>}
          </section>
          <div className="an-grid">
            {LISTS.map(([title, key]) => <TopList key={key} title={title} rows={data[key] ?? []} />)}
          </div>
        </>
      )}
    </div>
  );
}
