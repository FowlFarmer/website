import React from 'react';
import useScrollThresholdFade from '../tools/useScrollThresholdFade.jsx';
import TextFader from '../tools/TextFader.jsx';
import InlinePdf from '../tools/pdf.jsx';
import AnyFaderInline from '../tools/AnyFaderInline.jsx';
import HorizontalCycleBar from '../tools/itemscycle.jsx';
import { m } from 'framer-motion';

export default function LabCard() {
//   const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);
    const _lab_pics1 = [
      <div className="labpic">
        <img src="/labpic_1.jpeg" alt="Lab Pic 1" />
        <p>Our Lab Team</p>
      </div>,
    ];
    const _lab_pics2 = [
      <div className="labpic">
        <img className="labpic2" src="/labpic_2.png" alt="Lab Pic 2" />
        <p>Flow Cytometry data (My plasmid cloning was successful!)</p>
      </div>,
    //   <div className="labpic">
    //     <img className="labpic2" src="/labpic_5.jpg" alt="Lab Pic 5" />
    //     <p>Electrophoresis on an agarose gel with Ethidium Bromide</p>
    //   </div>,
    ];

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        height: "1000px",
        position: "relative",
        overflow: "hidden",
        alignContent: "center",
        // ...dbh_blob_opacity
      }}
    >
      <div style={{ display: "flex", gap: "20px" }}>
        <div className="flex items-start justify-start" style={{ flex: 1, padding: "20px" }}>
          <div style={{ flex: 1, alignItems: "flex-start", marginLeft: "20px" }}>
            <h2>From Bench to Breakthroughs</h2>
            <p>Between 11th and 12th grade, I worked initially as a volunteer lab assistant, and then as a co-op lab intern, for the Laboratory of Rodney P. DeKoter in the Department of Microbiology and Immunology at Western University. Throughout this term, I completed 3 projects listed below.</p>
            <p>Through my lab experiences, I overcame many challenges. Notably, when I started I was in 11th grade, and had not even take 12th grade biology at the time, let alone university-level life sciences courses. Thus, many concepts were understood by my coworkers but foreign to me which led me to struggle with experiments and make mistakes my peers wouldn't have. However, my struggles weren't in vain: Anything that I didn’t know how to do I learned through determined study and then trial. I overcame hurdles through practice and demonstrated the willingness to learn.</p>
            <p><strong>Published in a paper in the Journal of Immunology.</strong></p>
          </div>
        </div>
        <div style={{ flex: 0.8, padding: "20px", alignContent: "center", textAlign: "center" }}>
          <InlinePdf src="/lab_paper.pdf" height={450} />
        </div>
      </div>


      <div style={{ display: "flex", gap: "20px" }}>
        <div className="flex items-start justify-start" style={{ flex: 1, padding: "20px" }}>
          <div style={{ flex: 0.6, alignItems: "flex-start", marginLeft: "20px" }}>
            <h3>Projects</h3>
            <div style={{height: "500px", marginTop: "10px", overflow: "hidden"}}>
                <AnyFaderInline
                items={[
                    <div><p>Plasmid cloning was performed to create a plasmid that had a specific intronic enhancer and a GFP gene. Electrophoresis, PCR, and bacterial cell culture were performed to cleave and ligate DNA strands using restriction enzymes and ligase. Flow cytometry data showed exceptionally high GFP presence in cells which harbored the plasmid versus control cells without the enhancer inserted plasmid, implying proper cloning of both inserts.</p></div>,
                    <div><p>An antibody that recognized a specific transcription factor was tested by immunoblotting using an acrylamide gel. The gel was then imaged and the results showed that the antibody's engineered function was defective.</p></div>,
                    <div><p>Binding sites of a specific B cell transcription factor were tested through Chromatin Immunoprecipitation. A doxycycline induction was performed on a specific 38B9 cell line to induce transcription factor gene expression, and after cell culturing, the cells were sonicated. Chromatin immunoprecipitation was performed, and the purified DNA underwent quantitative PCR to detect binding site presence. This data was used in part for the following paper, and additionally, the DNA underwent <strong>Next Generation Sequencing</strong> to map all binding sites on the genome.</p></div>,
                ]}
                interval={[7000, 5000, 8500]}
                fadeDuration={0.3}
                heights={[300, 300, 300]}
                />
            </div>
          </div>
        </div>
        <div style={{ flex: 0.7, padding: "10px 10px 0px 0px", alignContent: "flex-start", textAlign: "center" }}>
            <div
          style={{
            height: "350px",
            width: "100%",             // fill width
            display: "flex",
            alignItems: "flex-start",      // vertical center
            justifyContent: "center",  // horizontal center (if you want it centered horizontally too)
            overflow: "hidden",
            borderRadius: "12px",
            marginTop: "70px",
          }}
        >

            <HorizontalCycleBar
                        intervalMs={2500}     // wait 2.5s between steps
                        pauseOnHover={false}
                        visibleCount={1}
                        items={_lab_pics1}
                        style={{ width: "100%" }}  // makes bar stretch across full width
                      />
        </div>
        </div>
        <div style={{ flex: 0.083, padding: "10px 20px 0px 0px", alignContent: "flex-start", textAlign: "center" }}>
            <div
          style={{
            height: "350px",
            width: "100%",             // fill width
            display: "flex",
            alignItems: "flex-start",      // vertical center
            justifyContent: "center",  // horizontal center (if you want it centered horizontally too)
            overflow: "hidden",
            borderRadius: "12px",
            marginTop: "70px",
          }}
        >

            <HorizontalCycleBar
                        intervalMs={2500}     // wait 2.5s between steps
                        pauseOnHover={false}
                        visibleCount={1}
                        items={_lab_pics2}
                        style={{ width: "100%" }}  // makes bar stretch across full width
                      />
        </div>
        </div>
      </div>
    </div>
  );
}