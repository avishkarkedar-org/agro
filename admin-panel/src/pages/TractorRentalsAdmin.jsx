import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function TractorRentalsAdmin() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api("/api/settings")
      .then((s) => {
        setRentals(s.rentals || []);
        setLoading(false);
      })
      .catch(() => {
        setStatus("Failed to load rentals");
        setLoading(false);
      });
  }, []);

  const addRow = () => {
    setRentals([
      { owner: "", item: "", loc: "", phone: "", price: "" },
      ...rentals,
    ]);
  };

  const updateRow = (index, field, value) => {
    const newRentals = [...rentals];
    newRentals[index][field] = value;
    setRentals(newRentals);
  };

  const removeRow = (index) => {
    const newRentals = rentals.filter((_, i) => i !== index);
    setRentals(newRentals);
  };

  const saveRentals = async () => {
    setStatus("Saving...");
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ rentals }),
      });
      setStatus("✅ Saved");
      setTimeout(() => setStatus(""), 3000);
    } catch (e) {
      setStatus("Failed: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="page active">
        <div className="loading-center">
          <div className="spinner spinner-lg"></div>
          <p style={{ marginLeft: 10 }}>Loading rentals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Tractor Rentals</h1>
        <p className="page-sub">
          Manage available machinery rentals for farmers
        </p>
      </div>

      <div className="card">
        <div
          className="card-header"
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            className="card-title"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              color: "var(--t2)",
            }}
          >
            🚜 Equipment Directory
          </h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                color: status.includes("Failed")
                  ? "var(--red)"
                  : "var(--green)",
              }}
            >
              {status}
            </span>
            <button className="btn btn-outline btn-sm" onClick={addRow}>
              + Add Rental
            </button>
            <button className="btn btn-primary btn-sm" onClick={saveRentals}>
              💾 Save Changes
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {rentals.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🚜</div>
              <p>No rentals available yet.</p>
              <button
                className="btn btn-outline mt-3"
                onClick={addRow}
                style={{ marginTop: "12px" }}
              >
                Add First Rental
              </button>
            </div>
          ) : (
            <div
              className="table-wrap"
              style={{ border: "none", borderRadius: 0 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Owner Name</th>
                    <th>Equipment Type</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Price / Hour</th>
                    <th style={{ width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: "8px", fontSize: "13px" }}
                          value={r.owner || ""}
                          onChange={(e) =>
                            updateRow(i, "owner", e.target.value)
                          }
                          placeholder="e.g. Ramesh"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: "8px", fontSize: "13px" }}
                          value={r.item || ""}
                          onChange={(e) => updateRow(i, "item", e.target.value)}
                          placeholder="e.g. Mahindra Tractor"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: "8px", fontSize: "13px" }}
                          value={r.loc || ""}
                          onChange={(e) => updateRow(i, "loc", e.target.value)}
                          placeholder="e.g. Pune"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: "8px", fontSize: "13px" }}
                          value={r.phone || ""}
                          onChange={(e) =>
                            updateRow(i, "phone", e.target.value)
                          }
                          placeholder="e.g. 9876543210"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: "8px", fontSize: "13px" }}
                          value={r.price || ""}
                          onChange={(e) =>
                            updateRow(i, "price", e.target.value)
                          }
                          placeholder="e.g. ₹500/hr"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeRow(i)}
                          title="Remove row"
                        >
                          ✖
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
