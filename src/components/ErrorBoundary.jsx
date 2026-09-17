import React, { Component } from "react";
import { API } from "../context/SettingsContext";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      return { hasError: true, error, isChunkError: true };
    }
    return { hasError: true, error, isChunkError: false };
  }

  componentDidCatch(error, errorInfo) {
    if (this.state.isChunkError) {
      const reloaded = sessionStorage.getItem('vite-chunk-reload');
      if (!reloaded) {
        sessionStorage.setItem('vite-chunk-reload', 'true');
        window.location.reload();
        return;
      }
    }
    sessionStorage.removeItem('vite-chunk-reload');
    console.error("ErrorBoundary caught an error", error, errorInfo);
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid var(--red)",
            borderRadius: "12px",
            margin: "20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ marginBottom: "8px", color: "var(--red)" }}>
            Something went wrong.
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--t2)",
              marginBottom: "16px",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="eb-actions">
            <button
              className="btn btn-g btn-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              ↻ Try Again
            </button>
            <button
              className="btn btn-o btn-sm"
              onClick={() => window.location.reload()}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
