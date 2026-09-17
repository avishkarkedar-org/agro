import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function ChatLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/admin/chat-logs")
      .then((res) => setLogs(res.logs || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const header = "Timestamp,Crop,Disease,Question,Answer\n";
    const rows = logs.map((l) =>
      [new Date(l.created_at).toLocaleString(), l.crop, l.disease,
       (l.question || "").replace(/,/g, ";"),
       (l.answer || "").replace(/,/g, ";")].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "chat_logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div className="page active">
        <div className="loading-center">
          <span className="spinner spinner-lg"></span>
        </div>
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">AI Chat Logs</h1>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">Chat Logs ({logs.length})</span>
          <div className="flex gap1">
            <input className="search-input" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crop or question..."
              aria-label="Search chat logs" />
            <button className="btn btn-outline btn-sm" onClick={exportCsv}
              aria-label="Export chat logs as CSV">⬇ CSV</button>
          </div>
        </div>
        <div className="card-body">
          {logs.length === 0 && (
            <p className="text-gray">No chat logs found.</p>
          )}
          {logs
            .filter((l) => !search ||
              (l.crop || "").toLowerCase().includes(search.toLowerCase()) ||
              (l.question || "").toLowerCase().includes(search.toLowerCase()))
            .map((l, i) => (
            <div
              key={i}
              style={{
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <div className="text-gray text-sm">
                {new Date(l.created_at).toLocaleString()} | Crop: {l.crop} |
                Disease: {l.disease}
              </div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                Q: {l.question}
              </div>
              <div style={{ marginTop: "4px", color: "var(--text-secondary)" }}>
                A: {l.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
