import React, { useEffect, useState } from 'react'; // ← you use useState/useEffect
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';

export default function DBHCard() {
  const dbh_blob_opacity = useScrollThresholdFade(80, 8000000, 300);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 600 : false
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "180px",
        width: "90%",
        position: "relative",
        alignContent: "center",
        ...dbh_blob_opacity
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "20px" }}>
        {/* LEFT COLUMN */}
        <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: "100%" }}>
          <h2>Cover // Detroit: Become Human Opening Theme</h2>
          <TextFader
            texts={[
              "Detroit: Become Human is not just a game: it's an incredibly touching story that offers a peek into a potential future world where Artificial Intelligence could be considered a new form of life.",
              "With the rapid advances of AI, Robotics, and Neural Interfaces, we should take some time to reflect on our creations and their deeper implications. Are they a tool for us, something that can help improve our lives, or can they destroy us?"
            ]}
            interval={6000}
            fadeDuration={0.3}
            height={isMobile ? "170px" : "150px"}
            // if TextFader supports a style prop, ensure it can’t overflow:
            // style={{ width: "100%", maxWidth: "100%" }}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: "100%", alignContent: "center" }}>
          <iframe
            src="https://www.youtube.com/embed/c0F4bFpVJVI"
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="glass-effect"
            style={{
              width: "100%",          // ← important on mobile
              maxWidth: "100%",       // ← belt-and-suspenders
              display: "block",       // ← avoid inline gap/overflow quirks
              aspectRatio: "16 / 9",
              minWidth: 0
            }}
          />
        </div>
      </div>
    </div>
  );
}