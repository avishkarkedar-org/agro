import React, { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { Scan, Sprout, Cloud, TrendingUp, FlaskConical, Calculator, Bug, Users, ShoppingCart, Landmark, Calendar, Leaf, BookText, Tractor, TestTube, BarChart3, Library, Video, PhoneCall, Settings, Moon, Sun, Monitor, Eye } from "lucide-react";

const ALL_FEATURES = [
  { id: "scan", name: "AI Plant Scanner", icon: <Scan size={18} />, link: "sec-scan" },
  { id: "planner", name: "AI Crop Planner", icon: <Sprout size={18} />, link: "sec-planner" },
  { id: "weather", name: "Live Weather", icon: <Cloud size={18} />, link: "sec-weather" },
  { id: "mandi", name: "Mandi Prices", icon: <TrendingUp size={18} />, link: "sec-mandi" },
  { id: "fert", name: "Fertilizer Calculator", icon: <FlaskConical size={18} />, link: "sec-fert" },
  { id: "fertTracker", name: "Fertilizer Prices", icon: <Calculator size={18} />, link: "sec-fert-tracker" },
  { id: "pest", name: "Pest Calendar", icon: <Bug size={18} />, link: "sec-pest" },
  { id: "community", name: "Farmer Community", icon: <Users size={18} />, link: "sec-community" },
  { id: "market", name: "AgroIntel Market", icon: <ShoppingCart size={18} />, link: "sec-market" },
  { id: "schemes", name: "Government Schemes", icon: <Landmark size={18} />, link: "sec-schemes" },
  { id: "calendar", name: "Crop Calendar", icon: <Calendar size={18} />, link: "sec-calendar" },
  { id: "seasonal", name: "Seasonal Recommendation", icon: <Leaf size={18} />, link: "sec-seasonal" },
  { id: "ledger", name: "Krishi Ledger", icon: <BookText size={18} />, link: "sec-ledger" },
  { id: "rentals", name: "Equipment Rentals", icon: <Tractor size={18} />, link: "sec-rentals" },
  { id: "soil", name: "Soil Health Planner", icon: <TestTube size={18} />, link: "sec-soil" },
  { id: "yield", name: "Profitability Estimator", icon: <BarChart3 size={18} />, link: "sec-yield" },
  { id: "encyclopedia", name: "Disease Encyclopedia", icon: <Library size={18} />, link: "sec-encyclopedia" },
  { id: "video", name: "Video Guides", icon: <Video size={18} />, link: "sec-video" },
  { id: "kvk", name: "KVK Directory", icon: <PhoneCall size={18} />, link: "sec-kvk" },
];

export default function SidebarDrawer({ isOpen, onClose, isLoggedIn, onOpenProfile, onOpenSettings, theme, onToggleTheme, onLoginClick }) {
  const { settings } = useSettings();
  
  const disabled = Array.isArray(settings?.disabled_features) ? settings.disabled_features : [];
  const order = Array.isArray(settings?.feature_order) ? settings.feature_order : [];
  const availableFeatures = ALL_FEATURES
    .filter((f) => !disabled.includes(f.id))
    .sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  // R88: label + icon for the current theme (replaces emoji glyphs)
  const themeMeta =
    theme === "dark"
      ? { icon: <Moon size={16} />, label: "Dark" }
      : theme === "light"
        ? { icon: <Sun size={16} />, label: "Light" }
        : theme === "contrast"
          ? { icon: <Eye size={16} />, label: "Contrast" }
          : { icon: <Monitor size={16} />, label: "Auto" };

  return (
    <>
      <style>{`
        /* ── Overlay ── */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 2000;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.32s ease, visibility 0.32s ease;
        }
        .drawer-overlay.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        /* ── Drawer panel (theme-aware tokens) ── */
        .drawer {
          --dw-fg: var(--text);
          --dw-fg-dim: var(--t2);
          --dw-fg-faint: var(--t3);
          --dw-line: rgba(52, 211, 153, 0.18);
          --dw-chip: rgba(130, 130, 130, 0.10);
          --dw-chip-line: rgba(130, 130, 130, 0.18);

          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(300px, 88vw);
          background: var(--clay-surface);
          border-right: var(--border-soft);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          box-shadow: 4px 0 48px rgba(0, 0, 0, 0.4);
          z-index: 2001;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
          overscroll-behavior: contain;
        }
        .drawer.open {
          transform: translateX(0);
        }

        /* ── Header inside drawer ── */
        .drawer-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--dw-line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, var(--gdim) 0%, transparent 70%);
          flex-shrink: 0;
        }
        .drawer-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .drawer-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--g3), var(--green));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 16px rgba(52, 211, 153, 0.3);
          flex-shrink: 0;
        }
        .drawer-brand-name {
          font-size: 17px;
          font-weight: 700;
          color: var(--dw-fg);
          line-height: 1.2;
        }
        .drawer-brand-sub {
          font-size: 10px;
          color: var(--dw-fg-faint);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .drawer-close {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--dw-chip);
          border: 1px solid var(--dw-chip-line);
          color: var(--dw-fg-dim);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .drawer-close:hover {
          background: rgba(251, 113, 133, 0.12);
          border-color: rgba(251, 113, 133, 0.3);
          color: #fb7185;
        }

        /* ── Nav section label ── */
        .drawer-section-label {
          padding: 16px 20px 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--dw-fg-faint);
          flex-shrink: 0;
        }

        /* ── Links list ── */
        .drawer-links {
          padding: 0 12px 12px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .drawer-links::-webkit-scrollbar { width: 3px; }
        .drawer-links::-webkit-scrollbar-thumb { background: var(--dw-line); border-radius: 4px; }

        /* ── Individual link ── */
        .drawer-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--dw-fg-dim);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          touch-action: manipulation;
          -webkit-tap-highlight-color: rgba(52, 211, 153, 0.15);
          min-height: 52px;
        }
        .drawer-link:hover,
        .drawer-link:active {
          border-color: var(--dw-line);
          color: var(--green);
          transform: translateX(4px);
        }
        .drawer-link:active {
          transform: scale(0.97);
        }
        .drawer-link-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--dw-chip);
          border: 1px solid var(--dw-chip-line);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--dw-fg);
          flex-shrink: 0;
          transition: all 0.18s;
        }
        .drawer-link:hover .drawer-link-icon {
          background: var(--gdim);
          border-color: var(--dw-line);
          color: var(--green);
        }
        .drawer-link-arrow {
          margin-left: auto;
          opacity: 0;
          color: var(--green);
          font-size: 12px;
          transition: opacity 0.18s;
        }
        .drawer-link:hover .drawer-link-arrow {
          opacity: 1;
        }

        /* ── Empty state ── */
        .drawer-empty {
          padding: 32px 20px;
          text-align: center;
          color: var(--dw-fg-faint);
          font-size: 13px;
          line-height: 1.6;
        }
        .drawer-empty-icon { font-size: 36px; margin-bottom: 12px; }

        /* ── Footer ── */
        .drawer-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--dw-line);
          flex-shrink: 0;
          background: transparent;
        }
        .drawer-footer-text {
          font-size: 10px;
          color: var(--dw-fg-faint);
          text-align: center;
          letter-spacing: 0.06em;
        }
        .drawer-version-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          margin-right: 6px;
          vertical-align: middle;
          box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
        }
      `}</style>

      {/* Overlay */}
      <div
        className={`drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav
        className={`drawer ${isOpen ? "open" : ""}`}
        aria-label="Navigation menu"
        role="navigation"
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <div className="drawer-logo">🌾</div>
            <div>
              <div className="drawer-brand-name">AgroIntel</div>
              <div className="drawer-brand-sub">Smart Farming</div>
            </div>
          </div>
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Section label */}
        <div className="drawer-section-label">Navigate to</div>

        {/* Links */}
        <div className="drawer-links">
          {availableFeatures.length === 0 ? (
            <div className="drawer-empty">
              <div className="drawer-empty-icon">🔒</div>
              <div>All features are currently disabled.</div>
              <div style={{marginTop: 6, fontSize: 11, color: "var(--t3)"}}>
                Ask your admin to enable features.
              </div>
            </div>
          ) : (
            availableFeatures.map((f) => (
              <div
                key={f.id}
                className="drawer-link"
                role="button"
                tabIndex={0}
                onClick={() => {
                  document
                    .getElementById(f.link)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    document
                      .getElementById(f.link)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    onClose();
                  }
                }}
              >
                <div className="drawer-link-icon">{f.icon}</div>
                <span>{f.name}</span>
                <span className="drawer-link-arrow">›</span>
              </div>
            ))
          )}
        </div>

        {/* Footer Settings Area */}
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {isLoggedIn ? (
            <>
              <div
                className="drawer-link"
                role="button"
                onClick={() => { onClose(); onOpenProfile(); }}
                style={{ minHeight: 46, padding: "10px 14px" }}
              >
                <div className="drawer-link-icon" style={{ width: 32, height: 32 }}><Users size={16} /></div>
                <span style={{ fontSize: 13 }}>My Profile</span>
              </div>
            </>
          ) : (
            <div
              className="drawer-link"
              role="button"
              onClick={() => { onClose(); onLoginClick(); }}
              style={{ minHeight: 46, padding: "10px 14px", color: "var(--green)" }}
            >
              <div className="drawer-link-icon" style={{ width: 32, height: 32, color: "var(--green)", borderColor: "var(--dw-line)" }}><Users size={16} /></div>
              <span style={{ fontSize: 13 }}>Login / Signup</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <div
              className="drawer-link"
              role="button"
              onClick={() => { onClose(); onOpenSettings(); }}
              style={{ flex: 1, minHeight: 46, padding: "10px 14px" }}
            >
              <div className="drawer-link-icon" style={{ width: 32, height: 32 }}><Settings size={16} /></div>
              <span style={{ fontSize: 13 }}>Settings</span>
            </div>
            
            <div
              className="drawer-link"
              role="button"
              onClick={(e) => { e.stopPropagation(); onToggleTheme(); }}
              style={{ minHeight: 46, padding: "10px 12px", justifyContent: "center", gap: 8 }}
              title={"Theme: " + themeMeta.label}
              aria-label={"Toggle theme (current: " + themeMeta.label + ")"}
            >
              <div className="drawer-link-icon" style={{ width: 32, height: 32, background: "transparent", border: "none" }}>
                {themeMeta.icon}
              </div>
              <span style={{ fontSize: 13 }}>{themeMeta.label}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <div className="drawer-footer-text">
            <span className="drawer-version-dot" />
            AgroIntel © 2026
          </div>
        </div>
      </nav>
    </>
  );
}
