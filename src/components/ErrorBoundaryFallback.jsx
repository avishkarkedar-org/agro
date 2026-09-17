import React, { useEffect } from "react";
import { API } from "../context/SettingsContext";

export default function ErrorBoundaryFallback({ error, resetErrorBoundary }) {
  useEffect(() => {
    // If it's a Vite dynamic import chunk load error (usually means a new deploy happened),
    // force a page reload once to get the new index.html with the new hashes.
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      const reloaded = sessionStorage.getItem('vite-chunk-reload');
      if (!reloaded) {
        sessionStorage.setItem('vite-chunk-reload', 'true');
        window.location.reload();
        return;
      }
    }
    sessionStorage.removeItem('vite-chunk-reload');

    try {
      fetch(`${API}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "client_error",
          status: "error",
          detail: String(error && error.message ? error.message : error).slice(0, 300),
        }),
      }).catch(() => {});
    } catch (e) {}
  }, [error]);
  return (
    <div
      className="card"
      style={{
        padding: "20px",
        border: "1px solid var(--red)",
        background: "var(--s1)",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px", color: "var(--red)" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h3 className="sm bold mb1" style={{ color: "var(--amber, #f59e0b)" }}>
        Temporarily Unavailable
      </h3>
      <p
        className="xs t2 mb3"
        style={{ fontFamily: "var(--mono)", wordBreak: "break-word", maxWidth: "380px", margin: "0 auto 14px" }}
      >
        {error && error.message ? error.message : "This feature encountered a momentary error. Please try reloading."}
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
        <button className="btn btn-g btn-sm" onClick={resetErrorBoundary}>
          Retry Feature
        </button>
        <button className="btn btn-o btn-sm" onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    </div>
  );
}
