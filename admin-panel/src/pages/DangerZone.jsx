import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api, API_BASE } from "../utils/api";

export default function DangerZone() {
  const [url, setUrl] = useState(API_BASE);

  // DANGERZONE_CONFIRM_R96: replaced prompt() — blocked in sandboxed iframes
  const deleteAllPosts = async () => {
    const ok = await confirmDialog(
      "Permanently delete EVERY community post? This cannot be undone.",
      { danger: true, confirmText: "Delete All Posts" }
    );
    if (!ok) return;
    try {
      await api("/api/admin/posts", { method: "DELETE" });
      notify("✅ All posts deleted");
    } catch (e) {
      notify("Error: " + e.message);
    }
  };

  // DANGERZONE_CLEARBANNER_R96: replaced prompt() with confirmDialog
  const clearBanner = async () => {
    const ok = await confirmDialog(
      "Remove the announcement banner from the website?",
      { confirmText: "Clear Banner" }
    );
    if (!ok) return;
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ announcement: null, ann_image: null }),
      });
      notify("✅ Banner cleared");
    } catch (e) {
      notify("Error: " + e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title text-danger">Danger Zone</h1>
        <p className="page-sub">
          Irreversible actions — use with extreme caution
        </p>
      </div>

      <div
        className="card"
        style={{ borderLeft: "4px solid var(--danger-color)" }}
      >
        <div className="card-body flex justify-between align-center wrap gap-2">
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--danger-color)",
                marginBottom: "4px",
              }}
            >
              🗑 Delete All Community Posts
            </div>
            <div className="text-sm text-gray">
              Permanently removes ALL posts. Cannot be undone.
            </div>
          </div>
          <button className="btn btn-danger" onClick={deleteAllPosts}>
            Delete All Posts
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ borderLeft: "4px solid var(--danger-color)" }}
      >
        <div className="card-body flex justify-between align-center wrap gap-2">
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--danger-color)",
                marginBottom: "4px",
              }}
            >
              📢 Clear Announcement Banner
            </div>
            <div className="text-sm text-gray">
              Removes banner from website immediately.
            </div>
          </div>
          <button className="btn btn-danger" onClick={clearBanner}>
            Clear Banner
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">ℹ️ System Info</h2>
        </div>
        <div className="card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr",
              gap: "12px 16px",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            <span className="text-gray">Backend URL</span>
            <code
              style={{
                background: "var(--bg-secondary)",
                padding: "4px 8px",
                borderRadius: "4px",
                color: "var(--success-color)",
              }}
            >
              {url}
            </code>
            <span className="text-gray">Database</span>
            <span>Supabase PostgreSQL + Render JSON Fallback</span>
            <span className="text-gray">Authentication</span>
            <span>Local JWT</span>
            <span className="text-gray">Admin Domain</span>
            <span>admin.avishkarkedar.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
