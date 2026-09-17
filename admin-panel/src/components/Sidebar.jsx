import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ isOpen, role, permissions = [] }) {
  const hasAccess = (id) => role === "superadmin" || permissions.includes(id);

  return (
    <nav className={`sidebar ${isOpen ? "open" : ""}`} id="sidebar">
      {hasAccess("dashboard") && (
        <>
          <div className="nav-section">Main</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">📊</span>Dashboard
          </NavLink>
          <NavLink
            to="/posts"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">📝</span>Manage Posts
          </NavLink>
        </>
      )}

      <div className="nav-sep"></div>
      <div className="nav-section">Settings</div>
      {hasAccess("youtube") && (
        <NavLink
          to="/youtube"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">▶️</span>YouTube Video
        </NavLink>
      )}
      <NavLink
        to="/announcement"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">📢</span>Announcement
      </NavLink>
      {hasAccess("mandi") && (
        <NavLink
          to="/mandi"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">💰</span>Mandi Prices
        </NavLink>
      )}
      <NavLink
        to="/rentals"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🚜</span>Tractor Rentals
      </NavLink>
      {hasAccess("news") && (
        <NavLink
          to="/news"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">📰</span>Custom News
        </NavLink>
      )}
      <NavLink
        to="/fuel"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">⛽</span>Fuel Prices
      </NavLink>
      <NavLink
        to="/feature-order"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">📐</span>Feature Order
      </NavLink>
      {hasAccess("feature-access") && (
        <NavLink
          to="/feature-access"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">🔒</span>Feature Access
        </NavLink>
      )}
      {hasAccess("feature-toggles") && (
        <NavLink
          to="/feature-toggles"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">🎛️</span>Master Switches
        </NavLink>
      )}
      {hasAccess("advanced-settings") && (
        <NavLink
          to="/advanced-settings"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">⚙️</span>Advanced Settings
        </NavLink>
      )}
      <NavLink
        to="/maintenance"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🚧</span>Maintenance Mode
      </NavLink>
      {role === "superadmin" && (
        <NavLink
          to="/rate-limits"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">⏱️</span>Rate Limits
        </NavLink>
      )}
      <NavLink
        to="/bans"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🚫</span>Ban Engine
      </NavLink>

      <div className="nav-sep"></div>
      <div className="nav-section">Analytics</div>
      <NavLink
        to="/visitors"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">👁️</span>Visitors
      </NavLink>
      {hasAccess("scans") && (
        <NavLink
          to="/scans"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">🔬</span>Scan Analytics
        </NavLink>
      )}
      <NavLink
        to="/ai-usage"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🤖</span>AI Usage
      </NavLink>
      {hasAccess("chat-logs") && (
        <NavLink
          to="/chat-logs"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">💬</span>Chat Logs
        </NavLink>
      )}
      <NavLink
        to="/health"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🟢</span>System Health
      </NavLink>
      <NavLink
        to="/feature-usage"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">📊</span>Feature Usage
      </NavLink>
      <NavLink
        to="/error-rate"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">⚠️</span>Error Rate
      </NavLink>
      <NavLink
        to="/heatmap"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🗺️</span>Metrics Heatmap
      </NavLink>
      <NavLink
        to="/blocked-ips"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🚫</span>Blocked IPs
      </NavLink>

      <div className="nav-sep"></div>
      <div className="nav-section">Community</div>
      <NavLink
        to="/users"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">👥</span>App Users
      </NavLink>
      <NavLink
        to="/messaging"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">📣</span>Messaging
      </NavLink>
      <NavLink
        to="/bugs"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🐞</span>Bug Reports
      </NavLink>

      <div className="nav-sep"></div>
      <div className="nav-section">Data</div>
      <NavLink
        to="/export"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">📥</span>Export
      </NavLink>
      <NavLink
        to="/backup"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">💾</span>Backup
      </NavLink>
      <NavLink
        to="/tasks"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">⚙️</span>Tasks
      </NavLink>

      <div className="nav-sep"></div>
      <div className="nav-section">Admin</div>
      {role === "superadmin" && (
        <>
          <NavLink
            to="/admins"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">🛡️</span>Manage Admins
          </NavLink>
          <NavLink
            to="/sessions"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">🛑</span>Session Revocation
          </NavLink>
          <NavLink
            to="/policies"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">🔐</span>Security Policies
          </NavLink>
          <NavLink
            to="/audit"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">📜</span>Audit Logs
          </NavLink>
        </>
      )}
      <NavLink
        to="/login-log"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🔐</span>Login Log
      </NavLink>
      <NavLink
        to="/access-codes"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🎟️</span>Access Codes
      </NavLink>
      {role === "superadmin" && (
        <>
          <NavLink
            to="/premium"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">💎</span>Premium Features
          </NavLink>
        </>
      )}
      <NavLink
        to="/change-password"
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">🔑</span>Change Password
      </NavLink>

      <div className="nav-sep"></div>
      <NavLink
        to="/danger"
        className={({ isActive }) =>
          `nav-item text-danger ${isActive ? "active" : ""}`
        }
        style={{ color: "var(--red)" }}
      >
        <span className="nav-icon">⚠️</span>Danger Zone
      </NavLink>
    </nav>
  );
}
