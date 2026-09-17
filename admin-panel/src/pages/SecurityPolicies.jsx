import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function SecurityPolicies() {
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

  const handleUpdatePolicy = async (username, currentPolicy) => {
    const currentIps = currentPolicy?.allowed_ips?.join(", ") || "";
    const input = prompt(`Allowed IP addresses for ${username} (comma separated).\nLeave blank to allow all IPs:`, currentIps);
    if (input === null) return;
    const allowed_ips = input.split(",").map((ip) => ip.trim()).filter((ip) => ip.length > 0);
    try {
      const res = await api(`/api/superadmin/admins/${username}/policy`, {
        method: "POST",
        body: JSON.stringify({ allowed_ips }),
      });
      notify(res.message || "Policy updated!");
      fetchAdmins();
    } catch (err) {
      notify("Failed to update policy: " + err.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Security Policies</h1>
        <p className="page-sub">Configure IP whitelisting for administrator accounts.</p>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">🔐 Admin IP Whitelists</span></div>
        <div className="card-body">
          {loading ? (
            <p className="empty-state">Loading policies...</p>
          ) : admins.length === 0 ? (
            <p className="empty-state">No admins found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Username</th><th>Role</th><th>Allowed IP Addresses</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.username}</strong></td>
                      <td><span className="tag tag-blue">{admin.role}</span></td>
                      <td>
                        {admin.security_policy?.allowed_ips?.length > 0 ? (
                          <div className="flex gap-2 wrap">
                            {admin.security_policy.allowed_ips.map((ip) => (
                              <span key={ip} className="tag tag-green">{ip}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="tag tag-amber">Any IP (unrestricted)</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => handleUpdatePolicy(admin.username, admin.security_policy)}>
                          Edit Whitelist
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
