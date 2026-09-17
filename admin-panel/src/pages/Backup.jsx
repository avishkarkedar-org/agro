import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Backup() {
  const [lastBackup, setLastBackup] = useState("");
  const [restoreData, setRestoreData] = useState(null);
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("lastBackupDate");
    if (saved) setLastBackup(saved);
  }, []);

  const downloadBackup = async () => {
    try {
      const data = await api("/api/settings");
      const backup = {
        ...data,
        _backup_date: new Date().toISOString(),
        _backup_version: "agrointel_v13",
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `agrointel_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString();
      localStorage.setItem("lastBackupDate", now);
      setLastBackup(now);
      notify("✅ Backup downloaded successfully!");
    } catch (e) {
      console.error(e);
      notify("Backup failed: " + e.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        setRestoreData(parsed);
        const keys = Object.keys(parsed).filter((k) => !k.startsWith("_"));
        setPreviewContent(
          `Keys to restore: ${keys.join(", ")}\n\nPreview:\n${JSON.stringify(parsed, null, 2).slice(0, 500)}...`,
        );
      } catch (err) {
        notify("Invalid JSON file format.");
        setRestoreData(null);
        setPreviewContent("");
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = async () => {
    if (!restoreData) {
      notify("No valid backup loaded");
      return;
    }
    if (
      !await confirmDialog(
        "Restore settings from this backup? This will overwrite current settings.",
      )
    )
      return;
    if (!await confirmDialog("Are you absolutely sure? This cannot be undone."))
      return;

    try {
      const toRestore = {};
      const allowed = [
        "youtube_id",
        "announcement",
        "ann_image",
        "ann_start_date",
        "ann_end_date",
        "mandi_prices",
        "maintenance_mode",
        "rentals",
        "custom_news",
        "bulk_message",
        "feature_order",
        "login_required_features",
      ];
      allowed.forEach((k) => {
        if (restoreData[k] !== undefined) toRestore[k] = restoreData[k];
      });

      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(toRestore),
      });

      notify("✅ Settings restored successfully!");
      setRestoreData(null);
      setPreviewContent("");
      // Reset file input
      const fileInput = document.getElementById("restoreFile");
      if (fileInput) fileInput.value = "";
    } catch (e) {
      notify("Restore failed: " + e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Backup & Restore</h1>
        <p className="page-sub">Download and restore platform settings</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">💾 Download Backup</span>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Download a JSON backup of all platform settings (YouTube
            configuration, announcements, mandi prices, rentals, custom news,
            etc.)
          </p>
          <button className="btn btn-primary" onClick={downloadBackup}>
            ⬇️ Download Settings Backup
          </button>
          <div
            style={{ marginTop: "10px", fontSize: "11px", color: "var(--t3)" }}
          >
            {lastBackup
              ? `Last backup: ${lastBackup}`
              : "No backups downloaded yet"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📤 Restore from Backup</span>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Upload a previously downloaded JSON backup file to restore settings.
          </p>
          <input
            type="file"
            id="restoreFile"
            accept=".json"
            className="form-input"
            style={{ padding: "10px" }}
            onChange={handleFileChange}
          />
          {restoreData && (
            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  padding: "12px",
                  background: "var(--s2)",
                  border: "1px solid var(--b1)",
                  borderRadius: "8px",
                  marginBottom: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--t2)",
                    marginBottom: "6px",
                  }}
                >
                  Preview of settings to restore:
                </p>
                <pre
                  style={{
                    fontSize: "11px",
                    color: "var(--text)",
                    maxHeight: "200px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {previewContent}
                </pre>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={confirmRestore}
              >
                ✓ Confirm Restore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
