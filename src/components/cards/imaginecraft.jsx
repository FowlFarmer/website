import React from "react";
import { Link } from "react-router-dom";

// import SmartSectionTimeline from "../jias-react-components/tools/smartSectionTimeline.jsx";
/**
 * ImaginecraftCard
 * - Mirrors your GuardianAngel card layout
 * - Left: images + CTA button
 * - Right: description content from your Weebly page
 *
 * Props (optional):
 *   primaryImg   - string path/URL to main screenshot
 *   secondaryImg - string path/URL to second shot
 *   githubUrl    - external link to repo/readme (defaults to your Weebly gallery section)
 */
export default function ImaginecraftCard({
  primaryImg = "/imaginecraft/imaginecraft_1.png",
  secondaryImg = "/imaginecraft/imaginecraft_2.png",
  githubUrl = "https://github.com/FowlFarmer/AutoSpriteTransform",
}) {
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        // backgroundColor: "white",
        // color: "black",
        textAlign: "left",
        textShadow: "0px 1px 2px rgba(0, 0, 0, 0)",
        padding: "0px 20px 0px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}
    >
      <p
        style={{        //   marginTop: "20px",
        //   marginLeft: "20px",
          fontWeight: "bold",
        }}
      >
        Featured Project — Imaginecraft
      </p>
        <img
            style={{ borderRadius: "10px", margin: "0 auto" }}
            src={primaryImg}
            alt="Imaginecraft screenshot"
        />
        <div >
        <p>Imaginecraft is a Minecraft mod that bridges AI and MCP (model context protocol) with gaming. This new type of intersection of AI and gaming leverages direct generated javascript code injection at runtime with KubeJS, allowing players to actualize their creativity more intimately than ever before in the history of gaming.</p>
        <p>Users can imagine their own spell incantations and, through NLP, they can be actualized into real effects in the Minecraft world complete with particle and sound effects.</p>
        <p>Users can forge never-before-seen weapons from their imagination. They can ask the "gamemaker" for items that do not yet exist in the world, i.e. lightsabers, Harry Potter wands, guns, etc. and they will materialize in the user's hands with new game logic and sound and sprite resource pack injection through an image diffusion pipeline.</p>
        </div>
        {/* <hr /> */}
      <div style={{ display: "flex", gap: 0, marginTop: "-20px", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Left column: images + CTA */}
        <div
          className="flex items-center justify-center"
          style={{ flex: "0.5 0.5 240px", textAlign: "center", justifyContent: "center", alignItems: "center"}}
        >
            <img
              style={{
                borderRadius: "10px",
                marginTop: "45px",
                width: "100%",
                height: "auto",
              }}
              src={secondaryImg}
              alt="Imaginecraft screenshot 2"
            />
            <div style={{ marginTop: "20px" }} />
            {/* CTA: open external link in new tab */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="rounded-button" onClick={() => console.log('Button clicked!')}>Analyze Results on GitHub</button>
            </a>

            {/* Optional internal link example */}
        </div>

        {/* Right column: text */}
        <div style={{ flex: "1 1 480px", padding: "20px", textAlign: "left" }}>

            <p><strong>AutoSpriteTransform</strong> is a machine learning model I developed to solve a "super niche" problem: the automatic rotation and scaling of generated weapon sprites such that they'd be ready for Minecraft resource pack injection. The core challenge was training a model to correctly predict the orientation of symmetrical objects, which can confuse standard loss functions.</p>
            <p>To overcome the issue of "midpoint averaging" where the model would predict a neutral angle instead of the correct bimodal targets (e.g., 0 or 180 degrees), I experimented with <strong>custom periodic loss functions</strong> as well as gaussian bumps, different model architectures and training methods. These custom functions were crucial in forcing the model to make definitive predictions, evolving performance from <strong>stagnant to incredibly promising</strong>. The model's architecture was optimized by increasing convolutional layers to enhance feature extraction. The final model was evaluated using a <strong>mAP@N</strong> (mean average precision within N degrees) metric.</p>
            <p>The project also involved a robust data generation pipeline, which utilized a large language model to create a diverse list of sci-fi weapons. These were then used to generate and label a high-quality dataset of images with a Diffusion model.</p>
        
        </div>
      </div>
    </div>
  );
}