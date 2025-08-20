import React, { useState } from 'react';

/**
 * ProjectCard component
 *
 * Renders a single project in the gallery.  Displays a preview
 * image (with simple previous/next controls if multiple images are
 * provided) along with the project title, subtitle, description and
 * an optional call‑to‑action button.
 *
 * Props:
 *   - project: An object from the projects data array.  See
 *     `src/data/projects.js` for the schema.
 */
export default function ProjectCard({ project }) {
  const { title, subtitle, description, images = [], link } = project;
  // State to track which image is currently shown when multiple images exist.
  const [imageIndex, setImageIndex] = useState(0);

  const hasImages = Array.isArray(images) && images.length > 0;
  const currentImage = hasImages ? images[imageIndex] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (!hasImages) return;
    setImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (!hasImages) return;
    setImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="project-card">
      <div className="project-image-wrapper">
        {currentImage ? (
          <img src={currentImage} alt={title} />
        ) : (
          // If there are no images for a project, render a simple placeholder
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontStyle: 'italic',
            }}
          >
            No image available
          </div>
        )}
        {images.length > 1 && (
          <div className="image-controls">
            <button onClick={handlePrev} aria-label="Previous image">
              ‹
            </button>
            <button onClick={handleNext} aria-label="Next image">
              ›
            </button>
          </div>
        )}
      </div>
      <div className="project-content">
        <h2>{title}</h2>
        {subtitle && <h3>{subtitle}</h3>}
        <p>{description}</p>
        {link && (
          <a className="button" href={link} target="_blank" rel="noopener noreferrer">
            Learn more
          </a>
        )}
      </div>
    </div>
  );
}