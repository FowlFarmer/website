// Newest first, as the classic Experience card lists them. `hologram` is the role's tail palette
// in the kitsune scene, from its logo: one colour, or up to three as patches of fur with a
// `share` each, like a cat's coat. Dark colours (black, navy) render as dark glass. `emphasis`
// tails glow a little brighter. Roles marked `pending` are still waiting on their details, so only
// the kitsune scene shows them.
export const experiences = [
  {
    id: 'tesla-autopilot',
    company: 'Tesla Autopilot',
    region: 'snezhnaya',
    logo: '/work_experience/tesla/tesla_logo.jpeg',
    dateRange: 'Fall 2026',
    headline: 'AI Platforms',
    location: 'Palo Alto, California',
    hologram: ['#ff2238'],
    emphasis: true,
    images: ['/work_experience/tesla_autopilot/tesla_autopilot.webp'],
    // Its photo is square: shown whole, taller than the others' 4:3.
    imageAspect: '1 / 1',
    pending: true,
  },
  {
    id: 'mundane',
    company: 'Mundane',
    region: 'nodKrai',
    logo: '/work_experience/mundane/mundane_logo.svg',
    dateRange: 'August - September 2026',
    headline: 'Controls and software integration for humanoid robots',
    points: [
      'Gravity and friction calibration to make 50 lb arms float weightlessly',
      'Full system bring-up for new prototypes',
      'Forward-deployed support for demos & launch movie shoot',
      'Met the founder of OpenCV, an X influencer with 600k, and OpenAI people',
      "Ate a lot of free food (Zareen's my goat)",
      'Spent a lot of late nights in the office',
    ],
    location: 'Palo Alto, California',
    // Tuxedo cat: mostly black fur with white patches.
    hologram: [{ color: '#050505', share: 0.65 }, { color: '#ffffff', share: 0.35 }],
    images: ['/work_experience/mundane/mundane_1.webp', '/work_experience/mundane/mundane_2.webp', '/work_experience/mundane/mundane_3.webp', '/work_experience/mundane/mundane_food.webp'],
    pending: true,
  },
  {
    id: 'tesla',
    start: '2026-01',
    company: 'Tesla',
    region: 'natlan',
    year: '2026',
    logo: '/work_experience/tesla/tesla_logo.jpeg',
    headline: 'Test Systems Engineering: Optimus Reliability & HV Software Integration',
    points: [
      'Used some clever tricks to build a high-performance pyro controller on constrained hardware',
      'Brought up an Optimus reliability testbench from scratch',
      'Saw some really cool tech',
      'Got some hearing damage',
    ],
    dateRange: 'January - April 2026',
    location: 'Sunnyvale, California',
    hologram: ['#ff2238'],
    emphasis: true,
    images: ['/work_experience/tesla/tesla_1.webp', '/work_experience/tesla/tesla_2.webp', '/work_experience/tesla/tesla_3.webp', '/work_experience/tesla/tesla_4.webp', '/work_experience/tesla/tesla_5.webp', '/work_experience/tesla/tesla_6.webp'],
  },
  {
    id: 'watonomous',
    start: '2025-01',
    company: 'WATonomous',
    // A student design team, so an Interlude Chapter rather than an Archon Quest.
    quest: 'Interlude Chapter',
    year: '2025',
    logo: '/work_experience/watonomous/watonomous_logo.jpeg',
    headline: 'Software and Hardware Platforms for Self-Driving Cars',
    points: [
      'Wrote ROS 2 interfacing nodes',
      'Debugged a lot of faulty boards',
      'Drove a car with an Xbox controller',
    ],
    dateRange: 'January 2025 - Present',
    location: 'Student Design Team @ University of Waterloo',
    hologram: ['#3fc4e8'],
    images: ['/work_experience/watonomous/watonomous_1.webp'],
  },
  {
    id: 'independent-robotics',
    start: '2025-05',
    company: 'Independent Robotics',
    region: 'fontaine',
    year: '2025',
    logo: '/work_experience/independent_robotics/independent_robotics_logo.jpeg',
    headline: 'Software Integration for Aquatic Robotics',
    points: [
      'Swam with some robotic penguins',
      'Did a lot of biking',
      'Drank a lot of free coffee',
    ],
    dateRange: 'May - August 2025',
    location: 'Montreal, Quebec',
    hologram: ['#8f8fe6'],
    images: [
      '/work_experience/independent_robotics/ir_1.webp',
      '/work_experience/independent_robotics/ir_2.webp',
      '/work_experience/independent_robotics/ir_3.jpg',
      '/work_experience/independent_robotics/ir_4.jpg',
      '/work_experience/independent_robotics/ir_5.jpg',
      '/work_experience/independent_robotics/ir_6.jpg',
    ],
  },
  {
    id: 'rapyuta',
    start: '2024-06',
    company: 'Rapyuta Robotics',
    // Its Archon Quest tag's emblem (experience/RegionIcons.jsx).
    region: 'inazuma',
    year: '2024',
    logo: '/work_experience/rapyuta/rapyuta_logo.jpeg',
    headline: 'Firmware for Autonomous Storage and Retrieval Systems (ASRS)',
    points: [
      'Minecraft minecart hopper sorting system IRL',
      'Worked with some really smart people',
      'Missed a lot of last trains',
      'Became an anime protagonist',
    ],
    dateRange: 'June - December 2024',
    location: 'Tokyo, Japan',
    hologram: [{ color: '#ffffff', share: 0.6 }, { color: '#050505', share: 0.3 }, { color: '#ff2331', share: 0.1 }],
    images: [
      '/work_experience/rapyuta/rapyuta_1.webp',
      '/work_experience/rapyuta/rapyuta_2.webp',
      '/work_experience/rapyuta/rapyuta_3.jpg',
      '/work_experience/rapyuta/rapyuta_4.jpg',
      '/work_experience/rapyuta/rapyuta_5.jpg',
      '/work_experience/rapyuta/rapyuta_6.jpg',
    ],
  },
];

// Roles with their details in, for the classic card and the scroll-driven concepts.
export const listedExperiences = experiences.filter((role) => !role.pending);

// The scroll-driven concepts tell the story as it grew: by start date, latest role last.
export const experiencesOldestFirst = [...listedExperiences].sort((a, b) => a.start.localeCompare(b.start));

// The kitsune's tails, left to right = newest to oldest. WATonomous counts as newer than
// Independent Robotics.
export const kitsuneTails = ['tesla-autopilot', 'mundane', 'tesla', 'watonomous', 'independent-robotics', 'rapyuta']
  .map((id) => experiences.find((role) => role.id === id));
