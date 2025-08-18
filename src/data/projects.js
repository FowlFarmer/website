/*
 * Project data for the portfolio gallery.
 *
 * Each entry in the exported `projects` array represents a single project
 * showcased on the original Weebly gallery page.  The fields include:
 *
 *   - id: a unique identifier used for React keying.
 *   - title: the primary heading for the card.
 *   - subtitle: a short tagline or contextual note.
 *   - description: a concise summary of the project.  Wherever possible
 *     the description draws directly from the original page and includes
 *     citations back to the source in the final answer.
 *   - images: an array of image URLs.  If more than one image is
 *     provided the ProjectCard component will display navigation arrows
 *     allowing the user to cycle through them.  The images come from
 *     publicly accessible resources on the Weebly site (e.g. uploaded
 *     screenshots) or YouTube thumbnails when a video was embedded.
 *   - link: an optional URL pointing to more information, such as a
 *     Devpost entry or a GitHub repository.  If omitted, no call‑to‑action
 *     button will be shown.
 */

const projects = [
  {
    id: 'guardian-angel',
    title: 'Guardian Angel',
    subtitle: 'Cal Hacks 11 Winning Project',
    description:
      'Guardian Angel is an emergency‑assistance app designed to call for help when the user can’t. It uses a large language model and text‑to‑speech pipeline to talk with 911 dispatchers, automatically detects distress signals like falls, and relays critical data such as biometric information, medical history and location. The team built it with React Native, Expo Go and TypeScript on the frontend and Python with FastAPI, Google Gemini and Deepgram on the backend; the project won the Google prize track for most impactful app at Cal Hacks 11【846288539101280†L44-L67】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/gallery_orig.jpg',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/cal-hacks_orig.png',
    ],
    link: 'https://devpost.com/software/guardian-angel-op49t2',
  },
  {
    id: 'gerb-ii',
    title: 'Gerb II: Electric Boogaloo',
    subtitle: 'Simulated Differential Drive Robot',
    description:
      'Gerb II is a containerised ROS2 navigation system built from modular nodes for path planning, costmap generation, control and map memory.  It employs robotics algorithms such as A* pathfinding with risk‑aware heuristics, obstacle inflation, Bresenham’s line for ray tracing and pure pursuit control.  LIDAR data are processed into local and global maps, enabling obstacle avoidance and smooth trajectory execution; the project is fully containerised with Docker and simulated via Foxglove【846288539101280†L73-L80】.',
    images: [
      // Use the thumbnail from the YouTube demo and a generic fallback from the gallery
      'https://img.youtube.com/vi/LWBjHgwYJAU/hqdefault.jpg',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/images_orig.png',
    ],
    link: 'https://github.com/FowlFarmer/wato_asd_project',
  },
  {
    id: 'rapyuta-intern',
    title: 'Robotics Software Intern',
    subtitle: 'Rapyuta Robotics, Tokyo',
    description:
      'During a seven‑month internship in Tokyo I worked as a robotics software intern at Rapyuta Robotics.  Living in a vibrant city and collaborating with talented colleagues, I helped build amazing things and gained first‑hand experience in the robotics industry; more updates on this experience are coming soon【846288539101280†L85-L87】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/1695085220241.jpeg',
    ],
    link: null,
  },
  {
    id: 'firmware-development',
    title: 'Firmware Development',
    subtitle: 'Electric Skateboard Team',
    description:
      'As part of an electric skateboard team I developed microcontroller and brushless motor firmware.  The work involved embedded communications over UART and CAN, writing C++ with PlatformIO, interfacing via I2C and working with GO FOC/DV4, ESP, Arduino and VESC hardware.  We even built a battery harness by spot‑welding nickel plates onto 18650 lithium cells and 3D‑printed a custom casing to support the battery and microcontroller harness【846288539101280†L91-L122】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-01-13-at-5-57-56-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-01-13-at-6-16-45-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-01-13-at-5-55-27-pm_orig.png',
    ],
    link: null,
  },
  {
    id: 'gerb',
    title: 'Gerb the ROS‑bot',
    subtitle: 'Home Security Robot',
    description:
      'Gerb is a fast ROS‑powered robot built with ROS Melodic and C++ on an NVIDIA Jetson Nano with an Arduino microcontroller.  It can set and verify passwords, detect door openings using ultrasound and IR remote control, drive autonomously with wall detection and serve as a sentry with an alarm and glitter bomb.  The robot has a cute face and runs off a 2000 mAh LiPo battery; planned upgrades include voice recognition and OpenCV integration【846288539101280†L126-L137】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-02-13-at-10-01-29-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-02-13-at-10-04-01-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-02-13-at-10-04-18-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-02-13-at-10-06-22-pm_orig.png',
    ],
    link: null,
  },
  {
    id: 'lab-internship',
    title: 'Laboratory Internship',
    subtitle: 'Dept. of Microbiology & Immunology, Western University',
    description:
      'Between grade 11 and grade 12 I worked as a volunteer and then co‑op intern in the laboratory of Rodney P. DeKoter.  Despite not yet having taken university‑level biology, I learned quickly and overcame many challenges; the research we carried out was later published in the Journal of Immunology【846288539101280†L155-L166】.  My projects included: (1) plasmid cloning to create an intronic enhancer–GFP plasmid followed by electrophoresis, PCR and bacterial culture and confirmed with flow cytometry; (2) testing an engineered antibody via immunoblotting on an acrylamide gel; and (3) identifying binding sites of a B cell transcription factor using chromatin immunoprecipitation with doxycycline induction, sonication, qPCR and next‑generation sequencing【846288539101280†L169-L189】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/published/labphoto6.jpeg?1707870959',
    ],
    link: 'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/ji2300122.pdf',
  },
  {
    id: 'shoebill',
    title: 'Shoebill',
    subtitle: 'Gaming Biometrics & Mental Health Tracker',
    description:
      'Shoebill is a web application that tracks, detects and documents gaming addiction.  It measures mental stability, mood and emotions while you play by interfacing with Hume AI’s voice and facial‑expression classifier and Zepp smartwatch biometric data.  The project earned an Honorable Mention from Cal Hacks sponsor Zepp Health and was built with Python, Django, Mediapipe, OpenCV, Vite, React, MySQL and multithreading, along with Hume and Zepp APIs【846288539101280†L244-L249】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/editor/screenshot-2024-01-23-at-11-35-40-pm.png?1706071165',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/7351179_orig.png',
    ],
    link: 'https://devpost.com/software/discovervoice',
  },
  {
    id: 'breathmentor',
    title: 'BreathMentor',
    subtitle: 'Wearable Breathing Monitor',
    description:
      'BreathMentor is a wearable device that helps patients with Guillain–Barré syndrome by tracking the volume of each breath.  It calculates breathing volume using the ideal gas law, the piezoresistivity law and the linear elasticity law applied to a piezoresistive stretch sensor.  The goal is to improve electronic health records and detect disease progression; the hardware was designed in OnShape and Blender and built with C++, C, the STM32 HAL library, CubeIDE, I2C and an LCD【846288539101280†L258-L266】【846288539101280†L267-L268】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/screenshot-2024-01-12-at-3-37-55-pm_orig.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/gif2_orig.gif',
    ],
    link: 'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/designdocument.pdf',
  },
  {
    id: 'hosa',
    title: 'HOSA London Central Chapter Executive',
    subtitle: 'Executive & FLC 2nd Place',
    description:
      'I founded and organized a Canadian HOSA chapter that grew to over 90 members.  In this role I mentored students, delivered study sessions and lectures on medical and life sciences, and led members to national and international competitions.  I competed in both the Fall and Spring Leadership Conferences and achieved second place in the Canadian national Fall Leadership Conference【311656601165521†L3071-L3074】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/published/hosalogo_1.png',
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/img-1310_1_orig.jpg',
    ],
    link: null,
  },
  {
    id: 'preservia',
    title: 'preservia.tech',
    subtitle: 'Fridge Tracker & Grocery Categoriser',
    description:
      'Preservia.tech helps busy students keep track of their groceries by cataloguing food items and monitoring expiry dates.  Users can photograph receipts or their fridge and the AI will recognise items, estimate expiry dates and build an easy‑to‑use inventory.  A recipe suggestion feature recommends dishes based on selected ingredients so you can cook delicious meals with what you already have【311656601165521†L3166-L3167】.',
    images: [
      'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/original_orig.png',
    ],
    link: 'https://devpost.com/software/expierly',
  },
  {
    id: 'automatic-bed-maker',
    title: 'Automatic Bed Maker',
    subtitle: 'Bed‑Making Device',
    description:
      'This prototype automates the chore of making your bed.  Four nodes mounted at each corner use motors and geared spools to pull cords attached to the blanket; one button command pulls the blanket tight and then reverses to let you sleep comfortably.  Building the system revealed unexpected challenges: stepper motors produced lower torque than anticipated, and friction from pillows made the mechanism unreliable.  The project was built with C++, C, Blender, Prusa, STM32, the HAL library and Cube IDE【846288539101280†L339-L353】.',
    images: [
      'https://img.youtube.com/vi/qP-S0vukCM4/hqdefault.jpg',
    ],
    link: 'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/ieee_conference_template__4_.pdf',
  },
  {
    id: 'cpp-gallery',
    title: 'C++ Project Gallery',
    subtitle: 'Mo Money & Geesespotter',
    description:
      'This gallery showcases two C++ projects.  Mo Money implements a linked‑list based algorithm to compute capital gains and losses of an exchange‑traded fund using the Adjusted Cost Base method, relying on dynamic memory allocation and tested to ensure no leaks.  Geesespotter is a Southwestern Ontario twist on Minesweeper that tracks angry Canadian geese via their droppings【846288539101280†L431-L439】.',
    images: [],
    link: null,
  },
  {
    id: 'ethics-paper',
    title: 'Ethereum Health Records: Ethical Analysis',
    subtitle: 'Research Paper',
    description:
      'As blockchain technology matures it has profound implications beyond finance.  In this paper I analyse how Ethereum could impact electronic health records and explore the ethical issues that arise when decentralised ledgers meet sensitive medical data【846288539101280†L469-L474】.',
    images: [],
    link: 'https://portfoliotheodore.weebly.com/uploads/1/4/8/3/148311852/ieee_conference_template__4_.pdf',
  },
];

export default projects;