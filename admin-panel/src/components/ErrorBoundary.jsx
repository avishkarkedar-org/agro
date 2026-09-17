import React, { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
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
            Something went wrong in Admin.
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
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.location.reload()}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
