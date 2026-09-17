import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const headRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
const thReq = { width: "120px" };
const thHeat = { width: "40%" };
const codeStyle = { fontSize: "12px" };
const barTrack = { background: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden", height: "14px" };

export default function MetricsHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMetrics(); }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/metrics/heatmap");
      setData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = data.reduce((acc, curr) => {
    const key = `${curr.method || "GET"} ${curr.endpoint || "unknown"}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedStats = Object.keys(grouped)
    .map((key) => ({ path: key, count: grouped[key] }))
    .sort((a, b) => b.count - a.count);

  const maxCount = sortedStats.length > 0 ? sortedStats[0].count : 1;

  return (
    <div className="page active">
      <div className="page-header" style={headRow}>
        <div>
          <h1 className="page-title">System Metrics Heatmap</h1>
          <p className="page-sub">Aggregate visualization of API traffic distribution.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchMetrics}>🔄 Refresh</button>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">📊 API Traffic Intensity</span></div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading metrics...</p>
          ) : sortedStats.length === 0 ? (
            <p className="empty-state">No API metrics data available yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>API Endpoint</th><th style={thReq}>Requests</th><th style={thHeat}>Heatmap</th></tr>
                </thead>
                <tbody>
                  {sortedStats.map((stat, idx) => {
                    const percentage = Math.max(5, (stat.count / maxCount) * 100);
                    const r = Math.min(255, Math.round(percentage * 2.55));
                    const g = Math.max(40, Math.round(255 - percentage * 2.15));
                    const fillStyle = { width: `${percentage}%`, height: "100%", background: `rgb(${r}, ${g}, 60)`, transition: "width 0.4s ease" };
                    return (
                      <tr key={idx}>
                        <td><code style={codeStyle}>{stat.path}</code></td>
                        <td><strong>{stat.count}</strong></td>
                        <td>
                          <div style={barTrack}>
                            <div style={fillStyle} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
