import { useState } from 'react';
import { TAIL_POSE, setTailPose } from './kitsuneRig.js';

// Sliders to move and turn the tails, as one piece, relative to him (TAIL_POSE in kitsuneRig.js),
// live. "Copy tail pose" copies the values to paste back into TAIL_POSE.
const FIELDS = [
  ['x', 'Across', -1.5, 1.5, 0.01, 'm'],
  ['y', 'Up', -1.5, 1.5, 0.01, 'm'],
  ['z', 'Back', -1.5, 1.5, 0.01, 'm'],
  ['yaw', 'Yaw', -45, 45, 0.5, '°'],
  ['pitch', 'Pitch', -45, 45, 0.5, '°'],
  ['roll', 'Roll', -45, 45, 0.5, '°'],
];

export default function TailPoseTuner() {
  const [pose, setPose] = useState(() => ({ ...TAIL_POSE }));
  const [copied, setCopied] = useState(false);
  const change = (key, value) => {
    setTailPose({ [key]: value });
    setPose((current) => ({ ...current, [key]: value }));
  };
  return (
    <>
      <strong>Tail position</strong>
      {FIELDS.map(([key, label, min, max, step, unit]) => (
        <label key={key}>
          <span>{label}</span>
          <input type="range" min={min} max={max} step={step} value={pose[key]} onChange={(event) => change(key, Number(event.target.value))} />
          <input type="number" min={min} max={max} step={step} value={pose[key]} onChange={(event) => change(key, Number(event.target.value))} />
          <small>{unit}</small>
        </label>
      ))}
      <div className="kitsune-tuner-buttons">
        <button type="button" onClick={() => FIELDS.forEach(([key]) => change(key, 0))}>Reset</button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(pose));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy tail pose'}
        </button>
      </div>
    </>
  );
}
