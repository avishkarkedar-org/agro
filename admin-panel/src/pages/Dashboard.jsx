import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tags, setTags] = useState({});
  const [recentPosts, setRecentPosts] = useState([]);
  const [maintenance, setMaintenance] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // DASHBOARD_PRESETS_R97: quick date range preset pills
  const applyPreset = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = fmt(now);
    if (preset === "today") {
      setFromDate(today); setToDate(today);
    } else if (preset === "week") {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
      setFromDate(fmt(mon)); setToDate(today);
    } else if (preset === "month") {
      setFromDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setToDate(today);
    } else {
      setFromDate(""); setToDate("");
    }
    setTimeout(loadDashboard, 50);
  };

  const exportStats = () => {
    if (!stats) return;
    const rows = [
      "Metric,Value",
      "Users," + stats.users,
      "Posts," + stats.posts,
      "Scans," + stats.scans,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dashboard_stats_${new Date().toISOString().slice(0,10)}.csv`; a.click(); // DASHBOARD_CSV_DATE_R97
    URL.revokeObjectURL(url);
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const qs = fromDate || toDate ? "?from=" + fromDate + "&to=" + toDate : "";
      const data = await api("/api/admin/dashboard" + qs);
      setStats(data.stats);
      setTags(data.tags || {});
      setRecentPosts(data.recent_posts || []);
      setMaintenance(data.maintenance);

      const settings = await api("/api/settings");
      setBulkMsg(settings.bulk_message || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  // DASHBOARD_AUTOREFRESH_R97: auto-refresh every 60 s; clears on unmount
  useEffect(() => {
    loadDashboard();
    const _autoRefreshInterval = setInterval(loadDashboard, 60_000);
    return () => clearInterval(_autoRefreshInterval);
  }, [loadDashboard]);

  // MAINTENANCE_CONFIRM_R96: added confirmation before enabling maintenance
  const toggleMaintenance = async () => {
    if (!maintenance) {
      // Turning ON — confirm first (turns site into 503 for all users)
      const ok = await confirmDialog(
        "Enable Maintenance Mode? All public API calls will return 503 until you turn it off.",
        { danger: true, confirmText: "Enable Maintenance" }
      );
      if (!ok) return;
    }
    try {
      await api("/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled: !maintenance }),
      });
      setMaintenance(!maintenance);
    } catch (e) {
      notify(e.message);
    }
  };

  const saveBulkMessage = async () => {
    if (!bulkMsg.trim()) {
      notify("Enter a message first");
      return;
    }
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ bulk_message: bulkMsg }),
      });
      notify("Bulk message saved!");
    } catch (e) {
      notify(e.message);
    }
  };

  const clearBulkMessage = async () => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ bulk_message: "" }),
      });
      setBulkMsg("");
      notify("Bulk message cleared!");
    } catch (e) {
      notify(e.message);
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading dashboard...
      </div>
    );

  const maxVal = Math.max(...Object.values(tags), 1);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Overview of your AgroIntel platform</p>
      </div>
      <div className="flex gap2 mb3 wrap" style={{ alignItems: "center" }}>
        <input type="date" className="form-input" style={{ width: "auto" }} value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="Stats from date" />
        <input type="date" className="form-input" style={{ width: "auto" }} value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="Stats to date" />
        <button className="btn btn-outline btn-sm" onClick={loadDashboard}
          aria-label="Apply date range">📅 Apply Range</button>
        {/* DASHBOARD_PRESETS_PILLS_R97 */}
        <button className="btn btn-outline btn-sm" onClick={() => applyPreset("today")}>Today</button>
        <button className="btn btn-outline btn-sm" onClick={() => applyPreset("week")}>This Week</button>
        <button className="btn btn-outline btn-sm" onClick={() => applyPreset("month")}>This Month</button>
        <button className="btn btn-outline btn-sm" onClick={() => applyPreset("all")}>All Time</button>
        {stats && (
          <button className="btn btn-outline btn-sm" onClick={exportStats}
            aria-label="Export dashboard stats as CSV">📥 Export CSV</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="card-hd">
          <span className="card-title">🔧 Maintenance Mode</span>
        </div>
        <div className="card-body">
          <div className="toggle-wrap">
            <div
              className={`toggle ${maintenance ? "active" : ""}`}
              onClick={toggleMaintenance}
            ></div>
            <span className="toggle-label">
              {maintenance
                ? "ACTIVE (APIs return 503)"
                : "OFF (System operating normally)"}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="card-hd">
          <span className="card-title">📣 Bulk Announcement Message</span>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Active Message (shown to all users)</label>
            {/* BULK_MSG_TEXTAREA_R96: changed input → textarea for multi-line announcements */}
            <textarea
              className="form-input"
              rows={3}
              value={bulkMsg}
              onChange={(e) => setBulkMsg(e.target.value)}
              placeholder="Enter announcement message for all users... (multi-line supported)"
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={saveBulkMessage}
            >
              💾 Save Message
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={clearBulkMessage}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="card-hd">
          <span className="card-title">⚡ Quick Platform Actions</span>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link to="/maintenance" className="btn btn-outline btn-sm">🚧 Schedule Maintenance</Link>
            <Link to="/rate-limits" className="btn btn-outline btn-sm">⏱️ Configure Rate Limits</Link>
            <Link to="/bans" className="btn btn-outline btn-sm">🚫 Ban Engine</Link>
            <Link to="/bugs" className="btn btn-outline btn-sm">🐞 Bug Reports Kanban</Link>
            <Link to="/heatmap" className="btn btn-outline btn-sm">🗺️ Traffic Heatmap</Link>
            <Link to="/sessions" className="btn btn-outline btn-sm text-danger">🛑 Session Revocation</Link>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card stat-blue">
            <div className="stat-num">{stats.users}</div>
            <div className="stat-lbl">Users</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-num">{stats.posts}</div>
            <div className="stat-lbl">Posts</div>
            <div className="stat-icon">📝</div>
          </div>
          <div className="stat-card stat-amber">
            <div className="stat-num">{stats.scans}</div>
            <div className="stat-lbl">Scans</div>
            <div className="stat-icon">🔬</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-num">{Object.keys(tags).length}</div>
            <div className="stat-lbl">Categories</div>
            <div className="stat-icon">🏷️</div>
          </div>
          {stats.ai_calls !== undefined && ( /* DASHBOARD_AI_CARD_R97 */
            <div className="stat-card stat-green">
              <div className="stat-num">{stats.ai_calls}</div>
              <div className="stat-lbl">AI Calls</div>
              <div className="stat-icon">🤖</div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="card-hd">
          <span className="card-title">📊 Posts by Category</span>
        </div>
        <div className="card-body">
          {Object.keys(tags).length === 0 ? (
            <p className="empty-state">No categories data.</p>
          ) : (
            <div className="chart-bar" style={{ height: "140px" }}>
              {Object.entries(tags).map(([key, val]) => (
                <div className="chart-col" key={key}>
                  <div className="chart-val">{val}</div>
                  <div
                    className="chart-fill"
                    title={`${key}: ${val} posts`}
                    style={{
                      height: `${(val / maxVal) * 100}%`,
                      maxWidth: "40px",
                      borderRadius: "6px 6px 0 0",
                      background:
                        "linear-gradient(to top, var(--g3), var(--green))",
                      transition: "height .5s ease",
                      cursor: "pointer",
                    }}
                  /> {/* DASHBOARD_CHART_TOOLTIP_R97 */}
                  <div className="chart-label">{key}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📝 Recent Posts</span>
        </div>
        <div className="card-body">
          {recentPosts.length === 0 ? (
            <p className="empty-state">No posts yet.</p>
          ) : (
            recentPosts.map((p, idx) => (
              <div
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--b1)",
                }}
                key={p.id || idx}
              >
                <strong>{p.title}</strong>
                <br />
                <span style={{ fontSize: "11px", color: "var(--t2)" }}>
                  {p.author} • {p.tag} • {p.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
