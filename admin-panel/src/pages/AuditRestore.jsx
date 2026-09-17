import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function AuditRestore() {
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);

  const loadLogs = async () => {
    try {
      const res = await api("/api/superadmin/audit_logs");
      setLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api("/api/admin/settings/history");
      setHistory(res.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
    loadHistory();
  }, []);

  const restoreSettings = async (id) => {
    if (!await confirmDialog("Restore these settings?")) return;
    try {
      await api(`/api/admin/settings/restore/${id}`, { method: "POST" });
      notify("✅ Settings restored! Refreshing...");
      window.location.reload();
    } catch (e) {
      notify("Error: " + e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Audit & Restore</h1>
        <p className="page-sub">View action logs and rollback settings</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📜 Audit Logs</h2>
          <button className="btn btn-outline btn-sm" onClick={loadLogs}>
            ↻ Refresh
          </button>
        </div>
        <div
          className="card-body"
          style={{ maxHeight: "300px", overflowY: "auto", fontSize: "13px" }}
        >
          {logs.length === 0 ? (
            <p className="text-gray text-center">No logs found</p>
          ) : null}
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span
                className="text-gray"
                style={{ width: "140px", display: "inline-block" }}
              >
                {new Date(l.timestamp).toLocaleString()}
              </span>
              <span
                style={{
                  fontWeight: "bold",
                  width: "100px",
                  display: "inline-block",
                }}
              >
                {l.admin}
              </span>
              <span>{l.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">⏮ Settings History</h2>
          <button className="btn btn-outline btn-sm" onClick={loadHistory}>
            ↻ Refresh
          </button>
        </div>
        <div
          className="card-body"
          style={{ maxHeight: "300px", overflowY: "auto", fontSize: "13px" }}
        >
          {history.length === 0 ? (
            <p className="text-gray text-center">No history found</p>
          ) : null}
          {history.map((h, i) => (
            <div
              key={i}
              className="flex align-center justify-between"
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold" }}>
                  {new Date(h.timestamp).toLocaleString()}
                </div>
                <div className="text-gray">Snapshot ID: {h.id}</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => restoreSettings(h.id)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
