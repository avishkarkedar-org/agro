import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function AccessCodes() {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState({
    code: "",
    tier: "premium",
    expires_at: "",
    max_uses: 10,
  });

  const loadCodes = async () => {
    try {
      const res = await api("/api/admin/access-codes");
      setCodes(res.codes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const createCode = async () => {
    if (!form.expires_at) return notify("Expiry date is required");
    try {
      const body = {
        code: form.code.trim() || undefined,
        tier: form.tier,
        expires_at: form.expires_at,
      };
      if (form.max_uses) {
        body.max_uses = parseInt(form.max_uses);
      }
      const data = await api("/api/admin/access-codes", {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify(`Access code created: ${data.code}`);
      setForm({ code: "", tier: "premium", expires_at: "", max_uses: 10 });
      loadCodes();
    } catch (e) {
      notify(e.message);
    }
  };

  const toggleAccessCode = async (id) => {
    try {
      await api(`/api/admin/access-codes/${id}`, { method: "PATCH" });
      loadCodes();
    } catch (e) {
      notify(e.message);
    }
  };

  const deleteAccessCode = async (id, code) => {
    if (
      !await confirmDialog(
        `Delete access code "${code}" permanently? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/api/admin/access-codes/${id}`, { method: "DELETE" });
      loadCodes();
    } catch (e) {
      notify(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Access Codes</h1>
        <p className="page-sub">
          Generate and manage premium/standard tier access codes
        </p>
      </div>

      <div className="card mb-4">
        <div className="card-hd">
          <span className="card-title">🎫 Create Access Code</span>
        </div>
        <div className="card-body">
          <div className="flex gap-2 wrap align-end">
            <div
              className="form-group mb-0"
              style={{ flex: 1, minWidth: "150px" }}
            >
              <label>Custom Code (optional)</label>
              <input
                className="form-input"
                placeholder="Leave blank for auto-gen"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="form-group mb-0" style={{ minWidth: "120px" }}>
              <label>Tier</label>
              <select
                className="form-input"
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
              >
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div className="form-group mb-0" style={{ minWidth: "150px" }}>
              <label>Expiry Date</label>
              <input
                className="form-input"
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value })
                }
              />
            </div>
            <div className="form-group mb-0" style={{ minWidth: "100px" }}>
              <label>Max Uses</label>
              <input
                className="form-input"
                type="number"
                placeholder="10"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={createCode}
              style={{ height: "36px" }}
            >
              Generate Code
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📋 Active Access Codes</span>
          {/* CODES_BULK_COPY_R97: copy all non-expired active codes to clipboard */}
          {codes.length > 0 && (
            <button className="btn btn-sm btn-outline" onClick={() => {
              const active = codes.filter(c => c.is_active && new Date(c.expires_at) >= new Date());
              if (!active.length) { notify("No active non-expired codes to copy."); return; }
              navigator.clipboard?.writeText(active.map(c => c.code).join("\n"))
                .then(() => notify(`📋 Copied ${active.length} active code(s) to clipboard.`))
                .catch(() => notify("Clipboard not available in this browser."));
            }}>📋 Copy All Active</button>
          )}
        </div>
        <div className="card-body">
          {codes.length === 0 ? (
            <p className="empty-state">No access codes created yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Uses</th>
                    <th>Expires</th>
                    <th>Created By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => {
                    const isExpired = new Date(c.expires_at) < new Date();
                    let statusTag = (
                      <span className="tag tag-green">Active</span>
                    );
                    if (!c.is_active) {
                      statusTag = <span className="tag tag-red">Inactive</span>;
                    } else if (isExpired) {
                      statusTag = (
                        <span className="tag tag-amber">Expired</span>
                      );
                    }

                    return (
                      <tr key={c.id}>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontWeight: "bold",
                            letterSpacing: "1px",
                          }}
                        >
                          {c.code}
                        </td>
                        <td>
                          <span
                            className={`tag ${c.tier === "premium" ? "tag-purple" : "tag-blue"}`}
                          >
                            {c.tier}
                          </span>
                        </td>
                        <td>{statusTag}</td>
                        <td>
                          {c.current_uses} / {c.max_uses || "∞"}
                        </td>
                        <td>
                          {c.expires_at
                            ? new Date(c.expires_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>{c.created_by}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className={`btn btn-sm ${c.is_active ? "btn-outline text-danger" : "btn-primary"}`}
                              onClick={() => toggleAccessCode(c.id)}
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                navigator.clipboard?.writeText(c.code);
                                notify("📋 Copied " + c.code);
                              }}
                            >
                              📋 Copy
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteAccessCode(c.id, c.code)}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
