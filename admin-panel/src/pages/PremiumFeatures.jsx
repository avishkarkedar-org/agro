import { notify, confirmDialog } from "../utils/notify";
import React from "react";
import { api, API_BASE } from "../utils/api";

export default function PremiumFeatures() {
  const exportData = () => {
    window.location.href = `${API_BASE}/api/admin/export?token=${localStorage.getItem("admin_token")}`;
  };

  const toggleMaintenance = async (enabled) => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ maintenance_mode: enabled }),
      });
      notify(`✅ Maintenance mode ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      notify("Error: " + e.message);
    }
  };

  const purgeData = async () => {
    if (!await confirmDialog("Delete data older than 30 days?")) return;
    try {
      const res = await api("/api/superadmin/purge", { method: "POST" });
      notify(
        `✅ Purged ${res.deleted_posts} posts and ${res.deleted_visitors} visitors.`,
      );
    } catch (e) {
      notify("Error: " + e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Premium Features</h1>
        <p className="page-sub">Advanced tools for Superadmins</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">💾 Export Data</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray mb-3">
            Download a CSV of all visitors and posts.
          </p>
          <button className="btn btn-primary" onClick={exportData}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🚧 Maintenance Mode</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray mb-3">
            Temporarily block access to the public website.
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => toggleMaintenance(true)}
            >
              Enable Maintenance
            </button>
            <button
              className="btn btn-outline"
              onClick={() => toggleMaintenance(false)}
              style={{
                borderColor: "var(--border-light)",
                color: "var(--text-secondary)",
              }}
            >
              Disable Maintenance
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title text-danger">🗑 Purge Data</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray mb-3">
            Deletes posts and visitors older than 30 days to free up space.
          </p>
          <button className="btn btn-danger" onClick={purgeData}>
            Purge Old Data
          </button>
        </div>
      </div>
    </div>
  );
}
