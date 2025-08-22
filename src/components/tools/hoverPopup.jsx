import React, { useState } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM

const HoverPopupWrapper = ({ children, popupContent }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="hover-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* This renders the child components normally */}
      {children}
      
      {/* Use a Portal to render the popup outside the parent div */}
      {isHovered &&
        ReactDOM.createPortal(
          <div style={{
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-100%, -100%)",
  }} className="popup-box">{popupContent}</div>,
          document.getElementById('popup-root')
        )}
    </div>
  );
};

export default HoverPopupWrapper;