import React from 'react';
import BackButton from '../components/BackButton';

export default function Privacy() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>Privacy Policy</h1>
      <div className="card" style={{ padding: "30px" }}>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          <strong>Last Updated: {new Date().getFullYear()}</strong>
        </p>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          Welcome to AgroIntel. We value your privacy and are committed to protecting your personal information.
        </p>
        <h2 className="t2" style={{ marginTop: "20px", marginBottom: "10px" }}>Information We Collect</h2>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          We collect information you provide directly to us, such as when you create an account, scan crops, or contact us. This may include your email address, location data for weather services, and photos of crops.
        </p>
        <h2 className="t2" style={{ marginTop: "20px", marginBottom: "10px" }}>How We Use Your Information</h2>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          We use the information we collect to provide, maintain, and improve our services, communicate with you, and personalize your experience.
        </p>
        <div style={{ marginTop: "30px" }}>
          <BackButton label="Back to App" />
        </div>
      </div>
    </div>
  );
}
