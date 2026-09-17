import React from 'react';
import BackButton from '../components/BackButton';

export default function About() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>About AgroIntel</h1>
      <div className="card" style={{ padding: "30px" }}>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          AgroIntel is a smart farming intelligence platform built to empower modern agriculture.
          Our mission is to provide cutting-edge technological tools to farmers, optimizing yield, minimizing waste, and supporting sustainable practices.
        </p>
      </div>
    </div>
  );
}
