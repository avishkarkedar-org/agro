import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const labelRow = { display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" };
const divider = { border: "none", borderTop: "1px solid var(--b1)", margin: "20px 0" };
const subHead = { marginBottom: "16px" };

function toLocalInputString(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function MaintenanceScheduler() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [schedule, setSchedule] = useState({ start: "", end: "", message: "" });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/settings");
      setMaintenanceMode(!!res.maintenance_mode);
      const s = res.maintenance_schedule;
      if (s) {
        setSchedule({
          start: toLocalInputString(s.start),
          end: toLocalInputString(s.end),
          message: s.message || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSchedule = () => {
    setSchedule({ start: "", end: "", message: "" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          maintenance_mode: maintenanceMode,
          maintenance_schedule: {
            start: schedule.start ? new Date(schedule.start).toISOString() : null,
            end: schedule.end ? new Date(schedule.end).toISOString() : null,
            message: schedule.message || "",
          },
        }),
      });
      notify("Maintenance settings saved successfully!");
    } catch (err) {
      notify("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTurnOffAll = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          maintenance_mode: false,
          maintenance_schedule: {
            start: null,
            end: null,
            message: "",
          },
        }),
      });
      setMaintenanceMode(false);
      setSchedule({ start: "", end: "", message: "" });
      notify("✅ All maintenance turned OFF and schedule cleared!");
    } catch (err) {
      notify("Failed to turn off: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isAnyMaintActive = maintenanceMode || (schedule.start && schedule.end);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Maintenance Scheduler</h1>
        <p className="page-sub">Configure automated downtime windows, toggle instant maintenance, or turn off maintenance with one click.</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🛠 Maintenance Controls</span>
          {isAnyMaintActive && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleTurnOffAll}
              disabled={saving}
              style={{ padding: "6px 12px", fontSize: "12px", fontWeight: "bold" }}
            >
              🛑 Emergency: Turn Off All Maintenance & Go Live
            </button>
          )}
        </div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading...</p>
          ) : (
            <>
              {isAnyMaintActive && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>⚠️ Maintenance Mode or Schedule is Active</strong>
                    <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>
                      {maintenanceMode ? "Instant maintenance mode is currently ON." : `Scheduled window is set from ${schedule.start} to ${schedule.end}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleTurnOffAll}
                    disabled={saving}
                    style={{ fontSize: "12px", padding: "5px 12px" }}
                  >
                    Turn Off Maintenance Now
                  </button>
                </div>
              )}

              <div className="form-group">
                <label style={labelRow}>
                  <input type="checkbox" className="checkbox" checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)} />
                  <strong>Instant Maintenance Mode (overrides schedule)</strong>
                </label>
                <small className="page-sub">If enabled, all non-admin traffic instantly receives a 503 response.</small>
              </div>

              <hr style={divider} />
              <h3 style={subHead}>Automated Schedule</h3>

              <div className="grid-form">
                <div className="form-group">
                  <label>Start Time (local)</label>
                  <input type="datetime-local" className="form-input" value={schedule.start}
                    onChange={(e) => setSchedule({ ...schedule, start: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time (local)</label>
                  <input type="datetime-local" className="form-input" value={schedule.end}
                    onChange={(e) => setSchedule({ ...schedule, end: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Downtime Message</label>
                <textarea className="form-textarea" rows="3" placeholder="e.g. System is undergoing scheduled maintenance."
                  value={schedule.message} onChange={(e) => setSchedule({ ...schedule, message: e.target.value })} />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Maintenance Settings"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleClearSchedule} disabled={saving}>
                  🧹 Clear Scheduled Window
                </button>
                <button type="button" className="btn btn-danger" onClick={handleTurnOffAll} disabled={saving}>
                  🛑 Turn Off All Maintenance
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
