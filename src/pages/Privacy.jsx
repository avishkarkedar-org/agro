import React from 'react';
import BackButton from '../components/BackButton';

export default function Privacy() {
  return (
    <div className="main" style={{ textAlign: "left", maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
      <BackButton label="Back to Home" />
      
      <div style={{ marginBottom: "28px" }}>
        <h1 className="t1" style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px", color: "var(--text)" }}>
          Privacy Policy
        </h1>
        <p className="t3" style={{ fontSize: "14px", color: "var(--t2)" }}>
          <strong>Effective Date:</strong> January 1, 2026 &nbsp;|&nbsp; <strong>Last Updated:</strong> September 2026
        </p>
      </div>

      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <h2 className="t2" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--green)" }}>
          1. Introduction &amp; Commitment to Farmers
        </h2>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "12px" }}>
          At <strong>AgroIntel</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), protecting the privacy and personal data of Indian farmers and agricultural practitioners is our fundamental priority. This Privacy Policy outlines what information we collect, how it is processed, and how we safeguard your agricultural and personal data.
        </p>
        <p className="t3" style={{ lineHeight: "1.7" }}>
          <strong>Key Guarantee:</strong> We do NOT sell, rent, monetize, or share your personal details, farm records, or financial entries with third-party advertisers or data brokers.
        </p>
      </div>

      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <h2 className="t2" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--blue)" }}>
          2. Information We Collect
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
              a. Crop Disease Photos &amp; Agronomic Inquiries
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              When you use the AI Plant Doctor leaf scanner or crop planner, photos of affected crop leaves and query text are sent to our inference engine to compute diagnostic results. Diagnostic photos are processed ephemerally and are never sold.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
              b. Geographic Location Data
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              With your explicit permission, we access device GPS coordinates solely to provide hyper-local Open-Meteo weather forecasts, spray window calculations, and nearby APMC mandi rate discovery. Location data is never logged to track your physical movement.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
              c. Push Notification Tokens
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              If you subscribe to Mandi Price Target alerts, your browser generates a unique OneSignal push subscription token to send alerts specifically to that device. You can unsubscribe or revoke notification permissions anytime.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
              d. Marketplace &amp; Community Contributions
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Posts created in the Krishi Market (produce sales, equipment rentals, questions) and contact phone numbers provided in listings are displayed publicly to facilitate direct farmer-to-farmer trade.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <h2 className="t2" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--orange)" }}>
          3. Local Storage &amp; Offline Data Privacy
        </h2>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "12px" }}>
          To ensure reliability in rural areas with intermittent connectivity, AgroIntel utilizes your browser's local storage (LocalStorage and Cache Storage) to store:
        </p>
        <ul style={{ paddingLeft: "20px", fontSize: "14px", lineHeight: "1.7", color: "var(--text)" }}>
          <li>Language preferences (Hindi, Marathi, English) and UI display theme.</li>
          <li>Offline Krishi Ledger expense and income records.</li>
          <li>Locally cached mandi rate and weather snapshots.</li>
        </ul>
        <p className="t3" style={{ lineHeight: "1.7", marginTop: "12px" }}>
          This data remains resident on your physical device and can be cleared at any time by resetting your browser site data or logging out.
        </p>
      </div>

      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <h2 className="t2" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--purple)" }}>
          4. Device Permissions Explained
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
          <div>
            <strong>📷 Camera:</strong> Used exclusively for real-time plant leaf disease scanning within the AI Plant Doctor feature.
          </div>
          <div>
            <strong>🎙️ Microphone:</strong> Used exclusively when actively speaking to the Multilingual AI Voice Assistant. Audio is not recorded or stored in the background.
          </div>
          <div>
            <strong>📍 Location:</strong> Used solely to fetch current weather conditions and localized APMC mandi pricing.
          </div>
          <div>
            <strong>🔔 Notifications:</strong> Used only to alert you when your specified Mandi commodity hits your target price.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "28px", borderRadius: "18px" }}>
        <h2 className="t2" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--cyan)" }}>
          5. Contact &amp; Data Deletion Requests
        </h2>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "14px" }}>
          If you have questions regarding this Privacy Policy, wish to exercise your data access rights, or request permanent deletion of your account and market posts, please contact us:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
          <div>
            <strong>Email:</strong>{' '}
            <a href="mailto:admin@avishkark.in" style={{ color: "var(--green)", textDecoration: "none" }}>
              admin@avishkark.in
            </a>
          </div>
          <div>
            <strong>WhatsApp Support:</strong>{' '}
            <a href="https://wa.me/918432884424" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>
              +91 84328 84424
            </a>
          </div>
        </div>
        <div style={{ marginTop: "24px" }}>
          <BackButton label="Back to App" />
        </div>
      </div>
    </div>
  );
}
