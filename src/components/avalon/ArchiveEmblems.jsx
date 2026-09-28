import { useEffect, useRef } from 'react';

export default function ArchiveEmblems({ sections, turn, active, still, onSelect, portalRefs }) {
  const refs = useRef([]), angle = useRef(turn), target = useRef(turn);
  useEffect(() => { target.current = turn; }, [turn]);
  useEffect(() => {
    let frame, last = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw(now) {
      const dt = Math.min((now - last) / 1000 || .016, .05); last = now;
      angle.current = still || reduced.matches ? target.current : angle.current + (target.current - angle.current) * (1 - Math.exp(-7 * dt));
      refs.current.forEach((node, i) => {
        if (!node) return;
        const a = (i - angle.current) * Math.PI * 2 / 3, front = (Math.cos(a) + 1) / 2;
        node.style.setProperty('--orbit-x', `${Math.sin(a) * 36}vw`);
        node.style.setProperty('--orbit-y', `${(1 - front) * -42}px`);
        node.style.setProperty('--scale', .48 + front * .52);
        node.style.setProperty('--light', .45 + front ** 3 * .55);
        node.style.zIndex = Math.round(front * 10) + 1;
      });
      // Stop the loop when the turn is settled; CSS handles the idle light treatment.
      if (Math.abs(angle.current - target.current) > .0001) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [turn, still]);
  return <div className="archive-emblems">{sections.map((s, i) => <button
    key={s.id} ref={node => { refs.current[i] = node; portalRefs.current[s.id] = node; }}
    className={`archive-emblem ${active === i ? 'is-selected' : ''}`} aria-label={active === i ? `Open ${s.name}` : `Select ${s.name}`} aria-current={active === i ? 'true' : undefined}
    onClick={() => onSelect(i)}>
    <img src={`/avalon/${s.id}.webp`} alt="" width="768" height="768" draggable="false" />
    <span>{s.name}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></span>
  </button>)}</div>;
}
