import { notify, confirmDialog } from "../utils/notify";
import React from "react";
import { api, API } from "../utils/api";

export default function Export() {
  const [format, setFormat] = React.useState("csv");
  const exportData = async (type) => {
    try {
      const token = localStorage.getItem("admin_token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/api/admin/export?type=${type}&format=${format}`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to export data from server");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().slice(0,10)}.${format}`; // EXPORT_DATE_R97
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify(`✅ ${type} exported successfully!`);
    } catch (e) {
      console.error(e);
      notify("Export failed: " + e.message);
    }
  };

  const exportSettings = async () => {
    try {
      const data = await api("/api/settings");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agrointel_settings.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify("✅ Settings exported as JSON successfully!");
    } catch (e) {
      console.error(e);
      notify("Export failed: " + e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Export Data</h1>
        <p className="page-sub">Download platform data as CSV/JSON files</p>
      </div>

      <div className="flex gap2 mb3 aic">
        <label className="xs bold">Export Format:</label>
        <select className="form-input" value={format}
          onChange={(e) => setFormat(e.target.value)}
          aria-label="Export format selector">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>
      <div className="stat-grid">
        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => exportData("posts")}
        >
          <div
            className="stat-num"
            style={{ fontSize: "24px", color: "var(--green)" }}
          >
            📝
          </div>
          <div className="stat-lbl" style={{ marginTop: "8px" }}>
            Export Posts
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}
          >
            Download all community posts as CSV
          </div>
        </div>
        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => exportData("visitors")}
        >
          <div
            className="stat-num"
            style={{ fontSize: "24px", color: "var(--blue)" }}
          >
            👁️
          </div>
          <div className="stat-lbl" style={{ marginTop: "8px" }}>
            Export Visitors
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}
          >
            Download visitor logs as CSV
          </div>
        </div>
        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => exportData("users")}
        >
          <div
            className="stat-num"
            style={{ fontSize: "24px", color: "var(--purple)" }}
          >
            👥
          </div>
          <div className="stat-lbl" style={{ marginTop: "8px" }}>
            Export Users
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}
          >
            Download registered users as CSV
          </div>
        </div>
        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => exportData("scan_logs")}
        >
          <div
            className="stat-num"
            style={{ fontSize: "24px", color: "var(--amber)" }}
          >
            🔬
          </div>
          <div className="stat-lbl" style={{ marginTop: "8px" }}>
            Export Scan Logs
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}
          >
            Download scan analytics as CSV
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">⚙️ Settings Export</span>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Download all platform settings as a JSON file (including
            announcements, mandi configuration, rental lists, YouTube IDs).
          </p>
          <button className="btn btn-outline" onClick={exportSettings}>
            📥 Download Settings JSON
          </button>
        </div>
      </div>
    </div>
  );
}
