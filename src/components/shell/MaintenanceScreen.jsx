import React, { useState } from "react";
import { useSettings, API } from "../../context/SettingsContext";

export default function MaintenanceScreen({ onBypass }) {
  const { settings, refreshSettings } = useSettings();
  const [showBypass, setShowBypass] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sched = settings?.maintenance_schedule;
  const customMessage = sched?.message || settings?.maintenance_message;
  const endTime = sched?.end ? new Date(sched.end) : null;
  const validEnd = endTime && !Number.isNaN(endTime.getTime()) ? endTime : null;

  const handleBypass = () => {
    try {
      localStorage.setItem("agrointel_maint_bypass", "true");
    } catch {}
    if (onBypass) onBypass();
  };

  const handleAdminLoginAndBypass = async (e) => {
    e.preventDefault();
    if (!adminUser || !adminPass) {
      setError("Please enter admin username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      
      try {
        localStorage.setItem("agrointel_admin_token", data.token);
        localStorage.setItem("agrointel_maint_bypass", "true");
      } catch {}

      if (onBypass) onBypass();
    } catch (err) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleTurnOffMaintenance = async () => {
    if (!adminUser || !adminPass) {
      setError("Enter credentials above to turn off maintenance");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      const token = data.token;
      const patchRes = await fetch(`${API}/api/admin/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maintenance_mode: false,
          maintenance_schedule: { start: null, end: null, message: "" },
        }),
      });
      if (!patchRes.ok) throw new Error("Could not update settings");

      try {
        localStorage.removeItem("agrointel_maint_bypass");
      } catch {}

      if (refreshSettings) await refreshSettings();
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to turn off maintenance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          padding: "40px 24px",
          background: "var(--clay-surface, var(--s1))",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚧</div>
        <h1
          style={{
            fontSize: "30px",
            marginBottom: "12px",
            background: "linear-gradient(135deg,var(--text),var(--green))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Under Maintenance
        </h1>
        <p className="t2" style={{ lineHeight: 1.6, fontSize: "14.5px" }}>
          {customMessage ||
            "AgroIntel is currently undergoing scheduled maintenance. We will be back online shortly."}
        </p>
        {validEnd && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px 16px",
              background: "var(--adim, rgba(245, 158, 11, 0.12))",
              border: "1px solid var(--amber, #f59e0b)",
              borderRadius: "8px",
              color: "var(--amber, #f59e0b)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {"Expected return: " +
              validEnd.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
          </div>
        )}

        <div style={{ marginTop: "30px", borderTop: "1px solid var(--line, rgba(255,255,255,0.08))", paddingTop: "18px" }}>
          {!showBypass ? (
            <button
              type="button"
              className="btn btn-sm btn-o"
              onClick={() => setShowBypass(true)}
              style={{ fontSize: "12px", opacity: 0.75 }}
            >
              🔒 Admin / Developer Bypass & Turn Off
            </button>
          ) : (
            <div style={{ textAlign: "left", marginTop: "10px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: "600", marginBottom: "8px", color: "var(--text)" }}>
                Admin Authentication
              </div>
              {error && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "8px" }}>
                  {error}
                </div>
              )}
              <input
                type="text"
                className="input"
                placeholder="Admin username"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                style={{ marginBottom: "8px", fontSize: "13px", padding: "8px 10px" }}
              />
              <input
                type="password"
                className="input"
                placeholder="Admin password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                style={{ marginBottom: "12px", fontSize: "13px", padding: "8px 10px" }}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-g"
                  onClick={handleAdminLoginAndBypass}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? "Verifying..." : "⚡ Bypass as Admin"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-r"
                  onClick={handleTurnOffMaintenance}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  🛑 Turn Off Maintenance
                </button>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={handleBypass}
                style={{ display: "block", marginTop: "12px", fontSize: "11px", color: "var(--text-3)", textAlign: "center", width: "100%" }}
              >
                Direct local preview bypass
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
