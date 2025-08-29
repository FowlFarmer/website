import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';

export default function Gerb2Card() {
//   const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        // height: "400px",
        position: "relative",
        // overflow: "hidden",
        alignContent: "center",
        // ...dbh_blob_opacity
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px"}}>
        <div style={{ flex: "1 1 360px", padding: "20px", alignContent: "flex-start" }}>
            <h2 style={{marginTop: "0px"}}>Gerb II: Electric Boogaloo (A simulated differential drive robot)</h2>
            <TextFader
              texts={[
                "Gerb is a fully autonomous differential drive robot in Foxglove sim. The system processes LIDAR data into local and global maps, enabling obstacle avoidance and smooth trajectory execution, and is a fully containerized monorepo infra with Docker for consistent deployment.",
                "I implemented a containerized ROS2 robotic navigation system in a monorepo infrastructure comprising of modular nodes for path planning, costmap generation, control, and map memory. I leveraged robotics algorithms including A* pathfinding (modified with custom costmap weight heuristics), obstacle inflation, ray tracing, pure pursuit control, and a differential drive motion model."
              ]}
              interval={7000}
              fadeDuration={0.3}
              height={"220px"}
            />
        </div>
        <div style={{ flex: "1 1 360px", padding: "20px", alignContent: "center", textAlign: "center" }}>
          <iframe
            src="https://www.youtube.com/embed/LWBjHgwYJAU"
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="glass-effect"
            style={{ width: "100%", aspectRatio: "16/9" }}
          ></iframe>
          <div style={{marginTop: "10px"}} />
          <a
              href="https://github.com/FowlFarmer/AutoSpriteTransform"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Find on GitHub</button>
            </a>
        </div>
      </div>
    </div>
  );
}