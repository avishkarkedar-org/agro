import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const DEFAULT_FEATURES = [
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
];

export default function FeatureOrder() {
  const [featureOrder, setFeatureOrder] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      const saved = Array.isArray(data.feature_order) ? data.feature_order : [];

      let orderedList = [];
      if (saved.length > 0) {
        orderedList = saved
          .map((id) => DEFAULT_FEATURES.find((f) => f.id === id))
          .filter(Boolean);
        // Add any missing features that weren't in saved list
        DEFAULT_FEATURES.forEach((f) => {
          if (!saved.includes(f.id)) orderedList.push(f);
        });
      } else {
        orderedList = [...DEFAULT_FEATURES];
      }
      setFeatureOrder(orderedList);
    } catch (e) {
      console.error(e);
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const moveFeature = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= featureOrder.length) return;

    setFeatureOrder((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[newIdx];
      copy[newIdx] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    const order = featureOrder.map((f) => f.id);
    try {
      await api("/api/admin/feature-order", {
        method: "POST",
        body: JSON.stringify({ order }),
      });
      notify("✅ Feature order saved! Website will update on next load.");
    } catch (e) {
      notify("Failed to save settings: " + e.message);
    }
  };

  const handleReset = () => {
    setFeatureOrder([...DEFAULT_FEATURES]);
    notify("Reset to default order. Save settings to apply.");
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading feature ordering...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Feature Order</h1>
        <p className="page-sub">
          Drag features up/down to set priority on the website
        </p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔀 Reorder Features</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-sm btn-outline" onClick={handleReset}>
              ↺ Reset Default
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleSave}>
              💾 Save Order
            </button>
          </div>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "12px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Use ▲ ▼ buttons to reorder. Top features will appear first in the
            main grid on the website.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {featureOrder.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "var(--s2)",
                  border: "1px solid var(--b1)",
                  borderRadius: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    color: "var(--t3)",
                    minWidth: "24px",
                  }}
                >
                  #{i + 1}
                </span>
                <span style={{ fontSize: "20px" }}>{f.icon}</span>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>
                  {f.name}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => moveFeature(i, -1)}
                    disabled={i === 0}
                    style={{ padding: "4px 10px", fontSize: "14px" }}
                  >
                    ▲
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => moveFeature(i, 1)}
                    disabled={i === featureOrder.length - 1}
                    style={{ padding: "4px 10px", fontSize: "14px" }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
