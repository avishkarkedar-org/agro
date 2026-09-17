import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Scans() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api("/api/admin/scan-stats");
      setStats(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
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
        <span className="spinner"></span> Loading scan analytics...
      </div>
    );
  if (error)
    return (
      <div className="empty-state">
        <p>Error: {error}</p>
        <button className="btn btn-primary btn-sm mt2" onClick={loadData}>
          Retry
        </button>
      </div>
    );

  const total = stats?.total || 0;
  const avgConfidence = stats?.avg_confidence || 0;
  const topCrops = stats?.top_crops || [];
  const topDiseases = stats?.top_diseases || [];
  const severity = stats?.by_severity || {};
  const byDate = stats?.by_date || {};

  // Sort dates to render a chronological bar chart
  const sortedDates = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);
  const maxCount = Math.max(...sortedDates.map((d) => d[1]), 1);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Scan Analytics</h1>
        <p className="page-sub">
          Plant disease scan statistics & detailed logs
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-green">
          <div className="stat-num">{total}</div>
          <div className="stat-lbl">Total Scans</div>
          <div className="stat-icon">🔬</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-num">{avgConfidence}%</div>
          <div className="stat-lbl">Avg Confidence</div>
          <div className="stat-icon">🎯</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-num">{topCrops.length}</div>
          <div className="stat-lbl">Crops Detected</div>
          <div className="stat-icon">🌾</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-num">{topDiseases.length}</div>
          <div className="stat-lbl">Diseases Found</div>
          <div className="stat-icon">🦠</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔬 Detailed Scan Logs</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {topDiseases.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ marginBottom: "10px", fontSize: "14px" }}>
                Top Diseases
              </h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Disease</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDiseases.map((d, i) => (
                      <tr key={i}>
                        <td>{d.name}</td>
                        <td>
                          <span className="tag tag-red">{d.count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {topCrops.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ marginBottom: "10px", fontSize: "14px" }}>
                Top Crops
              </h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCrops.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td>
                          <span className="tag tag-green">{c.count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Object.keys(severity).length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ marginBottom: "10px", fontSize: "14px" }}>
                By Severity
              </h4>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {Object.entries(severity).map(([k, v]) => (
                  <span className="tag tag-amber" key={k}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sortedDates.length > 0 && (
            <div>
              <h4 style={{ marginBottom: "10px", fontSize: "14px" }}>
                Scans by Date (Last 7 Days)
              </h4>
              <div className="chart-bar">
                {sortedDates.map(([d, count]) => (
                  <div className="chart-col" key={d}>
                    <div className="chart-val">{count}</div>
                    <div
                      className="chart-fill"
                      style={{ height: `${(count / maxCount) * 100}%` }}
                    ></div>
                    <div className="chart-label">{d.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topDiseases.length === 0 && topCrops.length === 0 && (
            <div className="empty-state">
              <p>No scan data available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
