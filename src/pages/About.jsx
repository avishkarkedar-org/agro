import React from 'react';
import BackButton from '../components/BackButton';

export default function About() {
  return (
    <div className="main" style={{ textAlign: "left", maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
      <BackButton label="Back to Home" />
      
      <div style={{ marginBottom: "28px" }}>
        <h1 className="t1" style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px", color: "var(--text)" }}>
          About AgroIntel
        </h1>
        <p className="t3" style={{ fontSize: "15px", color: "var(--t2)", lineHeight: 1.6 }}>
          Next-Generation AI &amp; Agricultural Intelligence Platform empowering Indian farmers with real-time agronomic insights.
        </p>
      </div>

      {/* Mission Section */}
      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "26px" }}>🌱</span>
          <h2 className="t2" style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Our Mission &amp; Vision
          </h2>
        </div>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "14px", color: "var(--text)" }}>
          Indian agriculture is the backbone of the nation's economy, supporting over 600 million livelihoods. However, farmers frequently face severe challenges including unseasonal weather unpredictability, plant disease outbreaks, asymmetric market price information, and high intermediary commissions.
        </p>
        <p className="t3" style={{ lineHeight: "1.7", color: "var(--text)" }}>
          <strong>AgroIntel</strong> was engineered to bridge this technological divide by delivering enterprise-grade AI diagnostics, localized meteorological models, real-time APMC mandi rate streams, and decentralized peer-to-peer equipment sharing directly to farmers' mobile devices — completely free of cost and localized into regional languages (Hindi, Marathi, and English).
        </p>
      </div>

      {/* Core Capabilities */}
      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ fontSize: "26px" }}>⚡</span>
          <h2 className="t2" style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Core Capabilities &amp; Features
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--green)" }}>
              🔬 AI Plant Doctor
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Deep vision model trained on over 50,000+ agricultural leaf samples. Identifies crop fungal, bacterial, and viral diseases instantly with organic and chemical remedies.
            </p>
          </div>

          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--blue)" }}>
              📈 Real-Time APMC Mandi Rates
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Live mandi rate aggregation across Maharashtra and national APMCs. Features custom per-device price target alerts via OneSignal push notifications and transport margin calculators.
            </p>
          </div>

          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--orange)" }}>
              🌦️ High-Resolution Weather &amp; Spray
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              15-day hyper-local forecasts powered by Open-Meteo with hourly precipitation probabilities, wind analysis, and intelligent pesticide spray window recommendations.
            </p>
          </div>

          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--purple)" }}>
              🚜 Krishi Market &amp; Equipment Rental
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Peer-to-peer agricultural marketplace for crops, livestock, seeds, and tractor/harvester hiring with 0% middleman commission.
            </p>
          </div>

          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--cyan)" }}>
              🎙️ Multilingual AI Voice Agronomist
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Voice-first conversational assistant supporting Marathi, Hindi, and Indian English with automatic speech recognition and audio synthesis.
            </p>
          </div>

          <div style={{ background: "var(--s2)", padding: "18px", borderRadius: "14px", border: "1px solid var(--border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "var(--yellow)" }}>
              🧪 Soil Health &amp; Crop Economics
            </h3>
            <p className="t3" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              Precise NPK fertilizer formulation calculators, CACP official benchmark yield estimators, and farm ledger bookkeeping.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture & Offline Reliability */}
      <div className="card" style={{ padding: "28px", marginBottom: "24px", borderRadius: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "26px" }}>📱</span>
          <h2 className="t2" style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Progressive Web App (PWA) &amp; Offline Architecture
          </h2>
        </div>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "12px", color: "var(--text)" }}>
          AgroIntel is engineered as a modern Progressive Web App (PWA). It installs directly on Android and iOS devices without requiring app store downloads, updates seamlessly in the background via service workers, and provides offline caching for essential tools and ledger data even when internet connectivity is intermittent.
        </p>
        <p className="t3" style={{ lineHeight: "1.7", color: "var(--text)" }}>
          Our backend is powered by FastAPI, asynchronous background tasks, and high-availability database infrastructure to ensure fast, reliable responses 24/7.
        </p>
      </div>

      {/* Contact & Support */}
      <div className="card" style={{ padding: "28px", borderRadius: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "26px" }}>📬</span>
          <h2 className="t2" style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Developer &amp; Contact Information
          </h2>
        </div>
        <p className="t3" style={{ lineHeight: "1.7", marginBottom: "14px" }}>
          For inquiries, feedback, or technical assistance, reach out to our team:
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
          <div>
            <strong>Website:</strong>{' '}
            <a href="https://agrointel.pages.dev" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>
              https://agrointel.pages.dev
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
