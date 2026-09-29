import { useEffect, useState } from 'react';

// A scroll story pins a full-screen stage while its tall section scrolls past. Progress runs
// 0 → 1 across the section: first an overview of every role, then each role in turn.
export const INTRO_SPAN = 0.12;

export function useSectionProgress(sectionRef) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      const span = Math.max(bounds.height - window.innerHeight, 1);
      setProgress(Math.min(Math.max(-bounds.top / span, 0), 1));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [sectionRef]);
  return progress;
}

// Where the story is: `intro` fades 1 → 0 over the overview, `position` is a continuous role
// index (-1 during the overview, 0.5 halfway through the first role), `active` the role shown.
export function storyState(progress, count) {
  const span = (1 - INTRO_SPAN) / count;
  const position = progress < INTRO_SPAN ? -1 + progress / INTRO_SPAN : (progress - INTRO_SPAN) / span;
  const active = Math.min(Math.max(Math.floor(position), 0), count - 1);
  return {
    intro: Math.max(0, 1 - progress / INTRO_SPAN),
    position,
    active,
    local: Math.min(Math.max(position - active, 0), 1),
  };
}

export const roleProgress = (index, count) => INTRO_SPAN + ((index + 0.5) * (1 - INTRO_SPAN)) / count;

export function scrollToProgress(section, progress) {
  const bounds = section.getBoundingClientRect();
  const top = window.scrollY + bounds.top;
  window.scrollTo({ top: top + progress * (bounds.height - window.innerHeight), behavior: 'smooth' });
}

export const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
export const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// Every concept keeps a rail of logos: the current role lit, any logo a jump to its role.
export function LogoRail({ roles, active, intro, sectionRef, className = '' }) {
  return (
    <nav className={`story-rail ${className}`} style={{ opacity: 1 - intro }} aria-label="Jump to a role">
      {roles.map((role, index) => (
        <button
          key={role.id}
          type="button"
          className="story-rail-logo"
          aria-current={index === active ? 'step' : undefined}
          aria-label={`${role.company}, ${role.year}`}
          onClick={() => scrollToProgress(sectionRef.current, roleProgress(index, roles.length))}
        >
          <img src={role.logo} alt="" />
        </button>
      ))}
    </nav>
  );
}

export function RoleDetails({ role }) {
  return (
    <>
      <p className="story-date">{role.dateRange}</p>
      <h3 className="story-company">{role.company}</h3>
      <p className="story-headline">{role.headline}</p>
      <p className="story-location">{role.location}</p>
    </>
  );
}
