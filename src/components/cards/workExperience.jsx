import React, { useEffect, useState } from 'react';

const experiences = [
  {
    id: 'tesla',
    company: 'Tesla',
    logo: '/jobpics/tesla_logo.jpeg',
    headline: 'Test Systems Engineering: Optimus Reliability & HV Software Integration',
    dateRange: 'January - April 2026',
    location: 'Sunnyvale, California',
    images: ['/jobpics/tesla_1.png', '/jobpics/tesla_2.png', '/jobpics/tesla_3.png', '/jobpics/tesla_4.png', '/jobpics/tesla_5.png', '/jobpics/tesla_6.png'],
  },
  {
    id: 'watonomous',
    company: 'WATonomous',
    logo: '/jobpics/watonomous_logo.jpeg',
    headline: 'Software and Hardware Platforms for Self-Driving Cars',
    dateRange: 'January 2025 - Present',
    location: 'Student Design Team @ University of Waterloo',
    images: ['/jobpics/watonomous_1.png'],
  },
  {
    id: 'independent-robotics',
    company: 'Independent Robotics',
    logo: '/jobpics/independent_robotics_logo.jpeg',
    headline: 'Software Integration for Aquatic Robotics',
    dateRange: 'May - August 2025',
    location: 'Montreal, Quebec',
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
    if (!images?.length || images.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % images.length);
    }, 2800);
    return () => clearInterval(id);
  }, [images]);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: '10px', overflow: 'hidden' }}>
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${alt} ${i + 1}`}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            opacity: i === activeIndex ? 1 : 0,
            transition: 'opacity 700ms ease',
          }}
        />
      ))}
    </div>
  );
}

function LogoBadge({ logo, company }) {
  const [err, setErr] = useState(false);
  const initials = company.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '999px',
      overflow: 'hidden', flexShrink: 0,
      background: 'white', border: '1px solid rgba(255,255,255,0.2)',
    }}>
      {!err
        ? <img src={logo} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '0.5rem', fontWeight: 700, color: '#111' }}>{initials}</span>
      }
    </div>
  );
}

export default function WorkExperienceCard() {
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
      }}
    >
      <div style={{ padding: "24px" }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 28px 0' }}>Experience</h2>

        <div style={{ position: 'relative', paddingLeft: '42px' }}>
          <div
            style={{
              position: 'absolute',
              left: '19px',
              top: '18px',
              bottom: '18px',
              width: '2px',
              background: 'rgba(255,255,255,0.15)',
            }}
          />

          {experiences.map((exp, index) => (
            <div
              key={exp.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '22px',
                padding: '16px 0',
                minHeight: '144px',
                borderBottom: index === experiences.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ position: 'absolute', left: '-36px', top: '50%', transform: 'translateY(-50%)' }}>
                <LogoBadge logo={exp.logo} company={exp.company} />
              </div>

              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.48)', fontWeight: 400 }}>
                  {exp.dateRange}
                </p>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.14rem', fontWeight: 500 }}>
                  {exp.company}
                </h3>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.92rem', lineHeight: 1.4, opacity: 0.82, fontWeight: 400 }}>
                  {exp.headline}
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.48)', fontWeight: 400 }}>
                  {exp.location}
                </p>
              </div>

              <div style={{ flex: '0 0 208px', width: '208px', marginLeft: 'auto' }}>
                <CyclingImage images={exp.images} alt={exp.company} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
