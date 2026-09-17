import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Messaging() {
  const [msg, setMsg] = useState("");
  const [currentMsg, setCurrentMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("all");

  const loadMessaging = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      const activeMsg = data.bulk_message || "";
      setMsg(activeMsg);
      setCurrentMsg(activeMsg);
    } catch (e) {
      console.error(e);
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendBulkMsg = async () => {
    const trimmed = msg.trim();
    if (!trimmed) {
      notify("Please enter a message first");
      return;
    }
    if (!await confirmDialog("Send this message to all users?")) return;
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ bulk_message: trimmed, target }),
      });
      notify("✅ Message sent to all users successfully!");
      loadMessaging();
    } catch (e) {
      notify("Failed to send: " + e.message);
    }
  };

  const clearBulkMsg = async () => {
    if (!await confirmDialog("Clear the active message?")) return;
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ bulk_message: "" }),
      });
      notify("✅ Message cleared successfully!");
      setMsg("");
      setCurrentMsg("");
    } catch (e) {
      notify("Failed to clear message: " + e.message);
    }
  };

  useEffect(() => {
    loadMessaging();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading bulk messaging settings...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Bulk Messaging</h1>
        <p className="page-sub">Send announcements to all app users</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📣 Compose Message</span>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Target Audience</label>
            <select className="form-input" value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Message target audience">
              <option value="all">All Users (Everyone)</option>
              <option value="registered">Registered Users Only</option>
              <option value="active">Active Users (last 7 days)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Message Text</label>
            <textarea
              className="form-textarea"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type your message to all users..."
              rows={4}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="btn btn-outline btn-sm"
              onClick={() => notify("Preview [" + target + "]: " + (msg.trim() || "(empty message)"))}
              aria-label="Preview test message">
              👁 Test Preview
            </button>
            <button className="btn btn-primary" onClick={sendBulkMsg}>
              📣 Send to All
            </button>
            <button className="btn btn-danger btn-sm" onClick={clearBulkMsg}>
              ✕ Clear Message
            </button>
          </div>

          <div id="currentMsgDisplay" style={{ marginTop: "20px" }}>
            {currentMsg ? (
              <div
                style={{
                  padding: "12px",
                  background: "var(--gdim)",
                  border: "1px solid rgba(74,222,128,.2)",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--t2)",
                    marginBottom: "4px",
                  }}
                >
                  Currently active message:
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--green)",
                    fontWeight: 500,
                  }}
                >
                  {currentMsg}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "var(--t3)" }}>
                No active message currently shown to users.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
