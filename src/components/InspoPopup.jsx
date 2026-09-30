import { useEffect, useState } from 'react';
import Popup from './Popup.jsx';
import { closeInspo, onInspo } from './lawsonStage.js';
import { onSoundChange, soundOn } from './soundSetting.js';

// The FamilyMart door chime, played from the start each time the popup opens with sound on
// (soundSetting.js), and stopped when it closes or sound goes off. Only desktop opens the popup
// (a click on the store; phones never do, CherryBlossomScene.jsx).
const CHIME_URL = '/sounds/fami-mart.mp3';
// The recording is mastered loud: played well below full volume, under the page's other sounds.
const CHIME_VOLUME = 0.25;
let chime = null;

function playChime() {
  if (!soundOn()) return;
  chime ??= Object.assign(new Audio(CHIME_URL), { volume: CHIME_VOLUME });
  chime.currentTime = 0;
  chime.play().catch(() => {});
}

function stopChime() {
  chime?.pause();
}

// The Lawson scene's inspiration, the Fujikawaguchiko Lawson under Mt Fuji, the bike photo and the
// lavender field, in a popup in the middle of the screen: opened by a click on the store or the
// rider, closed with its × or a click outside it, with the FamilyMart chime above.
export default function InspoPopup() {
  const [open, setOpen] = useState(false);
  useEffect(() => onInspo(setOpen), []);
  useEffect(() => {
    if (!open) return undefined;
    playChime();
    const stopListening = onSoundChange((on) => { if (!on) stopChime(); });
    return () => {
      stopListening();
      stopChime();
    };
  }, [open]);
  if (!open) return null;
  return (
    <Popup onClose={closeInspo} className="inspo-popup" label="Fujikawaguchiko inspo">
      <div className="inspo-title">
        <p>Fujikawaguchiko</p>
        <p>Inspo</p>
      </div>
      {/* Hovering the photos hides them and shows the note in their place, in the middle. */}
      <div className="popup-images inspo-photos">
        <p className="inspo-note">I visited Fujikawaguchiko in 2024 with friends (but it was really cloudy so I couldn't see the peak, sadge)</p>
        <img src="/inspo/lawson_inspo.webp" width="1400" height="932" style={{ flexGrow: 1.502 }} alt="The Lawson in Fujikawaguchiko with Mt Fuji behind it" decoding="async" />
        <img src="/inspo/bike_inspo.webp" width="700" height="935" style={{ flexGrow: 0.749 }} alt="Standing with a bike at night" decoding="async" />
        <img src="/inspo/fujikawaguchiko_lavender.webp" width="700" height="933" style={{ flexGrow: 0.75 }} alt="Arms out in a lavender field at Fujikawaguchiko" decoding="async" />
      </div>
    </Popup>
  );
}
