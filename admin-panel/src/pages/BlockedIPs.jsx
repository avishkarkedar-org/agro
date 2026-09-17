import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function BlockedIPs() {
  const [ips, setIps] = useState([]);
  const [newIp, setNewIp] = useState("");

  const loadIps = async () => {
    try {
      const res = await api("/api/admin/blocked-ips");
      setIps(res.ips || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadIps();
  }, []);

  const blockIp = async () => {
    const ip = newIp.trim();
    if (!ip) return;
    if (
      !await confirmDialog(`Block IP ${ip}? This IP will get 403 on all requests.`)
    )
      return;
    try {
      await api("/api/admin/block-ip", {
        method: "POST",
        body: JSON.stringify({ ip }),
      });
      setNewIp("");
      loadIps();
    } catch (e) {
      notify(e.message);
    }
  };

  const unblockIp = async (ip) => {
    if (!await confirmDialog(`Unblock IP ${ip}?`)) return;
    try {
      await api("/api/admin/block-ip", {
        method: "DELETE",
        body: JSON.stringify({ ip }),
      });
      loadIps();
    } catch (e) {
      notify(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Blocked IPs</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="flex gap-2 mb-3">
            <input
              className="form-input"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="IP Address"
            />
            <button className="btn btn-primary" onClick={blockIp}>
              Block IP
            </button>
          </div>
          {ips.map((ip) => (
            <div
              key={ip}
              className="flex justify-between align-center"
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span>{ip}</span>
              <button
                className="btn btn-outline btn-sm text-danger"
                onClick={() => unblockIp(ip)}
              >
                Unblock
              </button>
            </div>
          ))}
          {ips.length === 0 && <p className="text-gray">No blocked IPs</p>}
        </div>
      </div>
    </div>
  );
}
