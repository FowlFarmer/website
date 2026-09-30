import { useEffect, useRef, useState } from 'react';
import { TUNING_DEFAULTS, freezes, loads, measure, onTuningChange, profile, sceneFrames, setTuning, targetFps, tuning } from './frameStats.js';

// Frames per second, the 95th percentile frame time and the frame budget for the target rate, in
// the corner (not on Vercel's production site: App.jsx). It times the 3D scene's frames while it's
// drawing (it holds itself to 30 a second on low-power devices), otherwise the display's; the
// target is the scene's rate, or the display's refresh rate. Tapped, it opens the audit: where each
// scene frame goes (main thread and GPU, per part), the freezes (long frames, with the scripts that
// took the time), the load milestones and the slowest downloads. window.__perfReport() returns the
// same as data.
const COMMON_RATES = [30, 60, 75, 90, 120, 144, 165, 240];
const seconds = (ms) => `${(ms / 1000).toFixed(2)}s`;
const ms = (value) => (value == null ? '–' : value.toFixed(value < 10 ? 2 : 1));

function report() {
  const resources = performance.getEntriesByType('resource')
    .map((entry) => ({
      name: entry.name.replace(location.origin, '').split('?')[0],
      start: entry.startTime,
      ms: entry.duration,
      kb: entry.transferSize ? entry.transferSize / 1024 : entry.encodedBodySize / 1024,
    }))
    .sort((a, b) => b.ms - a.ms);
  const navigation = performance.getEntriesByType('navigation')[0];
  return {
    gpuTimers: profile.gpu,
    frame: Object.entries(profile.sections).map(([name, { cpu, gpu }]) => ({ name, cpu, gpu })),
    freezes: [...freezes],
    loads: [
      ...(navigation ? [
        { name: 'page: HTML parsed', at: navigation.domInteractive },
        { name: 'page: loaded', at: navigation.loadEventEnd || navigation.domComplete },
      ] : []),
      ...loads,
    ].sort((a, b) => a.at - b.at),
    resources,
  };
}
if (typeof window !== 'undefined') window.__perfReport = report;

// The render settings to try (frameStats.js tuning), remembered on this device.
function RenderSettings() {
  const [values, setValues] = useState(() => ({ ...tuning }));
  useEffect(() => onTuningChange((next) => setValues({ ...next })), []);
  const siteRatio = Math.min(window.devicePixelRatio, 1.5);
  const slider = (key, label, min, max, step, fallback) => {
    const value = values[key] ?? fallback;
    return (
      <label className="frame-setting">
        <span>{label}</span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => setTuning({ [key]: Number(event.target.value) })} />
        <output>{value.toFixed(2)}</output>
      </label>
    );
  };
  const toggle = (key, label) => (
    <label className="frame-setting frame-setting--toggle">
      <input type="checkbox" checked={values[key]} onChange={(event) => setTuning({ [key]: event.target.checked })} />
      <span>{label}</span>
    </label>
  );
  const aaChanged = values.antialias !== aaAtLoad;
  return (
    <div className="frame-settings">
      <strong>render settings (this device)</strong>
      {slider('pixelRatio', 'resolution (px per CSS px)', 0.5, 2, 0.05, siteRatio)}
      {slider('petals', 'falling petals (share)', 0, 1, 0.05, 1)}
      {slider('glowScale', 'kitsune glow resolution', 0.25, 1, 0.05, 1)}
      <label className="frame-setting">
        <span>frame cap</span>
        <select value={values.frameCap ?? 'site'} onChange={(event) => setTuning({ frameCap: event.target.value === 'site' ? null : Number(event.target.value) })}>
          <option value="site">site default</option>
          <option value="30">30 fps</option>
          <option value="60">60 fps</option>
          <option value="0">none</option>
        </select>
      </label>
      <div className="frame-setting-row">
        {toggle('antialias', aaChanged ? 'antialiasing (reload to apply)' : 'antialiasing')}
        {toggle('glass', 'glass copy')}
        {toggle('store', 'store & rider')}
        {toggle('fallingPetals', 'falling petals')}
        {toggle('kitsune', 'kitsune')}
        {toggle('preciseGpu', 'precise GPU timing')}
      </div>
      <div className="frame-setting-row">
        {aaChanged && <button type="button" onClick={() => location.reload()}>reload</button>}
        <button type="button" onClick={() => setTuning({ ...TUNING_DEFAULTS })}>site defaults</button>
      </div>
    </div>
  );
}
const aaAtLoad = tuning.antialias;

function Audit() {
  const [data, setData] = useState(report);
  useEffect(() => {
    const id = window.setInterval(() => setData(report()), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="frame-audit" onClick={(event) => event.stopPropagation()}>
      <RenderSettings />
      <table>
        <thead><tr><th>scene frame</th><th>main ms</th><th>GPU ms{data.gpuTimers ? '' : ' (n/a)'}</th></tr></thead>
        <tbody>
          {data.frame.map(({ name, cpu, gpu }) => (
            <tr key={name}><td>{name}</td><td>{ms(cpu)}</td><td>{ms(gpu)}</td></tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead><tr><th>freeze at</th><th>ms</th><th>what ran longest</th></tr></thead>
        <tbody>
          {data.freezes.slice(-8).reverse().map((freeze) => (
            <tr key={freeze.at}>
              <td>{seconds(freeze.at)}</td>
              <td>{Math.round(freeze.ms)}</td>
              <td>{freeze.scripts.length ? freeze.scripts.map((script) => `${script.what} ${Math.round(script.ms)}ms`).join(', ') : freeze.layout > 30 ? `style/layout/paint ${Math.round(freeze.layout)}ms` : 'browser (no script)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead><tr><th>loaded</th><th>at</th></tr></thead>
        <tbody>
          {data.loads.map((load) => <tr key={`${load.name}${load.at}`}><td>{load.name}</td><td>{seconds(load.at)}</td></tr>)}
        </tbody>
      </table>
      <table>
        <thead><tr><th>slowest downloads</th><th>ms</th><th>KB</th></tr></thead>
        <tbody>
          {data.resources.slice(0, 10).map((resource) => (
            <tr key={`${resource.name}${resource.start}`}><td>{resource.name.split('/').slice(-2).join('/')}</td><td>{Math.round(resource.ms)}</td><td>{Math.round(resource.kb)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FrameMeter() {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const display = [];
    let frame = 0;
    let shownAt = 0;
    const tick = (now) => {
      frame = window.requestAnimationFrame(tick);
      display.push(now);
      while (display.length && display[0] < now - 2000) display.shift();
      if (now - shownAt < 250 || !ref.current) return;
      shownAt = now;
      const scene = sceneFrames();
      const drawing = scene.length && scene[scene.length - 1] > now - 500;
      const stats = measure(drawing ? scene : display, now);
      const shown = measure(display, now);
      if (!stats || !shown) return;
      // The display's refresh rate: its frames' typical gap, to the nearest common rate.
      const refresh = COMMON_RATES.reduce((best, rate) => (Math.abs(rate - shown.fps) < Math.abs(best - shown.fps) ? rate : best));
      const target = (drawing && targetFps()) || refresh;
      const budget = 1000 / target;
      ref.current.textContent = `${Math.round(stats.fps)} fps · p95 ${stats.p95.toFixed(1)} ms · budget ${budget.toFixed(1)} ms (${target} fps)`;
      ref.current.dataset.over = stats.p95 > budget * 1.1 ? 'true' : 'false';
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="frame-meter-wrap">
      <button type="button" ref={ref} className="frame-meter" aria-label="Frame rate (tap for the audit)" onClick={() => setOpen((value) => !value)} />
      {open && <Audit />}
    </div>
  );
}
