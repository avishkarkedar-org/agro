import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const ALL_FEATURES = [
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
  { id: "ledger", name: "Krishi Ledger", icon: "📒" },
  { id: "fertTracker", name: "Fertilizer Prices", icon: "🧾" },
];

export default function FeatureToggles() {
  const [disabledFeatures, setDisabledFeatures] = useState([]);
  const [savedFeatures, setSavedFeatures] = useState([]); // TOGGLES_DIRTY_R97
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      const _loaded = Array.isArray(data.disabled_features) ? data.disabled_features : [];
      setDisabledFeatures(_loaded); // TOGGLES_DIRTY_SYNC_R97
      setSavedFeatures([..._loaded]);
    } catch (e) {
      console.error(e);
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id, isEnabled) => {
    if (!isEnabled) {
      setDisabledFeatures((prev) => [...prev, id]); // Add to disabled array
    } else {
      setDisabledFeatures((prev) => prev.filter((x) => x !== id)); // Remove from disabled array
    }
  };

  const handleSave = async () => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ disabled_features: disabledFeatures }),
      });
      setSavedFeatures([...disabledFeatures]); // TOGGLES_DIRTY_SAVE_R97
      notify(
        `✅ Saved! ${disabledFeatures.length} features are currently disabled.`,
      );
    } catch (e) {
      notify("Failed to save settings: " + e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // TOGGLES_DIRTY_EFFECT_R97: compute dirty + warn before leaving with unsaved changes
  const _togglesDirty = JSON.stringify([...disabledFeatures].sort()) !== JSON.stringify([...savedFeatures].sort());
  useEffect(() => {
    if (!_togglesDirty) return;
    const _warnFn = (e) => { e.preventDefault(); e.returnValue = "You have unsaved feature toggle changes."; };
    window.addEventListener("beforeunload", _warnFn);
    return () => window.removeEventListener("beforeunload", _warnFn);
  }, [_togglesDirty]);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading feature toggles...
      </div>
    );

  const dirtyStyle = { boxShadow: _togglesDirty ? "0 0 0 2px var(--amber)" : undefined };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Global Feature Toggles</h1>
        <p className="page-sub">
          Turn features ON or OFF globally across the entire platform.
        </p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🎛️ Master Switches</span>
          <button className="btn btn-sm btn-primary" onClick={handleSave}
            style={dirtyStyle} > {/* TOGGLES_DIRTY_BTN_R97 */}
            {_togglesDirty ? "💾 Save Changes ●" : "✅ Saved"}
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
            Unchecking a feature will hide it completely from the public
            website. Use this during maintenance or to soft-launch features.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ALL_FEATURES.map((f) => {
              const isEnabled = !disabledFeatures.includes(f.id);
              return (
                <label
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    background: "var(--s2)",
                    border: `1px solid ${isEnabled ? "var(--g3)" : "var(--red)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    opacity: isEnabled ? 1 : 0.6,
                  }}
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(f.id, e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: isEnabled ? "var(--green)" : "var(--red)",
                    }}
                  />
                  <span style={{ fontSize: "18px" }}>{f.icon}</span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      fontWeight: 500,
                      textDecoration: isEnabled ? "none" : "line-through",
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color: isEnabled ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {isEnabled ? "ACTIVE" : "DISABLED"}
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
