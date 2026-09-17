import React from 'react';
import BackButton from '../components/BackButton';

export default function Contact() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>Contact Us</h1>
      <div className="card" style={{ padding: "30px" }}>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          We would love to hear from you. For support, partnerships, or general inquiries, please contact us at:
        </p>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          <strong>Email:</strong> <a href="mailto:admin@avishkark.in" style={{ color: "var(--green)", textDecoration: "none" }}>admin@avishkark.in</a><br/>
          <strong>WhatsApp:</strong> <a href="https://wa.me/918432884424" target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>+91 84328 84424</a>
        </p>
        <p className="t3" style={{ lineHeight: "1.6" }}>
          We usually reply within 24–48 hours.
        </p>
      </div>
    </div>
  );
}
