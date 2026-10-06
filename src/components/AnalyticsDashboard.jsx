import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './analytics.css';

// Unlisted page at /analytics: reads the all-time page views kept by /api/track.
const RANGES = [['7 days', 7], ['30 days', 30], ['90 days', 90], ['All time', 0]];
const LISTS = [
  ['Pages', 'pages'], ['Referrers', 'referrers'], ['UTM sources', 'utm_sources'],
  ['Countries', 'countries'], ['Cities', 'cities'], ['Devices', 'devices'],
  ['Browsers', 'browsers'], ['Operating systems', 'os'],
];
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 200;
const AXIS_WIDTH = 36;
const AXIS_HEIGHT = 24;

const formatNumber = (value) => value.toLocaleString('en-US');
const formatDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// The API leaves out days with no views; the chart needs every day in the range, at zero.
function fillDays(daily, days) {
  if (!daily.length && !days) return [];
  const byDay = new Map(daily.map((row) => [row.day, row]));
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const start = days ? today - (days - 1) * DAY_MS : new Date(daily[0].day).getTime();
  const filled = [];
  for (let time = start; time <= today; time += DAY_MS) {
    const day = new Date(time).toISOString().slice(0, 10);
    filled.push(byDay.get(day) ?? { day, views: 0, visitors: 0 });
  }
  return filled;
}

// Round axis ticks: 0 and up to three steps of 1, 2 or 5 × 10^n covering the peak.
function ticksFor(peak) {
  const rough = Math.max(peak, 1) / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough);
  const top = Math.ceil(Math.max(peak, 1) / step) * step;
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function DailyChart({ daily }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);

  const ticks = ticksFor(Math.max(0, ...daily.map((d) => d.views)));
  const top = ticks[ticks.length - 1];
  const plotWidth = Math.max(width - AXIS_WIDTH, 0);
  const band = daily.length ? plotWidth / daily.length : 0;
  const barWidth = Math.max(Math.min(24, band - 2), 1);
  const y = (value) => CHART_HEIGHT - (value / top) * CHART_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(daily.length / Math.max(1, Math.floor(plotWidth / 64))));

  const indexAt = (clientX) => {
    const bounds = wrapRef.current.getBoundingClientRect();
    const index = Math.floor((clientX - bounds.left - AXIS_WIDTH) / band);
    return index >= 0 && index < daily.length ? index : null;
  };
  const onKeyDown = (event) => {
    if (!daily.length) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setActive((current) => Math.min(daily.length - 1, Math.max(0, (current ?? daily.length - 1) + step)));
  };

  const point = active !== null ? daily[active] : null;
  const tipLeft = point ? AXIS_WIDTH + (active + 0.5) * band : 0;

  return (
    <div
      ref={wrapRef}
      className="an-chart"
      tabIndex={daily.length ? 0 : -1}
      onPointerMove={(event) => setActive(indexAt(event.clientX))}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive((current) => current ?? daily.length - 1)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
    >
      {daily.length === 0 && <p className="an-empty">No data</p>}
      {width > 0 && daily.length > 0 && (
        <svg width={width} height={CHART_HEIGHT + AXIS_HEIGHT} aria-hidden="true">
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="an-grid" x1={AXIS_WIDTH} x2={width} y1={y(tick) + 0.5} y2={y(tick) + 0.5} />
              <text className="an-tick" x={AXIS_WIDTH - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {point && <rect className="an-hover" x={AXIS_WIDTH + active * band} y={0} width={band} height={CHART_HEIGHT} />}
          {daily.map((d, index) => {
            const height = CHART_HEIGHT - y(d.views);
            if (!height) return null;
            const x = AXIS_WIDTH + index * band + (band - barWidth) / 2;
            const r = Math.min(4, barWidth / 2, height);
            return (
              <path
                key={d.day}
                className={`an-bar${index === active ? ' is-active' : ''}`}
                d={`M${x},${CHART_HEIGHT}V${CHART_HEIGHT - height + r}q0,${-r} ${r},${-r}h${barWidth - 2 * r}q${r},0 ${r},${r}V${CHART_HEIGHT}Z`}
              />
            );
          })}
          {/* Counted back from today, so the latest day always has a label and they never crowd. */}
          {daily.map((d, index) => (daily.length - 1 - index) % labelEvery === 0 && (
            <text
              key={d.day}
              className="an-tick"
              x={AXIS_WIDTH + (index + 0.5) * band}
              y={CHART_HEIGHT + 16}
              textAnchor={index === daily.length - 1 && band < 40 ? 'end' : 'middle'}
            >
              {formatDay(d.day)}
            </text>
          ))}
        </svg>
      )}
      {point && (
        <div
          className="an-tip"
          role="status"
          style={{ left: tipLeft, transform: `translateX(${tipLeft > width / 2 ? 'calc(-100% - 12px)' : '12px'})` }}
        >
          <span className="an-tip-day">{formatDay(point.day)}</span>
          <span><strong>{formatNumber(point.visitors)}</strong> visitors</span>
          <span><strong>{formatNumber(point.views)}</strong> views</span>
        </div>
      )}
    </div>
  );
}

function TopList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <section className="an-card an-list">
      <h2>{title}</h2>
      {rows.length === 0 && <p className="an-empty">No data</p>}
      <ol>
        {rows.map((r) => (
          <li key={r.key} title={`${r.key}: ${formatNumber(r.visitors)} visitors, ${formatNumber(r.views)} views`}>
            <span className="an-fill" style={{ width: `${(r.visitors / max) * 100}%` }} />
            <span className="an-key">{r.key}</span>
            <span className="an-num">{formatNumber(r.visitors)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    fetch(`/api/track?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (live) { setData({ ...d, days }); setError(false); } })
      .catch(() => live && setError(true))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [days]);

  const daily = useMemo(() => (data ? fillDays(data.daily ?? [], data.days) : []), [data]);

  return (
    <div className="an-page">
      <div className="an-shell">
        <header className="an-head">
          <h1>Analytics</h1>
          <div className="an-ranges" role="group">
            {RANGES.map(([label, value]) => (
              <button key={value} type="button" aria-pressed={value === days} onClick={() => setDays(value)}>
                {label}
              </button>
            ))}
          </div>
        </header>

        {error && <p className="an-empty">Couldn't load analytics.</p>}
        {!data && !error && <p className="an-empty">Loading…</p>}
        {data && (
          <main className={`an-body${loading ? ' is-loading' : ''}`} aria-busy={loading}>
            <section className="an-card an-overview">
              <dl className="an-totals">
                <div><dt>Visitors</dt><dd>{formatNumber(data.totals.visitors)}</dd></div>
                <div><dt>Page views</dt><dd>{formatNumber(data.totals.views)}</dd></div>
              </dl>
              <DailyChart daily={daily} />
            </section>
            <div className="an-lists">
              {LISTS.map(([title, key]) => <TopList key={key} title={title} rows={data[key] ?? []} />)}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
