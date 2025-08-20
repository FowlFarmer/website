import React from "react";
import "./CircleCluster.css";

export default function Circle({ body, isHovered, onHoverStart, onHoverEnd, extraInfo }) {
  const r = body.circleRadius;

  return (
    <div
      className={`circle ${isHovered ? "hovered" : ""}`}
      style={{
        left: body.position.x - r,
        top: body.position.y - r,
        width: r * 2,
        height: r * 2,
        transform: isHovered ? "scale(1.05)" : "scale(1)", // slight visual scaling, optional
      }}
      onMouseEnter={() => onHoverStart(body.id)}
      onMouseLeave={() => onHoverEnd(body.id)}
    >
      {extraInfo && <div className="circle-extra">{extraInfo}</div>}
    </div>
  );
}
