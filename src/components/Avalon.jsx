import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import avalonPosts from '../data/avalonPosts.js';
import { memories, questlines } from '../data/avalonArchive.js';
import './avalon/Avalon.css';
import ArchiveEmblems from './avalon/ArchiveEmblems.jsx';
import { pageScrollTo } from './pageScroll.js';

const ArchiveScene = lazy(() => import('./avalon/ArchiveScene.jsx'));
const sections = [
  { id: 'quests', number: 'I', name: 'Quests', subtitle: 'For the roads not yet taken', detail: 'Follow a little curiosity. Find your next adventure.', count: `${questlines.length} questline` },
  { id: 'memories', number: 'II', name: 'Memories', subtitle: 'For the moments that remain', detail: 'Little pieces of life, kept close to the heart.', count: `${memories.length} moments` },
  { id: 'journals', number: 'III', name: 'Journals', subtitle: 'For the thoughts along the way', detail: 'A place to wonder, reflect, and begin again.', count: `${avalonPosts.length} entry` },
];
const storageKey = 'avalon-quest-progress-v1';
function dateLabel(date) { return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`)); }
function Sigil({ kind = 'archive', ...props }) {
  return <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>
    <circle cx="40" cy="40" r="30" opacity=".5" /><path d="M40 3v10m0 54v10M3 40h10m54 0h10" />
    {kind === 'quests' ? <><path d="m44 14 4 8-9 31-7-2 9-31 3-6ZM25 49l23 7M34 54l-4 12m-4-2 9 3" /><path d="m18 18 4 4m36 36 4 4" /></> : kind === 'memories' ? <><path d="m40 15 16 23-16 28-16-28 16-23Zm0 0-6 23 6 28 6-28-6-23ZM24 38h32" /><ellipse cx="40" cy="40" rx="34" ry="12" transform="rotate(-30 40 40)" /></> : <><path d="M40 28c-9-7-18-8-24-6v34c9-2 16 0 24 5 8-5 15-7 24-5V22c-6-2-15-1-24 6Zm0 0v33M22 31l12 4m-12 4 12 4m-12 4 12 4m12-16 12-4m-12 12 12-4m-12 12 12-4" /></>}
  </svg>;
}
function readProgress() { try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}; } catch { return {}; } }

export default function Avalon() {
  const [params, setParams] = useSearchParams();
  const collection = sections.some(s => s.id === params.get('collection')) ? params.get('collection') : null;
  const [turn, setTurn] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef(null);
  const dragged = useRef(0);
  const active = ((turn % 3) + 3) % 3;
  const selectArtifact = index => { const delta = ((index - active + 4) % 3) - 1; setTurn(value => value + delta); };
  const releaseDrag = event => {
    if (dragStart.current === null) return;
    const distance = dragStart.current - event.clientX;
    dragStart.current = null; setDrag(0);
    if (Math.abs(distance) > 12) dragged.current = performance.now();
    if (Math.abs(distance) > 35) setTurn(value => value + (distance > 0 ? 1 : -1));
  };
  const [still, setStill] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [unavailable, setUnavailable] = useState(false);
  const handleUnavailable = useCallback(() => setUnavailable(true), []);
  const heading = useRef(null);
  const firstRender = useRef(true);
  const previousCollection = useRef(collection);
  const portalRefs = useRef({});
  const [progress, setProgress] = useState(readProgress);
  const [storageNotice, setStorageNotice] = useState('');
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    pageScrollTo({ top: 0, behavior: 'instant' });
    if (collection) heading.current?.focus();
    else portalRefs.current[previousCollection.current]?.focus();
    previousCollection.current = collection;
  }, [collection]);
  const open = id => setParams(id ? { collection: id } : {});
  const toggleTask = id => {
    const next = { ...progress, [id]: !progress[id] }; setProgress(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageNotice('Progress saved on this device.'); }
    catch { setStorageNotice('Progress is available for this visit only; storage is unavailable.'); }
  };
  const selected = sections.find(s => s.id === collection);
  return <section className={`avalon-archive ${collection ? 'is-collection' : ''}`} aria-label="Avalon personal archive">
    <div className="archive-sky" aria-hidden="true"><div className="archive-orbit orbit-one" /><div className="archive-orbit orbit-two" /><div className="archive-orbit orbit-three" /></div>
    <header className="archive-topbar">
      <button className="archive-brand" onClick={() => open(null)} aria-label="Avalon archive home"><Sigil /><span>Avalon</span></button>
      <div className="archive-top-actions">
        {!collection && <button className="archive-motion" aria-pressed={still} aria-label={still ? "Animate scene" : "Pause scene"} title={still ? "Animate scene" : "Pause scene"} onClick={() => setStill(!still)}><svg viewBox="0 0 24 24" aria-hidden="true">{still ? <path d="m8 5 11 7-11 7Z"/> : <path d="M8 5v14M16 5v14"/>}</svg></button>}
        <Link className="archive-exit" to="/self" aria-label="Leave Avalon" title="Leave Avalon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></Link>
      </div>
    </header>
    {!collection ? <>
      <div className="archive-turntable" role="region" aria-roledescription="carousel" aria-label="Archive collections" tabIndex={0}
        onKeyDown={event => { if(event.key === 'ArrowLeft'){event.preventDefault();setTurn(value => value-1);} if(event.key === 'ArrowRight'){event.preventDefault();setTurn(value => value+1);} if(event.key === 'Enter' && event.target === event.currentTarget) open(sections[active].id); }}
        onPointerDown={event => { if(event.target.closest('.turntable-arrow')) return; dragStart.current=event.clientX; }}
        onPointerMove={event => { if(dragStart.current !== null) { if(Math.abs(dragStart.current-event.clientX)>12) event.currentTarget.setPointerCapture(event.pointerId); setDrag((dragStart.current-event.clientX)/Math.max(300,window.innerWidth*.6)); } }}
        onPointerUp={releaseDrag} onPointerCancel={() => {dragStart.current=null;setDrag(0);}}>
        <Suspense fallback={<div className="turntable-fallback"><Sigil kind={sections[active].id}/></div>}>
          {unavailable ? <div className="turntable-fallback"><Sigil kind={sections[active].id}/></div> : <ArchiveScene turn={turn+drag} still={still} onUnavailable={handleUnavailable}/>}
        </Suspense>
        <button className="turntable-arrow turntable-prev" onClick={() => setTurn(value=>value-1)} aria-label="Previous collection">‹</button>
        <button className="turntable-arrow turntable-next" onClick={() => setTurn(value=>value+1)} aria-label="Next collection">›</button>
        <ArchiveEmblems sections={sections} turn={turn+drag} active={active} still={still} portalRefs={portalRefs}
          onSelect={index => {if(performance.now()-dragged.current<250) return; if(index===active) open(sections[index].id); else selectArtifact(index);}} />
        <span className="archive-selection-status" role="status">{sections[active].name} selected. Use left and right arrows to rotate, Enter to open.</span>
      </div>
    </> : <>
      <nav className="archive-collection-nav" aria-label="Archive collections"><button onClick={() => open(null)}>← <span>The archive</span></button><div>{sections.map(s => <button key={s.id} aria-current={collection === s.id ? 'page' : undefined} onClick={() => open(s.id)}><Sigil kind={s.id} />{s.name}</button>)}</div></nav>
      <header className="collection-heading"><h1 ref={heading} tabIndex={-1}>{selected.name}<span> / {selected.count}</span></h1></header>
      {collection === 'quests' && <QuestCollection progress={progress} onToggle={toggleTask} notice={storageNotice} />}
      {collection === 'memories' && <MemoryCollection />}
      {collection === 'journals' && <JournalCollection />}
      <footer className="archive-footer"><button onClick={() => open(null)}>Return to the archive ↑</button></footer>
    </>}
  </section>;
}

function QuestCollection({ progress, onToggle, notice }) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(questlines[0]?.id);
  const completed = q => q.tasks.filter(t => progress[`${q.id}:${t.id}`] === true).length;
  const filtered = questlines.filter(q => filter === 'all' || (filter === 'complete' ? completed(q) === q.tasks.length : completed(q) < q.tasks.length));
  const quest = filtered.find(q => q.id === selectedId) || filtered[0];
  const done = quest ? completed(quest) : 0;
  const visible = Boolean(quest);
  return <div className="quest-layout">
    <aside className="archive-sidebar"><p className="archive-eyebrow">YOUR QUEST LOG</p><div className="archive-filters" aria-label="Filter questlines">{[['all','All'],['active','In progress'],['complete','Complete']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {visible ? filtered.map(q => <button key={q.id} onClick={() => setSelectedId(q.id)} aria-pressed={q.id === quest.id} className={`quest-index ${q.id === quest.id ? 'is-selected' : ''}`}><Sigil kind="quests" /><small>{q.status === 'draft' ? 'DRAFT QUESTLINE' : 'QUESTLINE'}</small><strong>{q.title}</strong><span>{completed(q)} of {q.tasks.length} steps complete</span><progress aria-label={`${q.title} progress`} value={completed(q)} max={q.tasks.length} /></button>) : <p className="archive-empty">No matching questlines.</p>}
      <p className="archive-side-note">Task progress is saved on this device.</p>
    </aside>
    {visible && <article className="quest-detail"><div className="quest-banner"><span className="archive-eyebrow">{quest.category}</span><Sigil kind="quests" /><h2>{quest.title}</h2><p>{quest.summary}</p></div><div className="quest-body"><div className="quest-section-label"><h3>The journey</h3><span>{String(done).padStart(2,'0')} / {String(quest.tasks.length).padStart(2,'0')}</span></div><p className="quest-description">{quest.description}</p><ol className="quest-tasks">{quest.tasks.map((t,i) => {const id=`${quest.id}:${t.id}`;return <li key={id} className={progress[id] === true ? 'is-complete' : ''}><label><input type="checkbox" checked={progress[id] === true} onChange={() => onToggle(id)} /><span className="quest-check" aria-hidden="true">{progress[id] === true ? '✓' : String(i+1).padStart(2,'0')}</span><span><small>{t.phase}</small><strong>{t.title}</strong><span>{t.note}</span></span></label></li>;})}</ol><p className="archive-save-notice" role="status">{notice}</p></div></article>}
  </div>;
}

function MemoryCollection() {
  const [filter, setFilter] = useState('All moments');
  const [photo, setPhoto] = useState(null);
  const opener = useRef(null);
  const filtered = memories.filter(m => filter === 'All moments' || m.collection === filter);
  return <><div className="memory-toolbar"><div className="archive-filters" aria-label="Filter memories">{['All moments','Cosplay','In the making'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div><span>{filtered.length} photos</span></div><div className="memory-grid">{filtered.map((m,i) => <button key={m.id} className="memory-card" onClick={e => {opener.current=e.currentTarget;setPhoto(m);}} aria-label={`Open ${m.title}`}><div className="memory-image"><img src={m.src} alt={m.alt} loading="lazy" /><span className="memory-expand" aria-hidden="true">↗</span></div><span className="memory-caption"><span><small>{m.collection}</small><strong>{m.title}</strong></span><i>{String(i+1).padStart(2,'0')}</i></span></button>)}</div>{photo && <MemoryDialog photo={photo} photos={filtered} setPhoto={setPhoto} onClose={() => setPhoto(null)} opener={opener} />}</>;
}
function MemoryDialog({ photo, photos, setPhoto, onClose, opener }) {
  const ref = useRef(null);
  useEffect(() => { const dialog=ref.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();return () => {dialog.close();document.body.style.overflow=overflow;opener.current?.focus();}; }, [opener]);
  const index = photos.findIndex(p => p.id === photo.id);
  const next = direction => setPhoto(photos[(index+direction+photos.length)%photos.length]);
  return <dialog className="archive-lightbox" ref={ref} aria-label={photo.title} onCancel={e => {e.preventDefault();onClose();}} onClick={e => {if(e.target===e.currentTarget) onClose();}} onKeyDown={e => {if(e.key==='ArrowRight') next(1);if(e.key==='ArrowLeft') next(-1);}}><button className="lightbox-close" autoFocus onClick={onClose} aria-label="Close photo">×</button><img src={photo.src} alt={photo.alt} /><div className="lightbox-caption"><button onClick={() => next(-1)} aria-label="Previous photo">←</button><span><strong>{photo.title}</strong><small>{index+1} / {photos.length} · {photo.collection}</small></span><button onClick={() => next(1)} aria-label="Next photo">→</button></div></dialog>;
}
function JournalCollection() {
  const [slug,setSlug]=useState(avalonPosts[0]?.slug);
  const post=avalonPosts.find(p=>p.slug===slug) || avalonPosts[0];
  if(!post) return <p className="archive-empty">A blank page. A place to begin.</p>;
  const minutes=Math.max(1,Math.ceil(post.paragraphs.join(' ').split(/\s+/).length/200));
  return <div className="journal-layout"><aside className="archive-sidebar"><p className="archive-eyebrow">THE WRITTEN CHAPTERS</p>{avalonPosts.map((p,i)=><button className="journal-index" aria-pressed={p.slug===post.slug} onClick={()=>setSlug(p.slug)} key={p.slug}><span>ENTRY {String(i+1).padStart(2,'0')}</span><strong>{p.title}</strong><small>{dateLabel(p.date)}</small></button>)}</aside><article className="journal-page"><div className="journal-page-top"><span>THOUGHTS & REFLECTIONS</span><span>{minutes} MIN READ</span></div><header><p>{dateLabel(post.date)}</p><h2>{post.title}</h2><div className="journal-ornament">— ✦ —</div></header>{post.paragraphs.map((p,i)=><p className={i===0?'journal-first':''} key={i}>{p}</p>)}<footer><span>✦</span><p>Theodore</p></footer></article></div>;
}
