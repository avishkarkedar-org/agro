import React from 'react';
import BackButton from '../components/BackButton';

export default function FAQ() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>Frequently Asked Questions</h1>
      <div className="card" style={{ padding: "30px" }}>
        <h2 className="t2" style={{ marginBottom: "10px" }}>Is AgroIntel free to use?</h2>
        <p className="t3" style={{ marginBottom: "20px", lineHeight: "1.6" }}>
          Yes, the core features of AgroIntel are completely free for farmers.
        </p>
        <h2 className="t2" style={{ marginBottom: "10px" }}>How do I access the AI Voice Assistant?</h2>
        <p className="t3" style={{ marginBottom: "20px", lineHeight: "1.6" }}>
          Simply tap the floating microphone icon at the bottom right of the app screen to start speaking.
        </p>
        <h2 className="t2" style={{ marginBottom: "10px" }}>Can I use AgroIntel offline?</h2>
        <p className="t3" style={{ marginBottom: "20px", lineHeight: "1.6" }}>
          AgroIntel works as a Progressive Web App (PWA) and can store certain data offline, but many features like Live Mandi Prices and the AI Voice Assistant require an active internet connection.
        </p>
      </div>
    </div>
  );
}
