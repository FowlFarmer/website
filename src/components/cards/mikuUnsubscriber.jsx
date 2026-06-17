import React from "react";
import HorizontalCycleBarCentered from "../jias-react-components/tools/itemscycleCentered.jsx";

const projects = [
  {
    title: "Miku Explains",
    images: [
      "/miku_explains/add_calendar_functionality.png",
      "/miku_explains/history_list.png",
      "/miku_explains/summarization_functionality.png",
    ],
    alt: "Miku Explains app artwork",
    description:
      "A macOS menu bar helper that turns highlighted text into quick AI cards. It connects to local Hugging Face models through llama.cpp with a custom streaming parser, the Codex CLI, and Gemini API keys stored in Keychain.",
    action: "Download for Mac",
    href: "/miku_explains/Install%20Miku%20Explains.dmg",
    download: true,
  },
  {
    title: "YouTube Subscription Sweeper",
    image: "/unsubscriber/main_ui.png",
    alt: "YouTube Subscription Sweeper logo",
    description:
      "A web tool for loading YouTube subscriptions, filtering them locally with regex, and safely unsubscribing from selected channels with exact-count confirmation. [p.s. the project is yet to be approved by google cloud, so auth looks sketchy]",
    action: "Try it out @ unsubscriber.tzhu.dev",
    href: "https://unsubscriber.tzhu.dev",
  },
];

export default function MikuUnsubscriberCards() {
  const renderProjectImage = (project) => {
    if (project.images) {
      return (
        <HorizontalCycleBarCentered
          intervalMs={3200}
          pauseOnHover={true}
          visibleCount={1}
          items={project.images.map((image) => (
            <img
              key={image}
              src={image}
              alt={project.alt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "right top",
                display: "block",
              }}
            />
          ))}
        />
      );
    }

    return (
      <img
        src={project.image}
        alt={project.alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    );
  };

  return (
    <div
      style={{
        width: "90%",
        marginTop: "40px",
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      {projects.map((project) => (
        <article
          key={project.title}
          className="glass-effect"
          style={{
            flex: "1 1 360px",
            minWidth: 0,
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
              boxSizing: "border-box",
            }}
          >
            <p style={{ margin: "0 0 16px", fontWeight: "bold" }}>{project.title}</p>
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                display: "flex",
                alignItems: project.images ? "flex-start" : "center",
                justifyContent: project.images ? "flex-start" : "center",
                overflow: "hidden",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.04)",
              }}
              className={project.images ? "miku-project-carousel" : undefined}
            >
              {renderProjectImage(project)}
            </div>
            <p style={{ flex: 1 }}>{project.description}</p>
            <a
              href={project.href}
              target={project.download ? undefined : "_blank"}
              rel={project.download ? undefined : "noopener noreferrer"}
              download={project.download ? "Install Miku Explains.dmg" : undefined}
              style={{ alignSelf: "center" }}
            >
              <button className="rounded-button" type="button">
                {project.action}
              </button>
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
