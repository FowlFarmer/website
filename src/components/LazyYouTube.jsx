import { useState } from 'react';

// A YouTube embed loads a full player (several hundred KB of script plus its
// own compositor surface) the moment the iframe mounts, and it stays live
// while the page scrolls. Show the poster frame instead and mount the real
// player only when the visitor asks for it.
export default function LazyYouTube({ videoId, title = 'YouTube video', style, className }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className={className}
        style={{ width: '100%', aspectRatio: '16 / 9', display: 'block', border: 0, ...style }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`lazy-youtube${className ? ` ${className}` : ''}`}
      style={style}
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span className="lazy-youtube-play" aria-hidden="true" />
    </button>
  );
}
