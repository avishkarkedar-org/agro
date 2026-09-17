import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

/* VISITORS_LABELS_R114
   /api/admin/visitors reads the newest 2,000 rows and this page labelled the
   length of that list "Total Visits". Past 2,000 rows the figure freezes at
   2,000 permanently, and unique IPs are only unique within that window. The
   numbers are fine; the labels were wrong, so the labels changed. */

const VISITOR_WINDOW = 2000;

// Dependency-free SVG line chart for daily visits (admin panel has no chart library)
function VisitsChart({ data }) {
  if (!data || data.length < 2)
    return (
      <p className="empty-state">Not enough data yet to chart daily visits.</p>
    );
  const W = 640,
    H = 180,
    P = 28;
  const max = Math.max(...data.map((d) => d.count), 1);
  const stepX = (W - P * 2) / (data.length - 1);
  const y = (v) => H - P - (v / max) * (H - P * 2);
  const pts = data.map((d, i) => [P + i * stepX, y(d.count)]);
  const line = pts
    .map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const area =
    line +
    " L" + pts[pts.length - 1][0].toFixed(1) + " " + (H - P) +
    " L" + pts[0][0].toFixed(1) + " " + (H - P) + " Z";
  return (
    <svg
      viewBox={ "0 0 " + W + " " + H }
      style={ { width: "100%", height: "auto" } }
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="visFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#visFill)" />
      <path d={line} fill="none" stroke="#22c55e" strokeWidth="2.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" fill="#22c55e" />
          <title>{data[i].date + ": " + data[i].count + " visits"}</title>
        </g>
      ))}
      {data.map((d, i) => (
        <text
          key={"t" + i}
          x={P + i * stepX}
          y={H - 8}
          fontSize="9"
          fill="#94a3b8"
          textAnchor="middle"
        >
          {d.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [byDate, setByDate] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/visitors");
      setVisitors(data.recent || []);
      setStats({
        total: data.total_visits || 0,
        unique_ips: data.unique_visitors || 0,
      });
      const bd = data.by_date || {};
      const series = Object.keys(bd)
        .filter((k) => k)
        .sort()
        .slice(-14)
        .map((k) => ({ date: k, count: bd[k] }));
      setByDate(series);
    } catch (e) {
      console.error(e);
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
        <span className="spinner"></span> Loading visitor data...
      </div>
    );

  const atCap = (stats?.total || 0) >= VISITOR_WINDOW;

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Visitors</h1>
        <p className="page-sub">Website visitor analytics &amp; insights</p>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card stat-blue">
            <div className="stat-num">{stats.total.toLocaleString("en-IN")}</div>
            <div className="stat-lbl">Visits (recent 2,000)</div>
            <div className="stat-icon">👁️</div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-num">
              {stats.unique_ips.toLocaleString("en-IN")}
            </div>
            <div className="stat-lbl">Unique IPs (in window)</div>
            <div className="stat-icon">🌐</div>
          </div>
        </div>
      )}

      <p
        style={{
          fontSize: "11px",
          color: atCap ? "var(--amber)" : "var(--t3)",
          margin: "4px 0 14px",
        }}
      >
        {atCap
          ? "These figures are capped: the API returns only the newest 2,000 visitor rows, and that cap has been reached, so the real lifetime total is higher."
          : "These figures cover the newest 2,000 visitor rows. Unique IPs are counted only within that window, not for all time."}
      </p>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📈 Daily Visits (last 14 days)</span>
        </div>
        <div className="card-body">
          <VisitsChart data={byDate} />
          <p
            style={{ fontSize: "10px", color: "var(--t3)", marginTop: "8px" }}
          >
            * Grouped by the visitors.time column. Note that the Purge Old
            Visitors task deletes on created_at instead, so rows missing
            created_at are never purged.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">👁️ Recent Visitors</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {visitors.length === 0 ? (
            <p className="empty-state">No visitors recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Page</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, i) => (
                    <tr key={i}>
                      <td style={ { fontFamily: "monospace", fontSize: "12px" } }>
                        {v.ip || "—"}
                      </td>
                      <td style={ { fontSize: "12px" } }>{v.page || "—"}</td>
                      <td style={ { fontSize: "12px", color: "#94a3b8" } }>
                        {v.time ||
                          (v.created_at
                            ? new Date(v.created_at).toLocaleString()
                            : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
