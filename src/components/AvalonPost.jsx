import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function AvalonPost() {
  const { slug } = useParams();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/avalon/posts/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div style={{ width: "90%", maxWidth: "680px", margin: "0 auto", color: "white" }}>
      <div style={{ height: "80px" }} />

      <Link
        to="/avalon"
        style={{
          textDecoration: "none",
          color: "rgba(255,255,255,0.45)",
          fontSize: "0.85rem",
          fontWeight: "100",
          fontStyle: "italic",
          letterSpacing: "0.03em",
        }}
      >
        ← back to Avalon
      </Link>

      <div style={{ height: "36px" }} />

      {loading && <p style={{ opacity: 0.4, fontWeight: "100" }}>Loading…</p>}

      {notFound && (
        <p style={{ opacity: 0.5, fontWeight: "100" }}>Post not found.</p>
      )}

      {content && (
        <div className="avalon-prose">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

      <div style={{ height: "80px" }} />
    </div>
  );
}
