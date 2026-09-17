import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Link, useNavigate } from "react-router-dom";

const AVAILABLE_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "youtube", label: "YouTube Settings" },
  { id: "mandi", label: "Mandi Prices" },
  { id: "feature-access", label: "Feature Access" },
  { id: "feature-toggles", label: "Master Switches" },
  { id: "advanced-settings", label: "Advanced Settings" },
  { id: "users", label: "App Users" },
  { id: "scans", label: "Scan Analytics" },
  { id: "chat-logs", label: "Chat Logs" },
  { id: "news", label: "News Manager" },
];

export default function ManageAdmins({ user }) {
  const [admins, setAdmins] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Create form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  // Edit form state
  const [editPermissions, setEditPermissions] = useState([]);
  const [editSuspended, setEditSuspended] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await api("/api/superadmin/admins");
      setAdmins(data.admins || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!username || !password)
      return notify("Username and password are required");
    try {
      await api("/api/superadmin/admins", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      });
      notify("Admin created successfully!");
      setUsername("");
      setPassword("");
      setShowCreate(false);
      loadAdmins();
    } catch (e) {
      notify(e.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!await confirmDialog(`Delete admin "${name}"?`)) return;
    try {
      await api(`/api/superadmin/admins/${id}`, { method: "DELETE" });
      notify("Admin deleted");
      loadAdmins();
    } catch (e) {
      notify(e.message);
    }
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setEditPermissions(admin.allowed_permissions || []);
    setEditSuspended(admin.is_suspended || false);
    setNewPassword("");
  };

  const handleSaveEdit = async () => {
    try {
      await api(`/api/superadmin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          allowed_permissions: editPermissions,
          is_suspended: editSuspended,
          password: newPassword || null,
        }),
      });
      notify("Admin profile updated!");
      setEditingAdmin(null);
      loadAdmins();
    } catch (e) {
      notify(e.message);
    }
  };

  const togglePermission = (id) => {
    if (editPermissions.includes(id)) {
      setEditPermissions(editPermissions.filter((p) => p !== id));
    } else {
      setEditPermissions([...editPermissions, id]);
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading admins...
      </div>
    );

  return (
    <div className="page active" style={{ maxWidth: "1200px" }}>
      <div className="page-header">
        <h1 className="page-title">Manage Admins & RBAC</h1>
        <p className="page-sub">
          Control admin accounts, permissions, and security
        </p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">🛡️ Admin Directory</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Admin
          </button>
        </div>
        <div className="card-body">
          {admins.length === 0 ? (
            <p className="empty-state">No admins found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role & Status</th>
                    <th>Last Login</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.username}>
                      <td style={{ fontWeight: "bold" }}>{a.username}</td>
                      <td>
                        <span
                          className={`tag ${a.role === "superadmin" ? "tag-purple" : "tag-blue"}`}
                          style={{ marginRight: "8px" }}
                        >
                          {a.role}
                        </span>
                        {a.is_suspended && (
                          <span className="tag tag-red">Suspended</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: "12px" }}>
                          {a.last_login_at
                            ? new Date(a.last_login_at).toLocaleString()
                            : "Never"}
                        </div>
                        {a.last_login_ip && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "var(--t3)",
                              fontFamily: "monospace",
                            }}
                          >
                            IP: {a.last_login_ip}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => openEdit(a)}
                          >
                            ⚙️ Edit Settings
                          </button>
                          <Link
                            to={`/audit?user=${a.username}`}
                            className="btn btn-sm btn-outline"
                          >
                            📜 Activity
                          </Link>
                          {a.username !== user?.username && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(a.id, a.username)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "20px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="card-hd flex jcb aic">
              <span className="card-title">
                Editing: {editingAdmin.username}
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setEditingAdmin(null)}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              {editingAdmin.role === "admin" ? (
                <>
                  <h4 style={{ marginBottom: "10px" }}>
                    Role-Based Access Control (RBAC)
                  </h4>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--t3)",
                      marginBottom: "15px",
                    }}
                  >
                    Select which pages this admin is allowed to access.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "20px",
                      background: "var(--s2)",
                      padding: "15px",
                      borderRadius: "8px",
                    }}
                  >
                    {AVAILABLE_PERMISSIONS.map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editPermissions.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                        />
                        <span style={{ fontSize: "13px" }}>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: "15px",
                    background: "var(--s2)",
                    borderRadius: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--purple)",
                      margin: 0,
                    }}
                  >
                    <strong>Superadmin Status:</strong> This user has
                    unrestricted access to all pages.
                  </p>
                </div>
              )}

              <h4 style={{ marginBottom: "10px" }}>Security Controls</h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  background: "var(--s2)",
                  padding: "15px",
                  borderRadius: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "var(--red)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editSuspended}
                    onChange={(e) => setEditSuspended(e.target.checked)}
                    disabled={editingAdmin.username === user.username}
                  />
                  <span style={{ fontWeight: "bold" }}>
                    Suspend Account (Block Login)
                  </span>
                </label>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      marginBottom: "5px",
                    }}
                  >
                    Force Password Reset
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Type new password to overwrite..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button className="btn btn-primary" onClick={handleSaveEdit}>
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">➕ Create New Admin</span>
          </div>
          <div className="card-body">
            <div className="grid-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                Create
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
