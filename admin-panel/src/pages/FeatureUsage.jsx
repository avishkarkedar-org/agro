import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function FeatureUsage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/admin/feature-usage");
      setFeatures(data.features || []);
    } catch (e) {
      console.error(e);
      notify("Failed to load feature usage stats: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading feature usage statistics...
      </div>
    );

  const maxUsage = Math.max(...features.map((f) => f.usage), 1);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Feature Usage</h1>
        <p className="page-sub">Which features are used most by farmers</p>
      </div>

      <div className="stat-grid">
        {features.map((f, i) => (
          <div className="stat-card stat-green" key={i}>
            <div className="stat-num">{f.usage.toLocaleString()}</div>
            <div className="stat-lbl">{f.name}</div>
            <div className="stat-icon">{f.icon}</div>
          </div>
        ))}
        {features.length === 0 && (
          <p className="empty-state">No usage stats available.</p>
        )}
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📈 Usage Heatmap</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {features.length === 0 ? (
            <p className="empty-state">No data available.</p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {features.map((f, i) => {
                const pct = Math.round((f.usage / maxUsage) * 100);
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                    key={i}
                  >
                    <span
                      style={{
                        fontSize: "20px",
                        width: "30px",
                        textAlign: "center",
                      }}
                    >
                      {f.icon}
                    </span>
                    <span
                      style={{
                        width: "125px",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {f.name}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: "24px",
                        background: "var(--s2)",
                        borderRadius: "6px",
                        overflow: "hidden",
                        border: "1px solid var(--b1)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, var(--g3), var(--green))",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          paddingRight: "8px",
                          transition: "width .5s ease",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--mono)",
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {f.usage}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
