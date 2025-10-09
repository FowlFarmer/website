// SmallProjectsCard.jsx
import React from 'react';
import TextFader from '../jias-react-components/tools/TextFader.jsx';
import AnyFader from '../jias-react-components/tools/AnyFader.jsx';
import HorizontalCycleBar from '../jias-react-components/tools/itemscycle.jsx';
import InlinePdf from '../jias-react-components/tools/pdf.jsx';

export default function Test() {

  const _items = [
    // ---- Item 1: BreathMentor
    <div>hi</div>,
    <div>
      <p>hello</p>
      <p>hello</p>
      <p>hello</p>
      <p>hello</p>
      <p>hello</p>
      <p>hello</p>
    </div>,
  ];

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AnyFader
        // interval={[5000, 5000, 3500]}
        items={_items}
        // no heights prop needed anymore
      />
    </div>
  );
}