import React from 'react';
import { Link } from 'react-router-dom';

// CUSTOM_404_R151 - previously an unmatched route (e.g. a stale bookmark or
// a mistyped URL) fell through the <Routes> with nothing rendered, which on
// this SPA meant a blank page rather than a real error state. _redirects
// already serves index.html with a 200 for any path (required so refreshing
// a client-side route works at all on Cloudflare Pages), so the only place
// a friendly "not found" message can be produced is here, client-side.
export default function NotFound() {
  return (
    <div className="main" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "56px", marginBottom: "10px" }}>🌾</div>
      <h1 className="t1" style={{ marginBottom: "10px" }}>Page not found</h1>
      <p className="t3" style={{ marginBottom: "26px", lineHeight: "1.6", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
        The page you're looking for doesn't exist or may have moved. Let's get
        you back to something useful.
      </p>
      <Link
        to="/"
        className="btn btn-g"
        style={{ textDecoration: "none", display: "inline-flex" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
