import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const noteBox = { background: "rgba(74,222,128,0.08)", border: "1px solid var(--b1)", borderRadius: "8px", padding: "10px 14px", margin: "0 0 16px", fontSize: "13px" };

export default function RateLimits() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ max_req: 20, window: 60 });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/settings");
      if (res.rate_limit_config) {
        setConfig({
          max_req: res.rate_limit_config.max_req || 20,
          window: res.rate_limit_config.window || 60,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ rate_limit_config: config }),
      });
      notify("Rate limit configuration saved successfully!");
    } catch (err) {
      notify("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Rate Limit Configurator</h1>
        <p className="page-sub">Dynamically adjust global API rate limits to mitigate abuse and DDoS attacks.</p>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">⚙️ Global Rate Limit</span></div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading...</p>
          ) : (
            <>
              <div className="grid-form">
                <div className="form-group">
                  <label>Maximum Requests</label>
                  <input type="number" className="form-input" value={config.max_req}
                    onChange={(e) => setConfig({ ...config, max_req: parseInt(e.target.value) || 0 })} />
                  <small className="page-sub">Max requests allowed per IP address.</small>
                </div>
                <div className="form-group">
                  <label>Time Window (seconds)</label>
                  <input type="number" className="form-input" value={config.window}
                    onChange={(e) => setConfig({ ...config, window: parseInt(e.target.value) || 0 })} />
                  <small className="page-sub">Period over which requests are counted.</small>
                </div>
              </div>

              <p style={noteBox}>
                <strong>Current rule:</strong> {config.max_req} requests every {config.window} seconds.
              </p>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Apply New Limits"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
