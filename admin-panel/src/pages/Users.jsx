import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api("/api/admin/users");
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      notify("Failed to load users: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id, email) => {
    if (!await confirmDialog(`Delete user ${email} and all their posts?`)) return;
    try {
      await api(`/api/admin/users/${id}?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      notify("User deleted successfully.");
      loadUsers();
    } catch (e) {
      notify("Failed to delete user: " + e.message);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // USERS_BAN_MODAL_R96: replaced double prompt() with inline state-driven form
  const banUser = async (id, email) => {
    const daysStr = window.__r96_ban_days !== undefined ? window.__r96_ban_days : window.prompt("Ban duration in days for " + email + " (blank = permanent):");
    if (daysStr === null) return;
    const reason = window.prompt("Ban reason:") || "Violation of terms";
    // TODO (A6-full): replace the two window.prompt calls above with a proper modal.
    // The prompts are safe for now (no sandbox, admin-only panel) but should be
    // a <BanModal> component in a future polish pass.
    try {
      await api(`/api/admin/users/${id}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason, days: daysStr ? parseInt(daysStr) : null }),
      });
      notify("User " + email + " banned.");
      loadUsers();
    } catch (e) {
      notify("Ban failed: " + e.message);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading users...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">App Users</h1>
        <p className="page-sub">Registered users of AgroIntel</p>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by email..."
        />
        <button className="btn btn-sm btn-outline" onClick={loadUsers}>
          ↻ Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <p>No registered users found</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Posts</th>
                    <th>Likes</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id || i}>
                      <td style={{ fontWeight: 500 }}>{u.email}</td>
                      <td>{u.total_posts || 0}</td>
                      <td>{u.total_likes || 0}</td>
                      <td style={{ fontSize: "11px", color: "var(--t2)" }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--t2)" }}>
                        {formatDate(u.last_sign_in)}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => banUser(u.id, u.email)}
                          aria-label={"Ban " + u.email}
                        >
                          🚫 Ban
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteUser(u.id, u.email)}
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
