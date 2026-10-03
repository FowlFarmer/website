import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Popup from '../Popup.jsx';
import { closeLore, onLore } from './experienceStage.js';

const LORE = 'Kitsune and gumiho are born with one tail. Gaining tails signify wisdom and come with age.';

// A photo whose width follows its shape (so a row's photos share a height), with its caption over
// its bottom while hovered, and the artist's credit under it if there is one.
function Photo({ src, width, height, alt, caption, credit }) {
  return (
    <figure className="popup-photo" style={{ flexGrow: width / height }}>
      <img src={src} width={width} height={height} alt={alt} decoding="async" />
      <figcaption>
        {caption}
        {credit && (
          <a className="popup-photo-credit" href={credit.href} target="_blank" rel="noopener noreferrer">{credit.label}</a>
        )}
      </figcaption>
    </figure>
  );
}

// The kitsune's lore and its inspiration, in a popup in the middle of the screen: opened by a
// click on him, closed with its × or a click outside it. The lore stands out at the top, beside the
// tutorial mark; the photos sit in two rows below, each photo's width in proportion to its shape so
// a row's photos share a height, uncropped; hovering one shows its caption. While it's open, the
// rest of the page (its cards and the nav) fades away (App.css, body[data-lore]).
export default function KitsuneLore() {
  const [open, setOpen] = useState(false);
  useEffect(() => onLore((at) => setOpen(Boolean(at))), []);
  useEffect(() => {
    if (!open) return undefined;
    document.body.dataset.lore = 'open';
    return () => { delete document.body.dataset.lore; };
  }, [open]);
  if (!open) return null;
  return (
    <Popup onClose={closeLore} className="kitsune-lore" label="Kitsune lore">
      <Link className="popup-close popup-question" to="/lab/kitsune" onClick={closeLore} aria-label="Kitsune scene lab"><img src="/site/domain-icon.png" alt="" /></Link>
      <div className="inspo-title">
        <p className="inspo-title-light">Inspo</p>
      </div>
      <div className="kitsune-lore-callout">
        <img src="/icons/tutorial.webp" width="125" height="128" alt="" />
        <p>{LORE}</p>
      </div>
      <div className="popup-images">
        <Photo src="/kitsune_inspo/ahri.webp" width={1100} height={649} alt="Ahri" caption="Faker is my goat" />
        <Photo src="/kitsune_inspo/selfie.webp" width={750} height={1000} alt="Mirror selfie in the jacket" caption="This jacket off of the T1 store cost me USD 200$ rip" />
      </div>
      <div className="popup-images">
        <Photo src="/kitsune_inspo/kda_ahri.webp" width={1100} height={649} alt="K/DA Ahri" caption="Ahri was my very first League main, I owe her everything. Since then, I've reached Masters 300 LP, and became one of the best NA Gwen OTPS playing exclusively toplane." />
        <Photo src="/kitsune_inspo/yae.webp" width={1100} height={619} alt="Yae Miko" caption="Yae miko was my first fully built 5 star, and still my best-statted character. I somehow got a 52 crit value sands on her!!! (ifykyk)" credit={{ label: 'Art by @shadeofacat', href: 'https://www.instagram.com/shadeofacat/' }} />
      </div>
    </Popup>
  );
}
