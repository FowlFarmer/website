import { useState } from 'react';
import { COLOR_TUNING, setColorTuning } from './kitsuneRig.js';

// Sliders for the tails' light, per colour: Glow scales its glow (for black, its opacity); Hover
// is how many times brighter (darker, for black) it gets when its tail is hovered. They change
// every kitsune on the page live (COLOR_TUNING in kitsuneRig.js); "Copy light" copies the values
// to paste back into COLOR_TUNING.
const COLOURS = {
  '#ff2238': 'Tesla',
  '#050505': 'Black',
  '#ffffff': 'White',
  '#3fc4e8': 'WATO',
  '#8f8fe6': 'IR',
  '#ff2331': 'Rapyuta',
};

export default function TailLightTuner() {
  const [tuning, setTuning] = useState(() => structuredClone(COLOR_TUNING));
  const [copied, setCopied] = useState(false);
  const change = (color, key, value) => {
    setColorTuning(color, { [key]: value });
    setTuning((current) => ({ ...current, [color]: { ...current[color], [key]: value } }));
  };
  const slider = (color, key, label, max, step) => (
    <label key={`${color}-${key}`}>
      <span>{label}</span>
      <input
        type="range" min={0} max={max} step={step} value={tuning[color][key]}
        onChange={(event) => change(color, key, Number(event.target.value))}
      />
      <input
        type="number" min={0} max={max} step={step} value={tuning[color][key]}
        onChange={(event) => change(color, key, Number(event.target.value))}
      />
      <small />
    </label>
  );
  return (
    <>
      <strong>Tail light</strong>
      {Object.entries(COLOURS).map(([color, name]) => (
        <div key={color} className="tail-light-colour">
          <p><span style={{ background: color }} /> {name}</p>
          {slider(color, 'strength', 'Glow', 3, 0.01)}
          {slider(color, 'hover', 'Hover', 5, 0.05)}
        </div>
      ))}
      <div className="kitsune-tuner-buttons">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(tuning, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy light'}
        </button>
      </div>
    </>
  );
}
