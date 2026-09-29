import KitsuneScene from './experience/KitsuneScene.jsx';
import KitsuneNotes from './experience/KitsuneNotes.jsx';
import KitsuneLore from './experience/KitsuneLore.jsx';

// Test page for the kitsune scene, full screen with the test panel, and a card on how it was built.
export default function KitsuneLab() {
  return (
    <div className="kitsune-lab">
      <div className="kitsune-page">
        <KitsuneScene />
        <KitsuneNotes />
      </div>
      <KitsuneLore />
    </div>
  );
}
