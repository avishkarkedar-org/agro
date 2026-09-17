import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function LoginLog() {
  const [activity, setActivity] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/admin/login-activity");
      setActivity(data.activity || []);
    } catch (e) {
      console.error(e);
      notify("Failed to load login activity logs: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading login logs...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">🔐 Login Activity Log</h1>
        <p className="page-sub">Recent admin login attempts (last 50)</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔐 Login Attempts</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          <div className="search-bar mb2">
            <input
              className="search-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by username or IP..."
              aria-label="Filter login log"
            />
          </div>
          {activity.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔐</div>
              <p>
                No login attempts recorded yet. Activity is tracked in-memory
                since last server restart.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Time</th>
                    <th>Browser / Device</th>
                  </tr>
                </thead>
                <tbody>
                  {activity
                    .filter((a) => !filter ||
                      (a.username || "").toLowerCase().includes(filter.toLowerCase()) ||
                      (a.ip || "").includes(filter))
                    .map((a, i) => (
                    <tr
                      key={i}
                      style={{
                        background: a.success
                          ? "transparent"
                          : "rgba(248,113,113,0.03)",
                      }}
                    >
                      <td style={{ fontWeight: 500 }}>{a.username}</td>
                      <td>
                        {a.success ? (
                          <span className="tag tag-green">✅ Success</span>
                        ) : (
                          <span className="tag tag-red">❌ Failed</span>
                        )}
                      </td>
                      <td
                        style={{ fontFamily: "var(--mono)", fontSize: "11px" }}
                      >
                        {a.ip}
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--t2)" }}>
                        {formatDate(a.timestamp)}
                      </td>
                      <td
                        style={{
                          fontSize: "10px",
                          color: "var(--t3)",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={a.user_agent}
                      >
                        {a.user_agent}
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
