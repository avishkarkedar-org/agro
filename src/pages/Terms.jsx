import React from 'react';
import BackButton from '../components/BackButton';

export default function Terms() {
  return (
    <div className="main" style={{ textAlign: "left" }}>
      <BackButton />
      <h1 className="t1" style={{ marginBottom: "20px" }}>Terms & Conditions</h1>
      <div className="card" style={{ padding: "30px" }}>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          <strong>Last Updated: {new Date().getFullYear()}</strong>
        </p>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          These Terms & Conditions govern your use of the AgroIntel application. By accessing or using our services, you agree to be bound by these terms.
        </p>
        <h2 className="t2" style={{ marginTop: "20px", marginBottom: "10px" }}>Use of Service</h2>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          AgroIntel provides agricultural intelligence and tools. The information provided is for educational and informational purposes only and should not be considered professional agronomic advice. We do not guarantee crop yields or outcomes.
        </p>
        <h2 className="t2" style={{ marginTop: "20px", marginBottom: "10px" }}>User Accounts</h2>
        <p className="t3" style={{ marginBottom: "15px", lineHeight: "1.6" }}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. We reserve the right to suspend or terminate accounts that violate these terms.
        </p>
        <div style={{ marginTop: "30px" }}>
          <BackButton label="Back to App" />
        </div>
      </div>
    </div>
  );
}
