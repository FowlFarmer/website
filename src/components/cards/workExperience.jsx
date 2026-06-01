import React, { useEffect, useState } from 'react';

const experiences = [
  {
    id: 'tesla',
    company: 'Tesla',
    logo: '/jobpics/tesla_logo.jpeg',
    headline: 'Optimus Reliability & HV Software Integration',
    dateRange: 'January - April 2026',
    location: 'Sunnyvale, CA',
    images: ['/jobpics/tesla_1.png', '/jobpics/tesla_2.png', '/jobpics/tesla_3.png', '/jobpics/tesla_4.png', '/jobpics/tesla_5.png', '/jobpics/tesla_6.png'],
  },
  {
    id: 'watonomous',
    company: 'WATonomous',
    logo: '/jobpics/watonomous_logo.jpeg',
    headline: 'Software and Hardware Platforms for Self-Driving Cars',
    dateRange: 'January 2025 - Present',
    location: 'Waterloo, ON',
    images: ['/jobpics/watonomous_1.png'],
  },
  {
    id: 'independent-robotics',
    company: 'Independent Robotics',
    logo: '/jobpics/independent_robotics_logo.jpeg',
    headline: 'Software Integration for Aquatic Robotics',
    dateRange: 'May - August 2025',
    location: 'Location coming soon',
    images: ['/jobpics/ir_1.png', '/jobpics/ir_2.png'],
  },
  {
    id: 'rapyuta',
    company: 'Rapyuta Robotics',
    logo: '/jobpics/rapyuta_logo.jpeg',
    headline: 'Firmware for Autonomous Storage and Retrieval Systems (ASRS)',
    dateRange: 'June - December 2024',
    location: 'Tokyo, Japan',
    images: ['/jobpics/rapyuta_1.png', '/jobpics/rapyuta_2.PNG'],
  },
];

function CyclingImage({ images, alt }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!images?.length || images.length === 1) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % images.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [images]);

  if (!images?.length) {
    return (
      <div
        className="glass-effect"
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.8,
        }}
      >
        <span style={{ color: 'white' }}>Photo coming soon</span>
      </div>
    );
  }

  return (
    <div
      className="glass-effect"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderRadius: '16px',
        aspectRatio: '4 / 3',
        minHeight: '240px',
      }}
    >
      {images.map((src, index) => (
        <img
          key={`${alt}-${index}`}
          src={src}
          alt={`${alt} ${index + 1}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: index === activeIndex ? 1 : 0,
            transition: 'opacity 700ms ease',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.18) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function CompanyBadge({ experience }) {
  const [hasLogoError, setHasLogoError] = useState(false);
  const initials = experience.company
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return (
    <div
      style={{
        position: 'absolute',
        left: '-28px',
        top: '30px',
        width: '18px',
        height: '18px',
        borderRadius: '999px',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 0 0 5px rgba(255, 255, 255, 0.06)',
      }}
      aria-label={experience.company}
      title={experience.company}
    >
      {!hasLogoError ? (
        <img
          src={experience.logo}
          alt=""
          onError={() => setHasLogoError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: 'white',
            display: 'block',
          }}
        />
      ) : (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.45rem',
            fontWeight: 700,
            color: '#111',
            background: 'white',
            pointerEvents: 'none',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export default function WorkExperienceCard() {
  return (
    <div
      className="glass-effect"
      style={{
        margin: '40px auto 0',
        width: '85%',
        maxWidth: '1100px',
        position: 'relative',
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>Experience</h2>
      </div>

      <div style={{ position: 'relative', paddingLeft: '30px' }}>
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '10px',
            bottom: '10px',
            width: '2px',
            background: 'rgba(255, 255, 255, 0.16)',
          }}
        />

        {experiences.map((experience, index) => (
          <div key={experience.id} style={{ position: 'relative', marginBottom: index === experiences.length - 1 ? 0 : '22px' }}>
            <CompanyBadge experience={experience} />

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'stretch',
              }}
            >
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <p style={{ margin: '0 0 6px 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 400 }}>
                  {experience.dateRange}
                </p>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 500 }}>{experience.company}</h3>
                <p style={{ margin: '6px 0 4px 0', fontSize: '0.85rem', fontWeight: 400, opacity: 0.85 }}>{experience.headline}</p>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.78rem', fontWeight: 400 }}>{experience.location}</p>
              </div>

              <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '480px' }}>
                <CyclingImage images={experience.images} alt={experience.company} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}