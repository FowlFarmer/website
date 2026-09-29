// Newest first, as the classic Experience card lists them. `hologram` is the role's tail palette
// in the kitsune scene, from its logo: one colour, or up to three as patches of fur with a
// `share` each, like a cat's coat. Dark colours (black, navy) render as dark glass.
export const experiences = [
  {
    id: 'tesla',
    start: '2026-01',
    company: 'Tesla',
    year: '2026',
    logo: '/work_experience/tesla/tesla_logo.jpeg',
    headline: 'Test Systems Engineering: Optimus Reliability & HV Software Integration',
    dateRange: 'January - April 2026',
    location: 'Sunnyvale, California',
    hologram: ['#ff2238'],
    images: ['/work_experience/tesla/tesla_1.webp', '/work_experience/tesla/tesla_2.webp', '/work_experience/tesla/tesla_3.webp', '/work_experience/tesla/tesla_4.webp', '/work_experience/tesla/tesla_5.webp', '/work_experience/tesla/tesla_6.webp'],
  },
  {
    id: 'watonomous',
    start: '2025-01',
    company: 'WATonomous',
    year: '2025',
    logo: '/work_experience/watonomous/watonomous_logo.jpeg',
    headline: 'Software and Hardware Platforms for Self-Driving Cars',
    dateRange: 'January 2025 - Present',
    location: 'Student Design Team @ University of Waterloo',
    hologram: ['#3fc4e8'],
    images: ['/work_experience/watonomous/watonomous_1.webp'],
  },
  {
    id: 'independent-robotics',
    start: '2025-05',
    company: 'Independent Robotics',
    year: '2025',
    logo: '/work_experience/independent_robotics/independent_robotics_logo.jpeg',
    headline: 'Software Integration for Aquatic Robotics',
    dateRange: 'May - August 2025',
    location: 'Montreal, Quebec',
    hologram: ['#8f8fe6'],
    images: ['/work_experience/independent_robotics/ir_1.webp', '/work_experience/independent_robotics/ir_2.webp'],
  },
  {
    id: 'rapyuta',
    start: '2024-06',
    company: 'Rapyuta Robotics',
    year: '2024',
    logo: '/work_experience/rapyuta/rapyuta_logo.jpeg',
    headline: 'Firmware for Autonomous Storage and Retrieval Systems (ASRS)',
    dateRange: 'June - December 2024',
    location: 'Tokyo, Japan',
    hologram: [{ color: '#ffffff', share: 0.6 }, { color: '#050505', share: 0.3 }, { color: '#ff2331', share: 0.1 }],
    images: ['/work_experience/rapyuta/rapyuta_1.webp', '/work_experience/rapyuta/rapyuta_2.webp'],
  },
];

// The scroll-driven concepts tell the story as it grew: by start date, latest role last.
export const experiencesOldestFirst = [...experiences].sort((a, b) => a.start.localeCompare(b.start));
