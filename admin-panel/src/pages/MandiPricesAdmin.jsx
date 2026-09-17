import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const MANDI_DEFAULT = [
  { commodity: "Wheat", variety: "Local", min: 2125, max: 2300, modal: 2200 },
  { commodity: "Rice", variety: "Common", min: 2040, max: 2150, modal: 2100 },
  { commodity: "Maize", variety: "Yellow", min: 1962, max: 2050, modal: 2000 },
];

export default function MandiPricesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/settings")
      .then((s) => {
        if (s.mandi_prices && s.mandi_prices.length > 0) {
          setRows(
            s.mandi_prices.map((p) => ({
              commodity: p.commodity || "",
              variety: p.variety || "",
              min: Number(p.min_price) || 0,
              modal: Number(p.modal_price) || 0,
              max: Number(p.max_price) || 0,
            })),
          );
        } else {
          setRows([...MANDI_DEFAULT]);
        }
      })
      .catch(() => setRows([...MANDI_DEFAULT]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (idx, field, val) => {
    const newRows = [...rows];
    newRows[idx][field] =
      field === "commodity" || field === "variety" ? val : Number(val);
    setRows(newRows);
  };

  const saveMandi = async () => {
    const prices = rows.map((m) => ({
      commodity: m.commodity,
      variety: m.variety,
      min_price: String(m.min),
      modal_price: String(m.modal),
      max_price: String(m.max),
      grade: "FAQ",
      market: "Pune APMC",
      isStatic: true,
    }));
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ mandi_prices: prices }),
      });
      notify("✅ Mandi prices saved successfully!");
    } catch (e) {
      notify("Failed to save: " + e.message);
    }
  };

  if (loading)
    return (
      <div className="page active">
        <div className="loading-center">
          <span className="spinner spinner-lg"></span>
        </div>
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Mandi Prices</h1>
        <p className="page-sub">
          Override the reference APMC Mandi prices on the main site
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">💰 Price Editor</h2>
          <button className="btn btn-primary btn-sm" onClick={saveMandi}>
            💾 Save Changes
          </button>
        </div>
        <div className="card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
              gap: "10px",
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            <span>COMMODITY</span>
            <span>VARIETY</span>
            <span>MIN ₹</span>
            <span>MODAL ₹</span>
            <span>MAX ₹</span>
          </div>
          {rows.map((m, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <input
                className="form-input"
                value={m.commodity}
                onChange={(e) => handleChange(i, "commodity", e.target.value)}
              />
              <input
                className="form-input"
                value={m.variety}
                onChange={(e) => handleChange(i, "variety", e.target.value)}
              />
              <input
                className="form-input"
                type="number"
                value={m.min}
                onChange={(e) => handleChange(i, "min", e.target.value)}
              />
              <input
                className="form-input"
                type="number"
                value={m.modal}
                onChange={(e) => handleChange(i, "modal", e.target.value)}
                style={{ borderColor: "var(--green)" }}
              />
              <input
                className="form-input"
                type="number"
                value={m.max}
                onChange={(e) => handleChange(i, "max", e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
