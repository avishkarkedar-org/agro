import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const ALL_FEATURES_ACCESS = [
  { id: "scan", name: "AI Plant Scanner", icon: "🔬" },
  { id: "planner", name: "AI Crop Planner", icon: "🤖" },
  { id: "weather", name: "Live Weather", icon: "🌤" },
  { id: "mandi", name: "Mandi Prices", icon: "📊" },
  { id: "fert", name: "Fertilizer Calculator", icon: "🧮" },
  { id: "pest", name: "Pest Calendar", icon: "🐛" },
  { id: "community", name: "Farmer Community", icon: "🌾" },
  { id: "market", name: "AgroIntel Market", icon: "🛒" },
  { id: "schemes", name: "Government Schemes", icon: "🏛" },
  { id: "yield", name: "Profitability Estimator", icon: "📈" },
  { id: "encyclopedia", name: "Disease Encyclopedia", icon: "📚" },
  { id: "video", name: "YouTube Video", icon: "▶️" },
  { id: "kvk", name: "KVK Directory", icon: "📞" },
  { id: "rentals", name: "Equipment Rentals", icon: "🚜" },
  { id: "soil", name: "Soil Health Planner", icon: "🌱" },
  { id: "calendar", name: "Crop Calendar", icon: "📅" },
  { id: "seasonal", name: "Seasonal Recommendation", icon: "🌾" },
  { id: "voice", name: "AI Voice Assistant", icon: "🎤" },
];

export default function FeatureAccess() {
  const [loginRequired, setLoginRequired] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      setLoginRequired(Array.isArray(data.login_required_features) ? data.login_required_features : []);
    } catch (e) {
      console.error(e);
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id, checked) => {
    if (checked) {
      setLoginRequired((prev) => [...prev, id]);
    } else {
      setLoginRequired((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleSave = async () => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ login_required_features: loginRequired }),
      });
      notify(`✅ Saved! ${loginRequired.length} features now require login.`);
    } catch (e) {
      notify("Failed to save settings: " + e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading access control settings...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Feature Access Control</h1>
        <p className="page-sub">
          Select which features require user login to access
        </p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔐 Login-Required Features</span>
          <button className="btn btn-sm btn-primary" onClick={handleSave}>
            💾 Save Settings
          </button>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "12px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Check the features that should require login. Unchecked features are
            free for everyone to access.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ALL_FEATURES_ACCESS.map((f) => {
              const checked = loginRequired.includes(f.id);
              return (
                <label
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    background: "var(--s2)",
                    border: `1px solid ${checked ? "var(--g3)" : "var(--b1)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggle(f.id, e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--green)",
                    }}
                  />
                  <span style={{ fontSize: "18px" }}>{f.icon}</span>
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color: checked ? "var(--amber)" : "var(--t3)",
                    }}
                  >
                    {checked ? "LOGIN REQUIRED" : "FREE"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
