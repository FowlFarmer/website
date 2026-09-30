import React from 'react';
import ProjectFader from '../ProjectFader.jsx';
import showerThoughts from '../../data/showerThoughts.js';

// Each entry stays up for its reading time (at READING_WPM), then moves on; hovering it pauses.
const READING_WPM = 230;
const readingMs = (entry) => {
  const words = entry.paragraphs.join(' ').split(/\s+/).length;
  return Math.max(20000, Math.round((words / READING_WPM) * 60000));
};
const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// Shower Thoughts: short essays, one at a time, in the same fader as the ships and small projects.
export default function ShowerThoughtsCard() {
  const items = showerThoughts.map((entry) => (
    <article key={entry.slug} className="shower-thought">
      <h3>{entry.title}</h3>
      <p className="shower-thought-date">{formatDate(entry.date)}</p>
      {entry.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
    </article>
  ));
  return (
    <div className="glass-effect" style={{ marginTop: '40px', width: '90%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 0', textAlign: 'left' }}>
        <h2 style={{ margin: 0 }}>Shower Thoughts</h2>
        <p className="shower-thoughts-note">
          These were literally composed in the shower, they're flawed ideas produced out of serendipity. Do NOT hold them accountable as proper philosophy!
        </p>
      </div>
      <ProjectFader interval={showerThoughts.map(readingMs)} items={items} />
    </div>
  );
}
