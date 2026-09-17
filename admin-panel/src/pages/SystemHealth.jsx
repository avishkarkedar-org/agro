import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [rateLimits, setRateLimits] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [blockInput, setBlockInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    try {
      const [h, rl, bi] = await Promise.all([
        api("/api/admin/health-stats"),
        api("/api/admin/rate-limits"),
        api("/api/admin/blocked-ips"),
      ]);
      setHealth(h);
      setRateLimits(rl.top_ips || []);
      setBlockedIps(bi.ips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIp = async (ip) => {
    if (!await confirmDialog(`Block IP ${ip}?`)) return;
    try {
      await api("/api/admin/block-ip", {
        method: "POST",
        body: JSON.stringify({ ip }),
      });
      notify(`IP ${ip} blocked`);
      loadAll();
    } catch (e) {
      notify(e.message);
    }
  };

  const handleUnblockIp = async (ip) => {
    if (!await confirmDialog(`Unblock IP ${ip}?`)) return;
    try {
      await api("/api/admin/block-ip", {
        method: "DELETE",
        body: JSON.stringify({ ip }),
      });
      notify(`IP ${ip} unblocked`);
      loadAll();
    } catch (e) {
      notify(e.message);
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading health data...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">System Health</h1>
        <p className="page-sub">Backend service status & monitoring</p>
      </div>

      {health && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🖥️ Server Resources</span>
            <span className={`tag ${health.status === "healthy" ? "tag-green" : "tag-red"}`}>
              {health.status === "healthy" ? "✅ Healthy" : "⚠️ Degraded"}
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "var(--t2)", fontSize: "12px" }}>CPU Usage</p>
                <h3 style={{ margin: 0 }}>{health.cpu_usage}</h3>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "var(--t2)", fontSize: "12px" }}>Memory Usage</p>
                <h3 style={{ margin: 0 }}>{health.memory_usage}</h3>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "var(--t2)", fontSize: "12px" }}>Uptime (Hours)</p>
                <h3 style={{ margin: 0 }}>{health.uptime_hours}</h3>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "var(--t2)", fontSize: "12px" }}>Active Connections (5m)</p>
                <h3 style={{ margin: 0 }}>{health.active_connections}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <span className="card-title">
            📈 API Rate Limits (Top IPs - Last 5 min)
          </span>
        </div>
        <div className="card-body">
          {rateLimits.length === 0 ? (
            <p className="empty-state">No recent API activity.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Requests</th>
                    <th>Last Seen</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.map((rl) => (
                    <tr key={rl.ip}>
                      <td
                        style={{ fontFamily: "var(--mono)", fontSize: "11px" }}
                      >
                        {rl.ip}
                      </td>
                      <td>
                        <span
                          className={`tag ${rl.requests_last_5min > 15 ? "tag-red" : "tag-green"}`}
                        >
                          {rl.requests_last_5min}
                        </span>
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--t2)" }}>
                        {rl.last_seen}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleBlockIp(rl.ip)}
                        >
                          🚫 Block
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🚫 IP Blocklist</span>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            <input
              className="form-input"
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              placeholder="Enter IP address"
            />
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleBlockIp(blockInput)}
            >
              🚫 Block IP
            </button>
          </div>
          {blockedIps.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--t3)" }}>
              No blocked IPs.
            </p>
          ) : (
            blockedIps.map((ip) => (
              <div className="news-item" key={ip}>
                <span
                  className="news-item-text"
                  style={{ fontFamily: "var(--mono)", fontSize: "12px" }}
                >
                  {ip}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleUnblockIp(ip)}
                >
                  ✓ Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
