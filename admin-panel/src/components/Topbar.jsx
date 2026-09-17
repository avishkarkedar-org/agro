import React from "react";

export default function Topbar({ setIsAuth, user, setSidebarOpen }) {
  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuth(false);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="topbar-logo">
          <div className="topbar-icon">🌾</div>
          <span>AgroIntel</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-user">
          <span>{user?.username || "Admin"}</span>
          <div className="topbar-role">{user?.role || "admin"}</div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
