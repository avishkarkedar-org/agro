import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function BanEngine() {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBan, setNewBan] = useState({ ip_or_fingerprint: "", reason: "Violation of terms", days: 7 });

  useEffect(() => { fetchBans(); }, []);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/bans");
      setBans(res.bans || []);
    } catch (err) {
      console.error("Failed to fetch bans", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBan = async (e) => {
    e.preventDefault();
    if (!newBan.ip_or_fingerprint.trim()) return;
    setSaving(true);
    try {
      const res = await api("/api/admin/bans", {
        method: "POST",
        body: JSON.stringify(newBan),
      });
      notify(res.message || "Ban successfully added.");
      setNewBan({ ip_or_fingerprint: "", reason: "Violation of terms", days: 7 });
      fetchBans();
    } catch (err) {
      notify("Failed to add ban: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnban = async (id, target) => {
    if (!await confirmDialog(`Lift the ban for ${target}?`)) return;
    try {
      await api(`/api/admin/bans/${id}`, { method: "DELETE" });
      fetchBans();
    } catch (err) {
      notify("Failed to lift ban: " + err.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Advanced Ban Engine</h1>
        <p className="page-sub">Manage temporary and permanent IP bans for malicious users.</p>
      </div>

      <div className="card mb-4">
        <div className="card-hd"><span className="card-title">🚫 Add New Ban</span></div>
        <div className="card-body">
          <form onSubmit={handleCreateBan}>
            <div className="grid-form">
              <div className="form-group">
                <label>IP Address / Fingerprint</label>
                <input className="form-input" placeholder="e.g. 192.168.1.1" value={newBan.ip_or_fingerprint}
                  onChange={(e) => setNewBan({ ...newBan, ip_or_fingerprint: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input className="form-input" value={newBan.reason}
                  onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Duration (Days)</label>
                <input type="number" className="form-input" min="1" value={newBan.days}
                  onChange={(e) => setNewBan({ ...newBan, days: parseInt(e.target.value) || 1 })} required />
              </div>
            </div>
            <button type="submit" className="btn btn-danger" disabled={saving}>
              {saving ? "Applying..." : "Apply Ban"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">📋 Active Bans</span></div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading bans...</p>
          ) : bans.length === 0 ? (
            <p className="empty-state">No active bans in the system.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Target IP</th><th>Reason</th><th>Expires At</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {bans.map((ban) => (
                    <tr key={ban.id}>
                      <td><strong>{ban.ip_or_fingerprint}</strong></td>
                      <td>{ban.reason}</td>
                      <td>{ban.expires_at ? new Date(ban.expires_at).toLocaleString() : "—"}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => handleUnban(ban.id, ban.ip_or_fingerprint)}>
                          Lift Ban
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
