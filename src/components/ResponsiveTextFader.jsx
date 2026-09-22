import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function ResponsiveTextFader({ texts = [], interval = 3000, fadeDuration = 0.8, height = '1.5rem', className = '' }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (paused || reducedMotion || texts.length < 2) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % texts.length), interval);
    return () => clearInterval(timer);
  }, [texts.length, interval, paused, reducedMotion]);
  // The invisible alternatives participate in grid sizing, so even the longest
  // paragraph fits after wrapping without clipping or moving the next section.
  return (
    <div className="text-fader" style={{ minHeight: height }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {texts.map((text, i) => (
        <span key={i} className={className} aria-hidden={i !== index}
          style={{ gridArea: '1 / 1', visibility: i === index ? 'visible' : 'hidden', opacity: i === index ? 1 : 0, transition: `opacity ${reducedMotion ? 0 : fadeDuration}s` }}>
          {text}
        </span>
      ))}
    </div>
  );
}
