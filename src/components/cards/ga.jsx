import React from 'react';


export default function GuardianAngel() {
  return (

      <div className="glass-effect" style={{
        marginTop: "40px",
        width: "90%",
        // aspectRatio: "16/10",
        position: "relative",
        overflow: "hidden",
        alignContent: "flex-start",
        textAlign: "center"
      }}>
        <p style={{textAlign: "left", margin: "20px 20px"}}>Featured</p>
        <div style={{ display: "flex", gap: "20px" }}>
        <div className="flex items-start justify-start" style={{ flex: 1, display: "flex-", padding: "20px"}}>
            <div style={{ flex: 1, alignItems: "flex-start"}}>
            <img style={{borderRadius: "10px"}} src="src/assets/ga_1.jpg" alt="Guardian Angel Thumbnail" />
            <img style={{borderRadius: "10px"}} src="src/assets/ga_2.png" alt="Guardian Angel Thumbnail" />
            <p>Cal Hacks 11 | October 2024 | Downtown SF @ The Metreon</p>
            <p style={{margin: "-10px"}}>Hosted by Google and The University of California, Berkeley</p>
            <button className="rounded-button" style={{margin: "20px"}} onClick={() => console.log('Button clicked!')}>Find on Devpost</button>
            </div>
        </div>
        <div style={{ flex: 1, padding: "20px", alignContent: "center" }}>
            <p>Guardian Angel was born from the need for reliable emergency assistance in an unpredictable world. Our experiences with the elderly, such as our grandparents, who may fall when we’re not around, and the challenges we may face in vulnerable situations motivated us to create a tool that automatically reaches out for help when it’s needed most. We aim to empower individuals to feel safe and secure, knowing that assistance is just a call away, even in their most vulnerable moments.</p>
            <p>Core to Guardian Angel is an LLM and text-to-speech pipeline that provides real-time, situation-critical responses to 911 dispatchers. The app will handle the conversation with dispatchers for you when you are unable to. The app automatically detects distress signals — such as falls or other emergencies —and relays essential information like biometric data, medical history, real-time situation and location, enhancing efficiency and improving success in time-sensitive situations where rapid, accurate responses are crucial.</p>
            <p>We developed Guardian Angel using React Native with Expo Go in TypeScript and Python, optimized for rapid prototyping. The FastAPI backend processed endpoints with Google Gemini for voice transcription and Deepgram for audio processing, and accessed accelerometer data and location through geolocating and reverse geocoding.</p>
            <p>This project is the winner for the Google prize track for Most Impactful App, competing against 165 other projects.</p>
        </div>
        </div>
      </div>


  );
}