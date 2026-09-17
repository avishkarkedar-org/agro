import { notify } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

/* ERRORRATE_THRESHOLD_R114
   The Alert Threshold used to PATCH `error_alert_threshold` to
   /api/admin/settings. That key is not in ALLOWED_SETTINGS_KEYS, so the request
   always came back 400 and the save never worked. Worse, nothing read the value:
   bar highlighting was hardcoded at 20% and the summary card at 10%, so the
   input could not affect the page even if it had saved.

   It is a viewing preference, not server state, so it now lives in
   localStorage and genuinely drives both the card colour and the bar
   highlighting. Do not "restore" the PATCH: the settings table has no such
   column. */

const THRESHOLD_KEY = "agrointel_admin_error_threshold";
const DEFAULT_THRESHOLD = 10;

function readThreshold() {
  try {
    const n = parseInt(localStorage.getItem(THRESHOLD_KEY), 10);
    if (!isNaN(n) && n >= 1 && n <= 100) return n;
  } catch (e) {
    /* private mode / storage disabled */
  }
  return DEFAULT_THRESHOLD;
}

function writeThreshold(value) {
  try {
    localStorage.setItem(THRESHOLD_KEY, String(value));
    return true;
  } catch (e) {
    return false;
  }
}

export default function ErrorRate() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(readThreshold);

  const saveThreshold = () => {
    const value = Math.min(100, Math.max(1, parseInt(threshold, 10) || DEFAULT_THRESHOLD));
    setThreshold(value);
    if (writeThreshold(value)) {
      notify("Threshold set to " + value + "% for this browser");
    } else {
      notify("Could not save the threshold - browser storage is unavailable");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/admin/error-stats");
      setStats(data);
    } catch (e) {
      console.error(e);
      notify("Failed to load error stats: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading error statistics...
      </div>
    );

  const total = stats?.total || 0;
  const errors = stats?.errors || 0;
  const lowConfidence = stats?.low_confidence || 0;
  const errorRate = stats?.error_rate || 0;
  const byDay = stats?.by_day || {};
  const days = Object.keys(byDay).slice(0, 7);
  const maxDay = Math.max(...days.map((d) => byDay[d].total), 1);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Error Rate</h1>
        <p className="page-sub">AI scan failures and low-confidence results</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-green">
          <div className="stat-num">{total}</div>
          <div className="stat-lbl">Total Scans</div>
          <div className="stat-icon">🔬</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-num">{errors}</div>
          <div className="stat-lbl">Failed (0% conf)</div>
          <div className="stat-icon">❌</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-num">{lowConfidence}</div>
          <div className="stat-lbl">Low Confidence (&lt;50%)</div>
          <div className="stat-icon">⚠️</div>
        </div>
        <div
          className={`stat-card ${errorRate > threshold ? "stat-red" : "stat-green"}`}
        >
          <div className="stat-num">{errorRate}%</div>
          <div className="stat-lbl">Error Rate</div>
          <div className="stat-icon">📉</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📉 Errors by Day (Last 7 Days)</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {days.length === 0 ? (
            <div className="empty-state">
              <p>No scan data available yet</p>
            </div>
          ) : (
            <div>
              <div className="chart-bar" style={{ height: "140px" }}>
                {days.map((d) => {
                  const pct = Math.round((byDay[d].total / maxDay) * 100);
                  const errPct =
                    byDay[d].total > 0
                      ? Math.round((byDay[d].errors / byDay[d].total) * 100)
                      : 0;
                  const isHighError = errPct > threshold;
                  return (
                    <div className="chart-col" key={d}>
                      <div className="chart-val">{byDay[d].total}</div>
                      <div
                        title={`${d}: ${byDay[d].total} scans, ${byDay[d].errors} failed (${errPct}%)`}
                        style={{
                          width: "100%",
                          maxWidth: "40px",
                          height: `${pct}%`,
                          borderRadius: "6px 6px 0 0",
                          background: isHighError
                            ? "linear-gradient(to top, var(--red), #f87171)"
                            : "linear-gradient(to top, var(--g3), var(--green))",
                          minHeight: "4px",
                          transition: "height .5s ease",
                        }}
                      />
                      <div className="chart-label">{d.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <p
                style={{
                  fontSize: "10px",
                  color: "var(--t3)",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                * Red bars indicate a daily failure rate above {threshold}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">⚠️ Highlight Threshold</span>
        </div>
        <div className="card-body">
          <label className="xs bold">Highlight days with a failure rate above (%)</label>
          <div className="flex gap2 mt2">
            <input
              type="number"
              className="form-input"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              aria-label="Error rate highlight threshold"
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={saveThreshold}
              aria-label="Save highlight threshold"
            >
              Save
            </button>
          </div>
          <p className="xs t2 mt1">
            Currently {threshold}%. This is a display preference stored in this
            browser only - it is not a server-side alert and does not notify
            anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
