import { useEffect, useState } from 'react';
import Popup from './Popup.jsx';
import { closeInspo, onInspo } from './lawsonStage.js';

// The Lawson scene's inspiration, the Fujikawaguchiko Lawson under Mt Fuji, the bike photo and the
// lavender field, in a popup in the middle of the screen: opened by a click on the store or the
// rider, closed with its × or a click outside it.
export default function InspoPopup() {
  const [open, setOpen] = useState(false);
  useEffect(() => onInspo(setOpen), []);
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
