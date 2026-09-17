import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function SessionManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api("/api/superadmin/admins");
      setAdmins(res.admins || []);
    } catch (err) {
      console.error("Failed to fetch admins", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (username) => {
    if (!await confirmDialog(`Revoke all sessions for ${username}? They will be forced to log in again.`)) return;
    try {
      const res = await api(`/api/superadmin/admins/${username}/revoke`, { method: "POST" });
      notify(res.message || "Sessions revoked successfully");
      fetchAdmins();
    } catch (err) {
      notify("Failed to revoke session: " + err.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Session Management</h1>
        <p className="page-sub">Instantly revoke active sessions for compromised admin accounts.</p>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">🔑 Active Admin Sessions</span></div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading admins...</p>
          ) : admins.length === 0 ? (
            <p className="empty-state">No admins found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Username</th><th>Last Login IP</th><th>Last Force-Logout</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.username}</strong></td>
                      <td>{admin.last_login_ip || "Unknown"}</td>
                      <td>{admin.force_logout_ts ? new Date(admin.force_logout_ts).toLocaleString() : "None"}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRevoke(admin.username)}>
                          Revoke Sessions
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
