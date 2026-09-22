import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function CosplayCard() {
    const [lightbox, setLightbox] = useState(null);
    const openerRef = useRef(null);

    const images = [ // 1 - 12
      "/cosplay/scissors.jpg",
      "/cad/lance1.jpg",
      "/cad/lance2.webp",
      "/cad/wallboard.jpg",
      "/cosplay/cosplay_1.jpg",
      "/cosplay/cosplay_2.jpg",
      "/cosplay/cosplay_3.jpg",
      "/cosplay/cosplay_4.jpg",
      "/cosplay/cosplay_5.jpg",
      "/cosplay/cosplay_6.jpg",
      "/cosplay/cosplay_7.jpg",
      "/cosplay/cosplay_8.jpg",
      "/cosplay/cosplay_9.jpg",
      "/cosplay/cosplay_10.jpg",
      "/cosplay/cosplay_11.jpg",
      "/cosplay/cosplay_12.jpg",
    ];
  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        // height: "400px",
        position: "relative",
        // overflow: "hidden",
        
      }}
    >
      {/* <div style={{ display: "flex", flexWrap: "wrap", width: "80%", gap: "20px", alignContent: "flex-start", */}
        {/* justifyContent: "center", }}> */}
        <div className="flex items-start justify-start" style={{ textAlign: "center", flex: "1 1 100px"}}>
            <h2>Cosplay Gallery</h2>
        </div>
        <div className="flex items-start justify-start" style={{ textAlign: "center", flex: "1 1 100px", margin: "0px 10px"}}>
            <p>tl/dr: big anime/manga fan, went to some cons, and found out cosplay is super fun.</p>
            <p>I also enjoy modelling, 3D printing and crafting my own cosplay props.</p>
        </div>
        {/* </div> */}

        
        <div className="cosplay-grid">
          {images.map((src, idx) => (
            <button key={src} type="button" className="cosplay-thumbnail" aria-label={`Enlarge cosplay photo ${idx + 1}`} onClick={event => { openerRef.current = event.currentTarget; setLightbox(src); }}>
              <img src={src} alt={`Cosplay and handmade props ${idx + 1}`} className="cosplay-item" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
        {lightbox && <PhotoDialog opener={openerRef.current} src={lightbox} onClose={() => setLightbox(null)} />}



    </div>
  );
}
function PhotoDialog({ src, onClose, opener }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; opener?.focus({ preventScroll: true }); };
  }, [opener]);
  return createPortal(
    <dialog ref={dialogRef} className="photo-dialog" aria-label="Expanded cosplay photo" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <button type="button" className="photo-dialog-close" onClick={onClose} aria-label="Close photo" autoFocus>×</button>
      <img src={src} alt="Expanded cosplay and handmade props" />
    </dialog>, document.body
  );
}
