import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function FuelPrices() {
  const [petrol, setPetrol] = useState("");
  const [diesel, setDiesel] = useState("");
  const [city, setCity] = useState("Pune");
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const data = await api("/api/settings");
      const fp = data.fuel_prices || {};
      setPetrol(fp.petrol || "");
      setDiesel(fp.diesel || "");
      setCity(fp.city || "Pune");
      if (fp.petrol && fp.diesel) {
        setStatus(
          `Manual override active — Petrol ₹${fp.petrol}/L, Diesel ₹${fp.diesel}/L (${fp.city || "Pune"})`,
        );
      } else {
        setStatus(
          "Auto-fetch mode — Prices fetched live from NDTV/GoodReturns",
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!petrol || !diesel) {
      notify("Both petrol and diesel prices are required");
      return;
    }
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          fuel_prices: {
            petrol: parseFloat(petrol),
            diesel: parseFloat(diesel),
            city,
            updated: new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
        }),
      });
      notify("Fuel prices saved! Website will show these prices.");
      loadPrices();
    } catch (e) {
      notify(e.message);
    }
  };

  const handleClear = async () => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ fuel_prices: {} }),
      });
      setPetrol("");
      setDiesel("");
      notify("Fuel prices cleared. Website will auto-fetch from live sources.");
      loadPrices();
    } catch (e) {
      notify(e.message);
    }
  };

  const handleFetchLive = async () => {
    try {
      setStatus("Fetching live prices from NDTV...");
      const data = await api(`/api/admin/fetch-ndtv-fuel?city=${city}`);
      setPetrol(data.petrol);
      setDiesel(data.diesel);
      setStatus(`Successfully fetched live prices for ${city}`);
    } catch (e) {
      setStatus(`Error fetching live prices: ${e.message}`);
      notify(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Fuel Prices</h1>
        <p className="page-sub">Manual override for petrol and diesel prices</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">⛽ Fuel Prices Override</span>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "12px",
              color: "var(--t2)",
              marginBottom: "14px",
            }}
          >
            Status: <strong>{status}</strong>
          </p>
          <div className="grid-form">
            <div className="form-group">
              <label>Petrol Price (₹/L)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={petrol}
                onChange={(e) => setPetrol(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Diesel Price (₹/L)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={diesel}
                onChange={(e) => setDiesel(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>City</label>
              <input
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button className="btn btn-primary" onClick={handleSave}>
              💾 Save Prices
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--green)', color: 'var(--green)' }} onClick={handleFetchLive}>
              🔄 Fetch Live NDTV Prices
            </button>
            <button className="btn btn-outline" onClick={handleClear}>
              ✕ Clear Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
