import { notify } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api, API } from "../utils/api";

/* AIUSAGE_REAL_DATA_R111
   Previously this page read stats.today_scans, stats.total_scans and
   stats.daily. /api/admin/ai-usage returns none of those keys, so every value
   fell back to 0 and the daily chart never rendered. It also hardcoded a model
   name that this app never used, a request quota belonging to a different
   model, and per-call token estimates. All of it is replaced by the live
   figures the endpoint actually sends.

   Do not reintroduce a hardcoded quota here. The correct value depends on which
   model GROQ_MODEL points at and will silently go stale again. */

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");

const compact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(v);
};

const shortDate = (d) => (typeof d === "string" ? d.slice(5) : "");

const sinceLabel = (iso) => {
  if (!iso) return "server start";
  try {
    return new Date(iso).toLocaleString("en-IN");
  } catch (e) {
    return String(iso);
  }
};

const boxStyle = {
  padding: "12px",
  background: "var(--s1)",
  borderRadius: "8px",
  border: "1px solid var(--b1)",
};

const boxLabelStyle = {
  fontSize: "10px",
  color: "var(--t3)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "4px",
};

const monoStyle = {
  fontSize: "12px",
  color: "var(--text)",
  fontFamily: "var(--mono)",
  wordBreak: "break-all",
};

const barTrack = {
  height: "10px",
  background: "var(--s2)",
  borderRadius: "5px",
  overflow: "hidden",
  border: "1px solid var(--b1)",
};

export default function AiUsage() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aiStats, healthCheck] = await Promise.all([
        api("/api/admin/ai-usage"),
        fetch(API + "/health")
          .then((r) => r.json())
          .catch(() => ({ status: "unknown", groq: false })),
      ]);
      setStats(aiStats);
      setHealth(healthCheck);
    } catch (e) {
      console.error(e);
      notify("Failed to load AI usage stats: " + e.message);
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
        <span className="spinner"></span> Loading AI usage dashboard...
      </div>
    );

  const totalTokens = Number(stats?.total_tokens) || 0;
  const totalCalls = Number(stats?.total_calls) || 0;
  const avgTokens = totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0;

  const daily = Array.isArray(stats?.daily_usage)
    ? stats.daily_usage.slice(-14)
    : [];
  const bySource = Array.isArray(stats?.top_users) ? stats.top_users : [];
  const modelSplit =
    stats?.model_split && typeof stats.model_split === "object"
      ? stats.model_split
      : {};
  const modelRows = Object.keys(modelSplit)
    .map((m) => ({ model: m, pct: Number(modelSplit[m]) || 0 }))
    .sort((a, b) => b.pct - a.pct);

  const maxDaily =
    daily.length > 0
      ? Math.max(...daily.map((d) => Number(d.tokens) || 0), 1)
      : 1;
  const maxSource =
    bySource.length > 0
      ? Math.max(...bySource.map((s) => Number(s.tokens) || 0), 1)
      : 1;

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">🤖 AI Usage Dashboard</h1>
        <p className="page-sub">
          Live Groq token consumption, recorded from every API response
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-green">
          <div className="stat-num">{fmt(totalCalls)}</div>
          <div className="stat-lbl">AI Calls Recorded</div>
          <div className="stat-icon">🤖</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-num">{compact(totalTokens)}</div>
          <div className="stat-lbl">Tokens Used</div>
          <div className="stat-icon">🔤</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-num">{fmt(avgTokens)}</div>
          <div className="stat-lbl">Avg Tokens / Call</div>
          <div className="stat-icon">📊</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-num">{health?.groq ? "✅" : "❌"}</div>
          <div className="stat-lbl">Groq API Status</div>
          <div className="stat-icon">🟢</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🧠 Models Actually Used</span>
          <button className="btn btn-sm btn-outline" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {modelRows.length === 0 ? (
            <p className="empty-state">
              No AI calls recorded since the last server restart.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Model ID</th>
                    <th style={{ width: "90px" }}>Share</th>
                    <th style={{ width: "40%" }}>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.map((row) => (
                    <tr key={row.model}>
                      <td>
                        <code style={monoStyle}>{row.model}</code>
                      </td>
                      <td>
                        <strong>{row.pct}%</strong>
                      </td>
                      <td>
                        <div style={barTrack}>
                          <div
                            style={{
                              height: "100%",
                              width: row.pct + "%",
                              background:
                                "linear-gradient(90deg, var(--g3), var(--green))",
                              transition: "width .4s ease",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--t3)",
                  marginTop: "8px",
                }}
              >
                * Read from live API responses, not from configuration. If a
                model ID here is unexpected, check GROQ_MODEL and
                GROQ_VISION_MODEL on Render.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📊 Tokens Per Day</span>
        </div>
        <div className="card-body">
          {daily.length === 0 ? (
            <div className="empty-state">
              <p>No daily usage recorded yet</p>
            </div>
          ) : (
            <div className="chart-bar" style={{ height: "140px" }}>
              {daily.map((d, i) => (
                <div className="chart-col" key={i}>
                  <div className="chart-val">{compact(d.tokens)}</div>
                  <div
                    className="chart-fill"
                    style={{
                      height:
                        Math.round(((Number(d.tokens) || 0) / maxDaily) * 100) +
                        "%",
                      maxWidth: "40px",
                      minHeight: "4px",
                      borderRadius: "6px 6px 0 0",
                      background:
                        "linear-gradient(to top, var(--g3), var(--green))",
                      transition: "height .5s ease",
                    }}
                  />
                  <div className="chart-label">{shortDate(d.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🔍 Usage By Feature</span>
        </div>
        <div className="card-body">
          {bySource.length === 0 ? (
            <p className="empty-state">No feature-level usage recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th style={{ width: "110px" }}>Tokens</th>
                    <th style={{ width: "40%" }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((s, i) => (
                    <tr key={i}>
                      <td>{s.username || "unknown"}</td>
                      <td>
                        <span className="tag tag-green">
                          {compact(s.tokens)}
                        </span>
                      </td>
                      <td>
                        <div style={barTrack}>
                          <div
                            style={{
                              height: "100%",
                              width:
                                Math.round(
                                  ((Number(s.tokens) || 0) / maxSource) * 100,
                                ) + "%",
                              background:
                                "linear-gradient(90deg, var(--bdim), var(--blue))",
                              transition: "width .4s ease",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">ℹ️ How To Read This Page</span>
        </div>
        <div className="card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: "12px",
            }}
          >
            <div style={boxStyle}>
              <div style={boxLabelStyle}>Counting Since</div>
              <div style={{ fontSize: "12px", color: "var(--text)" }}>
                {sinceLabel(stats?.since)}
              </div>
            </div>
            <div style={boxStyle}>
              <div style={boxLabelStyle}>Provider</div>
              <div style={{ fontSize: "12px", color: "var(--text)" }}>
                Groq &bull;{" "}
                {health?.groq ? (
                  <span style={{ color: "var(--green)" }}>Connected</span>
                ) : (
                  <span style={{ color: "var(--red)" }}>Disconnected</span>
                )}
              </div>
            </div>
            <div style={boxStyle}>
              <div style={boxLabelStyle}>Source Of Numbers</div>
              <div style={{ fontSize: "12px", color: "var(--text)" }}>
                Token totals reported by the Groq API on each response
              </div>
            </div>
          </div>
          <p
            style={{ fontSize: "11px", color: "var(--t3)", marginTop: "10px" }}
          >
            These counters are held in memory and reset to zero whenever the
            backend restarts. On Render&apos;s free tier the instance sleeps
            after roughly 15 minutes of inactivity, so a low total here often
            means a recent restart rather than low usage. Request-per-day quotas
            are intentionally not shown, because the limit depends on which
            model is configured and any fixed number printed here would go stale.
          </p>
        </div>
      </div>
    </div>
  );
}
