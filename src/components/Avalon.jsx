import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Avalon() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/avalon/index.json")
      .then((r) => r.json())
      .then((data) => {
        // Sort by date descending
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
        setPosts(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="self" style={{ width: "90%", maxWidth: "720px", margin: "0 auto", color: "white" }}>
      <div style={{ height: "80px" }} />
      <h1 style={{ fontWeight: "100", fontSize: "2.5rem", marginBottom: "4px" }}>Avalon</h1>
      <p style={{ fontWeight: "100", fontStyle: "italic", opacity: 0.5, marginTop: 0, marginBottom: "48px", fontSize: "0.95rem" }}>
        writing · notes · ideas
      </p>

      {loading && <p style={{ opacity: 0.4, fontWeight: "100" }}>Loading…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/avalon/${post.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="avalon-post-card"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "28px",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <p style={{ fontWeight: "100", opacity: 0.4, fontSize: "0.8rem", margin: "0 0 6px 0", letterSpacing: "0.05em" }}>
                {post.date}
              </p>
              <h2 style={{ fontWeight: "300", fontSize: "1.3rem", margin: "0 0 8px 0" }}>{post.title}</h2>
              <p style={{ fontWeight: "100", opacity: 0.6, fontSize: "0.9rem", margin: 0 }}>{post.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ height: "80px" }} />
    </div>
  );
}
