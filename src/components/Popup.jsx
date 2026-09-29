import { createPortal } from 'react-dom';

// A popup in the middle of the screen, over an invisible layer that closes it when clicked
// anywhere outside; or closed with the × in its corner. It renders at the top of the page (a
// portal), so no layer it's opened from, such as the page content, can hold it under the nav.
export default function Popup({ onClose, className = '', label, children }) {
  return createPortal(
    <>
      <div className="popup-backdrop" onClick={onClose} aria-hidden="true" />
      <div className={`popup ${className}`} role="dialog" aria-label={label}>
        <button type="button" className="popup-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </>,
    document.body,
  );
}
