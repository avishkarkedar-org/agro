import React from 'react';
import BackButton from '../components/BackButton';

export default function Changelog() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>Changelog</h1>
      <div className="card" style={{ padding: "30px" }}>
        <h2 className="t2" style={{ marginBottom: "10px" }}>Version 2.0.0</h2>
        <ul className="t3" style={{ marginBottom: "20px", lineHeight: "1.6", paddingLeft: "20px" }}>
          <li>Added new SaaS-grade website routing (About, Contact, FAQ, Changelog).</li>
          <li>Upgraded Authentication Security with Cloudflare Turnstile CAPTCHA.</li>
          <li>Refined UI components with full glassmorphism design.</li>
          <li>Removed the Gmail-only restriction for user signups.</li>
        </ul>
        <h2 className="t2" style={{ marginBottom: "10px" }}>Version 1.0.0</h2>
        <ul className="t3" style={{ marginBottom: "20px", lineHeight: "1.6", paddingLeft: "20px" }}>
          <li>Initial release of AgroIntel platform.</li>
          <li>Live Weather and Mandi Prices integration.</li>
          <li>AI Voice Assistant and Soil Health Planner introduced.</li>
        </ul>
      </div>
    </div>
  );
}
