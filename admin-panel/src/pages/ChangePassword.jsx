import { notify, confirmDialog } from "../utils/notify";
import React, { useState } from "react";
import { api } from "../utils/api";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const pwScore = (p) => {
    let s = 0;
    if (!p) return 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const score = pwScore(newPass);
  const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const strengthColors = ["#ef4444", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#16a34a"];
  const toggleStyle = { display: "flex", alignItems: "center", gap: "8px", margin: "10px 0", cursor: "pointer", fontSize: "14px" };
  const meterWrapStyle = { margin: "8px 0 14px" };
  const meterTrackStyle = { height: "8px", borderRadius: "999px", background: "var(--b1, #e5e7eb)", overflow: "hidden" };
  const meterFillStyle = { height: "100%", width: (score / 5) * 100 + "%", background: strengthColors[score], transition: "width .25s ease" };
  const meterLabelStyle = { fontSize: "12px", fontWeight: 600, color: strengthColors[score] };

  const changeAdminPassword = async () => {
    setError("");
    if (!current || !newPass || !confirm) {
      setError("All fields are required");
      return;
    }
    if (newPass.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPass.length > 72) {
      setError("New password must be at most 72 characters");
      return;
    }
    if (newPass !== confirm) {
      setError("New passwords do not match");
      return;
    }

    try {
      await api("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: current,
          new_password: newPass,
        }),
      });
      notify("✅ Password changed successfully! Please log in again.");
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">🔑 Change Password</h1>
        <p className="page-sub">Update your admin account password</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔐 Password Update</span>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type={show ? "text" : "password"}
              className="form-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label>New Password (8-72 characters)</label>
            <input
              type={show ? "text" : "password"}
              className="form-input"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type={show ? "text" : "password"}
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <label className="show-pass-toggle" style={toggleStyle}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
          </label>

          {newPass && (
            <div className="pw-strength" style={meterWrapStyle}>
              <div style={meterTrackStyle}>
                <div style={meterFillStyle} />
              </div>
              <span style={meterLabelStyle}>
                {strengthLabels[score]}
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: "12px",
                marginTop: "8px",
                padding: "10px",
                background: "var(--rdim)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "8px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ marginTop: "14px" }}
            onClick={changeAdminPassword}
          >
            🔑 Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
