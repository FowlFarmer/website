import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';

export default function DBHCard() {
  const dbh_blob_opacity = useScrollThresholdFade(80, 8000000, 300);

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "180px",
        width: "90%",
        position: "relative",
        // overflow: "hidden",
        alignContent: "center",
        ...dbh_blob_opacity
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "20px" }}>
        <div className="flex items-start justify-start" style={{ flex: "0.8 0.8 450px"}}>
          <div style={{ flex: 1, alignItems: "flex-start" }}>
            <h2>Cover // Detroit: Become Human Opening Theme</h2>
            <TextFader
              texts={[
                "Detroit: Become Human is not just a game: it's an incredibly touching story that offers a peek into a potential future world where Artificial Intelligence could be considered a new form of life.",
                "With the rapid advances of AI, Robotics, and Neural Interfaces, we should take some time to reflect on our creations and their deeper implications. Are they a tool for us, something that can help improve our lives, or can they destroy us?"
              ]}
              interval={6000}
              fadeDuration={0.3}
              height={"150px"}
            />
          </div>
        </div>
        <div style={{ flex: "1 1 450px", alignContent: "center" }}>
          <iframe
            src="https://www.youtube.com/embed/c0F4bFpVJVI"
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="glass-effect"
            style={{ aspectRatio: "16/9", minWidth: "0px" }}
          ></iframe>
        </div>
      </div>
    </div>
  );
}