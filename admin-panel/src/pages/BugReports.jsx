import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const COLUMNS = [
  { key: "open", label: "Open", tag: "tag-blue" },
  { key: "in_progress", label: "In Progress", tag: "tag-amber" },
  { key: "resolved", label: "Resolved", tag: "tag-green" },
  { key: "closed", label: "Closed", tag: "tag-red" },
];

const headRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "20px" };
const colCard = { display: "flex", flexDirection: "column" };
const colBody = { display: "flex", flexDirection: "column", gap: "12px" };
const emptyPad = { padding: "16px" };
const bugCard = { background: "rgba(255,255,255,0.03)", border: "1px solid var(--b1)", borderRadius: "10px", padding: "12px" };
const titleRow = { display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center" };
const descStyle = { margin: "6px 0" };
const metaRow = { display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center", marginTop: "8px" };
const selectStyle = { width: "auto", padding: "4px 8px", fontSize: "12px" };
const userLine = { display: "block", marginTop: "6px" };

export default function BugReports() {
  const [bugs, setBugs] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [sendingReply, setSendingReply] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBugs(); }, []);

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/bugs");
      setBugs(res.bugs || []);
    } catch (err) {
      console.error("Failed to fetch bugs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id) => {
    const text = (replyTexts[id] || "").trim();
    if (!text) return;
    setSendingReply(id);
    try {
      await api(`/api/admin/bugs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ admin_reply: text }),
      });
      notify("Reply sent for bug #" + id);
      setReplyTexts((prev) => ({ ...prev, [id]: "" }));
      fetchBugs();
    } catch (err) {
      notify("Reply failed: " + err.message);
    } finally {
      setSendingReply(null);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api(`/api/admin/bugs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      fetchBugs();
    } catch (err) {
      notify("Failed to update bug: " + err.message);
    }
  };

  const priorityTag = (p) => (p === "high" ? "tag-red" : p === "low" ? "tag-green" : "tag-amber");

  return (
    <div className="page active">
      <div className="page-header" style={headRow}>
        <div>
          <h1 className="page-title">Bug Reports</h1>
          <p className="page-sub">Track and resolve user-submitted bugs and platform feedback.</p>
        </div>
        <div className="flex gap2">
          <button className="btn btn-outline btn-sm" onClick={fetchBugs}>🔄 Refresh</button>
          {/* BUGS_CSV_R97: export all bugs as dated CSV */}
          <button className="btn btn-outline btn-sm" onClick={() => {
            if (!bugs.length) { notify("No bugs to export."); return; }
            const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
            const rows = [
              "ID,Title,Status,Priority,User,Description",
              ...bugs.map(b => [b.id, esc(b.title), b.status||"open", b.priority||"medium", esc(b.user_identifier), esc(b.description)].join(","))
            ].join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
            a.download = `bug_reports_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            notify(`✅ Exported ${bugs.length} bug report(s).`);
          }}>⬇ Export CSV</button>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading board...</p>
      ) : (
        <div style={grid}>
          {COLUMNS.map((col) => {
            const colBugs = bugs.filter((b) => (b.status || "open") === col.key);
            return (
              <div key={col.key} className="card" style={colCard}>
                <div className="card-hd">
                  <span className="card-title">{col.label} <span className={`tag ${col.tag}`}>{colBugs.length}</span></span>
                </div>
                <div className="card-body" style={colBody}>
                  {colBugs.length === 0 ? (
                    <p className="empty-state" style={emptyPad}>No bugs here</p>
                  ) : (
                    colBugs.map((bug) => (
                      <div key={bug.id} style={bugCard}>
                        <div style={titleRow}>
                          <strong>{bug.title || "Untitled"}</strong>
                          <span className={`tag ${priorityTag(bug.priority)}`}>{bug.priority || "medium"}</span>
                        </div>
                        <p className="page-sub" style={descStyle}>{bug.description}</p>
                        <div style={metaRow}>
                          <span className="tag tag-blue">ID: {bug.id}</span>
                          <select className="form-input" style={selectStyle}
                            value={bug.status || "open"} onChange={(e) => handleUpdateStatus(bug.id, e.target.value)}>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        {bug.user_identifier && (
                          <small className="page-sub" style={userLine}>User: {bug.user_identifier}</small>
                        )}
                        <div className="mt2">
                          <textarea
                            className="form-input"
                            rows="2"
                            placeholder="Admin reply..."
                            value={replyTexts[bug.id] || ""}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [bug.id]: e.target.value }))}
                            aria-label={"Reply to bug " + bug.id}
                          />
                          <button
                            className="btn btn-primary btn-sm mt1"
                            onClick={() => handleReply(bug.id)}
                            disabled={sendingReply === bug.id || !(replyTexts[bug.id] || "").trim()}
                            aria-label={"Send reply to bug " + bug.id}
                          >
                            {sendingReply === bug.id ? "Sending..." : "Send Reply"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
