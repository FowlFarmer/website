import React from 'react';
import QuestTag from '../experience/QuestIcons.jsx';


export default function GuardianAngel() {
  return (

      <div className="glass-effect" style={{
        marginTop: "40px",
        width: "90%",
        position: "relative",
        // overflow: "hidden",
        height: "auto",
        alignContent: "flex-start",
        textAlign: "center"
      }}>
        <QuestTag type="story" />
        <div style={{ display: "flex", gap: "0px", flexWrap: "wrap", }}>
        {/* The photo column narrower than the text, so the two come out about the same height. */}
        <div className="flex items-start justify-start" style={{ flex: "0.65 1 260px", padding: "20px"}}>
            <div style={{ flex: 1, alignItems: "flex-start"}}>
            <img loading="lazy" decoding="async" style={{borderRadius: "10px", display: "block", width: "60%", margin: "0 auto"}} src="/guardian_angel/ga_1.jpg" alt="Guardian Angel Thumbnail" />
            <img loading="lazy" decoding="async" style={{borderRadius: "10px", display: "block", width: "60%", margin: "25px auto 0"}} src="/guardian_angel/ga_2.webp" alt="Guardian Angel Thumbnail" />
            <p style={{marginTop: "25px"}}>October 2024 | Downtown SF @ The Metreon</p>
            <p style={{margin: "0px"}}>Hosted by Google and UC Berkeley</p>
            <a href="https://devpost.com/software/guardian-angel-op49t2" rel="noopener noreferrer" target="_blank">
            <span className="rounded-button" style={{margin: "20px"}}>Find on Devpost</span>
            </a>
            </div>
        </div>
        <div style={{ flex: "1.35 1 360px", padding: "20px", alignContent: "center", textAlign: "left" }}>
            <p style={{marginTop: "0px"}}>Guardian Angel was born from the need for reliable emergency assistance in an unpredictable world. Our experiences with the elderly, such as our grandparents, who may fall when we’re not around, motivated us to create a tool that automatically reaches out for help when it’s needed most.</p>
            <p>Core to Guardian Angel is an LLM and text-to-speech pipeline that provides real-time, situation-critical responses to 911 dispatchers. The app automatically detects distress signals — such as falls or other emergencies —and relays essential information like biometric data, medical history, real-time situation and location.</p>
            <p>We developed Guardian Angel using React Native with Expo Go in TypeScript and Python. The FastAPI backend processed endpoints with Google Gemini for voice transcription and Deepgram for audio processing.</p>
            <p style={{fontWeight: "bold"}}>This project is the winner for the Google prize track for Most Impactful App, competing against 165 other projects.</p>
        </div>
        </div>
      </div>


  );
}