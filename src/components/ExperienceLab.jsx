import { experiencesOldestFirst } from '../data/experience.js';
import BranchStory from './experience/BranchStory.jsx';
import PetalTypeStory from './experience/PetalTypeStory.jsx';
import EmaStory from './experience/EmaStory.jsx';
import './experience/experience.css';

// A scratch page for comparing the scroll-driven Experience concepts in the real site.
const CONCEPTS = [
  { id: 'branch', title: '1 · Growing branch', Story: BranchStory },
  { id: 'type', title: '2 · Petal type', Story: PetalTypeStory },
  { id: 'ema', title: '3 · Ema wall', Story: EmaStory },
];

export default function ExperienceLab() {
  return (
    <div className="experience-lab">
      {CONCEPTS.map(({ id, title, Story }) => (
        <div key={id} id={id} className="experience-lab-concept">
          <h2 className="experience-lab-title glass-effect">{title}</h2>
          <Story roles={experiencesOldestFirst} />
        </div>
      ))}
    </div>
  );
}
