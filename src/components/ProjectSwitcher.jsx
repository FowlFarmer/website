import React, { useId, useState } from 'react';

// Long-form projects should change only when requested. Automatic height changes
// moved the rest of the page while a visitor was reading or scrolling on a phone.
export default function ProjectSwitcher({ items = [], labels = [], className = '', startIndex = 0, onIndexChange }) {
  const [index, setIndex] = useState(startIndex);
  const panelId = useId();
  if (!items.length) return null;
  const activeIndex = Math.min(index, items.length - 1);
  return (
    <div className={`content-switcher ${className}`}>
      {items.length > 1 && (
        <div className="content-switcher-controls" role="group" aria-label="Choose a project">
          {items.map((_, i) => (
            <button key={i} type="button" aria-pressed={i === activeIndex} aria-controls={panelId}
              onClick={() => { setIndex(i); onIndexChange?.(i); }}>
              {labels[i] || `Project ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div id={panelId}>{items[activeIndex]}</div>
    </div>
  );
}
