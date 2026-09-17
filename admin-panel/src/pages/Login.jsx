import React, { useState } from "react";
import { api } from "../utils/api";

export default function Login({ setIsAuth, setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("admin_token", res.access_token);

      const me = await api("/api/admin/me", {
        headers: { Authorization: `Bearer ${res.access_token}` },
      });
      setUser(me);
      setIsAuth(true);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🌾</div>
          <div className="login-title">AgroIntel</div>
          <div className="login-sub">Admin Control Panel</div>
        </div>
        {error && <div className="login-err show">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className={`btn btn-primary btn-full ${loading ? "btn-loading" : ""}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
