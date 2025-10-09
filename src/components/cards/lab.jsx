import React from 'react';
import useScrollThresholdFade from '../jias-react-components/tools/useScrollThresholdFade.jsx';
import TextFader from '../jias-react-components/tools/TextFader.jsx';
import InlinePdf from '../jias-react-components/tools/pdf.jsx';
import AnyFaderInline from '../jias-react-components/tools/AnyFaderInline.jsx';
import HorizontalCycleBar from '../jias-react-components/tools/itemscycle.jsx';
import { m } from 'framer-motion';

export default function LabCard() {
//   const dbh_blob_opacity = useScrollThresholdFade(80, 800, 300);
    const _lab_pics1 = [
      <div className="labpic">
        <img className="labpic_inline" 
        style={{
          width: "100%",
          aspectRatio: "4/3",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_1.jpeg" alt="Lab Pic 1" />
        <p>Our Lab Team</p>
      </div>,
      <div className="labpic">
        <img className="labpic_inline" 
        style={{
          width: "100%",
          aspectRatio: "4/3",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_3.png" alt="Lab Pic 3" />
        <p>Mammalian cell culture in a biocabinet</p>
      </div>,
      <div className="labpic">
        <img className="labpic_inline" 
        style={{
          width: "100%",
          aspectRatio: "4/3",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_4.png" alt="Lab Pic 4" />
        <p>Observing cell health in a microscope</p>
      </div>,
      <div className="labpic">
        <img className="labpic_inline" 
        style={{
          width: "100%",
          aspectRatio: "4/3",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_10.png" alt="Lab Pic 10" />
        <p>Electrophoresis Gel Imaging</p>
      </div>,
    ];

    
    const _lab_pics2 = [
      <div className="labpic" >
        <img className="labpic_inline" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_2.png" alt="Lab Pic 2" />
        <p>Flow Cytometry data (My plasmid cloning was successful!)</p>
      </div>,
      <div className="labpic" >
        <img className="labpic_inline_portrait" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_5.jpg" alt="Lab Pic 5" />
        <p>Electrophoresis on an agarose gel with Ethidium Bromide</p>
      </div>,
      <div className="labpic" >
        <img className="labpic_inline_portrait" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_6.png" alt="Lab Pic 6" />
        <p>Quantitative PCR data. Tight curves demonstrate high data and experimental quality.</p>
      </div>,
      <div className="labpic" >
        <img className="labpic_inline_portrait" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_7.png" alt="Lab Pic 7" />
        <p>Escherichia Coli cultures for plasmid cloning after innoculating the previous day.</p>
      </div>,
      <div className="labpic" >
        <img className="labpic_inline_portrait" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_8.png" alt="Lab Pic 8" />
        <p>Cell cultures of the 38B9 Pro B Cell line</p>
      </div>,
      <div className="labpic" >
        <img className="labpic_inline_portrait" 
        style={{
          width: "100%",
          aspectRatio: "3/4",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          minWidth: "0px",
          minHeight: "0px"
        }} src="/labpic_9.png" alt="Lab Pic 9" />
        <p>Sterile laboratory grade water that looked really refreshing (did not drink though).</p>
      </div>,
    ];

  return (
    <div
      className="glass-effect"
      style={{
        marginTop: "40px",
        width: "90%",
        height: "auto",
        position: "relative",
        // overflow: "hidden",
        alignContent: "center",
        // ...dbh_blob_opacity
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "20px", justifyContent: "center" }}>
        <div className="flex items-start justify-start" style={{ flex: "1 1 350px"}}>
          <div style={{ flex: 1, alignItems: "flex-start"}}>
            <h2 style={{marginTop: "0px"}}>From Bench to Breakthroughs</h2>
            <p>Between 11th and 12th grade, I worked as a co-op lab intern for the Laboratory of Rodney P. DeKoter in the Department of Microbiology and Immunology at Western University. Throughout this term, I completed 3 projects listed below.</p>
            <p>Through my lab experiences, I overcame many challenges. Notably, when I started I was in 11th grade, and had not even take 12th grade biology at the time, let alone university-level life sciences courses. Thus, many concepts were understood by my coworkers but foreign to me which led me to struggle with experiments and make mistakes my peers wouldn't have. However, my struggles weren't in vain: Anything that I didn’t know how to do I learned through determined study and then trial. I overcame hurdles through practice and demonstrated the willingness to learn.</p>
            <p><strong>Published in a paper in the Journal of Immunology.</strong></p>
          </div>
        </div>
        <div style={{ flex: "0.8 0.8 350px", display: "flex", alignContent: "center", justifyContent: "center", textAlign: "center" }}>
          <InlinePdf src="/lab_paper.pdf" height={450} />
        </div>
      </div>


      <div style={{ display: "flex", gap: "20px", padding: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <div className="flex items-start justify-start" style={{ flex: "1 1 350px"}}>            
          <h3>Projects</h3>
              <AnyFaderInline
              items={[
                  <div><p>Plasmid cloning was performed to create a plasmid that had a specific intronic enhancer and a GFP gene. Electrophoresis, PCR, and bacterial cell culture were performed to cleave and ligate DNA strands using restriction enzymes and ligase. Flow cytometry data showed exceptionally high GFP presence in cells which harbored the plasmid versus control cells without the enhancer inserted plasmid, implying proper cloning of both inserts.</p></div>,
                  <div><p>An antibody that recognized a specific transcription factor was tested by immunoblotting using an acrylamide gel. The gel was then imaged and the results showed that the antibody's engineered function was defective.</p></div>,
                  <div><p>Binding sites of a specific B cell transcription factor were tested through Chromatin Immunoprecipitation. A doxycycline induction was performed on a specific 38B9 cell line to induce transcription factor gene expression, and after cell culturing, the cells were sonicated. Chromatin immunoprecipitation was performed, and the purified DNA underwent quantitative PCR to detect binding site presence. This data was used in part for the following paper, and additionally, the DNA underwent <strong>Next Generation Sequencing</strong> to map all binding sites on the genome.</p></div>,
              ]}
              interval={[7000, 5000, 8500]}
              fadeDuration={0.3}
              // heights={[300, 300, 300]}
              />
        </div>
        <div style={{
          flex: "1.2 1.2 350px", 
          // padding: "20px", 
          alignContent: "flex-start", 
          textAlign: "center", 
          justifyContent: "center",
          display: "flex", 
          gap: "20px",
          maxWidth: "57%",
          }}>
            <div style={{flex:1, borderRadius: "12px", minWidth: "0px", minHeight: "0px"}}>
            <HorizontalCycleBar
                        intervalMs={3500}     // wait 2.5s between steps
                        pauseOnHover={false}
                        visibleCount={1}
                        items={_lab_pics1}
                        style={{ width: "100%" }}  // makes bar stretch across full width
                      />
            </div>
            <div style={{flex:0.5625, borderRadius: "12px", minWidth: "0px", minHeight: "0px", display: "flex", alignItems: "flex-start"}}>
            <HorizontalCycleBar // 0.5625 is mathematically because 4/3+3/4 = 0.75+1.333 = 2.08333, (0.75/2.08333)/(1.33333/2.08333) =
                        intervalMs={3500}     // wait 4s between steps
                        pauseOnHover={false}
                        visibleCount={1}
                        items={_lab_pics2}
                        style={{ width: "100%" }}  // makes bar stretch across full width
                      />
            </div>
        {/* </div> */}
        </div>
      </div>
    </div>
  );
}