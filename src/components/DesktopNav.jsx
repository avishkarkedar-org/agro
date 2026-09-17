import React from "react";
import { Home, CloudSun, Scan, TrendingUp, Users, FlaskConical, User } from "lucide-react";

export default function DesktopNav({
  activeTab,
  onTabChange,
  isLoggedIn,
  onOpenProfile,
  onOpenAuth,
}) {
  const handleNavClick = (tabId, sectionId) => {
    if (tabId === "home" && sectionId) {
      if (activeTab !== "home") {
        onTabChange("home");
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } else {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    onTabChange(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .desktop-nav {
          display: none;
          align-items: center;
          gap: 6px;
          background: rgba(20, 27, 24, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 4px 8px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex;
          }
        }
        .dn-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--t2, rgba(236, 253, 245, 0.7));
          font-family: var(--sans, sans-serif);
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
          white-space: nowrap;
        }
        .dn-btn:hover {
          color: var(--text, #fff);
          background: rgba(255, 255, 255, 0.08);
        }
        .dn-btn.active {
          color: #052e16;
          background: var(--green, #34d399);
          box-shadow: 0 2px 10px rgba(52, 211, 153, 0.35);
          font-weight: 700;
        }
        .dn-btn.active svg {
          stroke: #052e16;
        }
        .dn-btn-scan {
          background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(16, 185, 129, 0.25));
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: var(--green, #34d399);
        }
        .dn-btn-scan:hover {
          background: linear-gradient(135deg, rgba(52, 211, 153, 0.3), rgba(16, 185, 129, 0.4));
          color: #fff;
        }
        .dn-btn-scan.active {
          background: var(--green, #34d399);
          color: #052e16;
          border-color: transparent;
        }
        .dn-profile-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text, #fff);
          font-family: var(--sans, sans-serif);
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
          margin-left: 4px;
        }
        .dn-profile-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(52, 211, 153, 0.4);
        }
        @media (max-width: 1080px) and (min-width: 900px) {
          .dn-btn span {
            display: none;
          }
          .dn-btn {
            padding: 6px 8px;
          }
        }
      `}</style>

      <nav className="desktop-nav" aria-label="Desktop Primary Navigation">
        <button
          type="button"
          className={`dn-btn ${activeTab === "home" ? "active" : ""}`}
          onClick={() => handleNavClick("home")}
          aria-label="Home"
        >
          <Home size={15} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`dn-btn ${activeTab === "weather" ? "active" : ""}`}
          onClick={() => handleNavClick("weather")}
          aria-label="Live Weather & Agro-Meteorology"
        >
          <CloudSun size={15} />
          <span>Weather</span>
        </button>

        <button
          type="button"
          className={`dn-btn dn-btn-scan ${activeTab === "scan" ? "active" : ""}`}
          onClick={() => handleNavClick("scan")}
          aria-label="AI Plant Pathology Scanner"
        >
          <Scan size={15} />
          <span>AI Scan</span>
        </button>

        <button
          type="button"
          className={`dn-btn ${activeTab === "mandi" ? "active" : ""}`}
          onClick={() => handleNavClick("mandi")}
          aria-label="APMC Mandi Prices"
        >
          <TrendingUp size={15} />
          <span>Mandi</span>
        </button>

        <button
          type="button"
          className="dn-btn"
          onClick={() => handleNavClick("home", "sec-community")}
          aria-label="Farmer Community"
        >
          <Users size={15} />
          <span>Community</span>
        </button>

        <button
          type="button"
          className="dn-btn"
          onClick={() => handleNavClick("home", "sec-fert")}
          aria-label="Precision Farm Calculators"
        >
          <FlaskConical size={15} />
          <span>Calculators</span>
        </button>

        <button
          type="button"
          className="dn-profile-btn"
          onClick={() => {
            if (isLoggedIn) {
              onOpenProfile();
            } else {
              onOpenAuth();
            }
          }}
          aria-label={isLoggedIn ? "Account Profile" : "Sign In"}
        >
          <User size={14} />
          <span>{isLoggedIn ? "Profile" : "Sign In"}</span>
        </button>
      </nav>
    </>
  );
}
