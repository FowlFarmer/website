import React, { useMemo, useState } from "react";
import avalonPosts from "../data/avalonPosts.js";

function formatPostDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function Avalon() {
  const [selectedSlug, setSelectedSlug] = useState(avalonPosts[0]?.slug);
  const selectedPost = useMemo(
    () => avalonPosts.find((post) => post.slug === selectedSlug) || avalonPosts[0],
    [selectedSlug],
  );

  return (
    <section className="avalon-blog" aria-label="Avalon blog">
      <header className="avalon-blog-header">
        <p>Avalon</p>
        <h1>Avalon is the utopia I wish to build, written as I go.</h1>
      </header>

      <div className="avalon-blog-layout">
        <aside className="avalon-post-index" aria-label="Blog posts">
          {avalonPosts.map((post) => (
            <button
              key={post.slug}
              type="button"
              className={post.slug === selectedPost.slug ? "is-active" : ""}
              onClick={() => setSelectedSlug(post.slug)}
            >
              <span>{formatPostDate(post.date)}</span>
              <strong>{post.title}</strong>
              <small>{post.excerpt}</small>
            </button>
          ))}
        </aside>

        <article className="avalon-post">
          <div className="avalon-post-meta">{formatPostDate(selectedPost.date)}</div>
          <h2>{selectedPost.title}</h2>
          {selectedPost.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </div>
    </section>
  );
}
