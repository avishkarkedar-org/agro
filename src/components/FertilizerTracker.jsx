import { useState, useEffect } from "react";
import { API } from "../context/SettingsContext";

const DEFAULT_RATES = [
  { name: "Urea (Neem Coated)", price: 266.5, unit: "45kg" },
  { name: "DAP", price: 1350.0, unit: "50kg" },
  { name: "MOP", price: 1700.0, unit: "50kg" },
  { name: "NPK (10:26:26)", price: 1470.0, unit: "50kg" },
  { name: "NPK (12:32:16)", price: 1470.0, unit: "50kg" },
  { name: "SSP (Single Super Phosphate)", price: 500.0, unit: "50kg" },
];

export default function FertilizerTracker() {
  const [data, setData] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API}/api/fertilizers`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch fertilizer prices");
        return r.json();
      })
      .then((d) => {
        if (d.rates && d.rates.length > 0) {
          setData(d.rates);
        }
      })
      .catch((e) => {
        // Keep default rates intact
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card" id="sec-fert">
      <div className="card-hd">
        <span className="card-title">🧮 Subsidized Fertilizer Rates</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          Govt Data
        </span>
      </div>
      <div className="card-body">
        <p className="xs t2 mb3" style={{ lineHeight: 1.5 }}>
          Current government subsidized rates per bag (45kg/50kg) to protect you
          from black market overpricing.
        </p>

        {loading && (
          <div className="flex gap2 wrap" aria-busy="true" aria-label="Loading fertilizer rates">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skel"
                style={{
                  flex: "1 1 30%",
                  height: "100px",
                  borderRadius: "12px",
                }}
              />
            ))}
          </div>
        )}

        {err && !loading && (
          <div
            className="sm tr"
            role="alert"
            style={{
              padding: "12px",
              background: "var(--rdim)",
              borderRadius: "8px",
            }}
          >
            {err}
          </div>
        )}

        {data.length > 0 && !loading && (
          <div className="grid" style={{ columns: 2, gap: "12px" }}>
            {data.map((f) => (
              <div
                key={f.name}
                style={{
                  background: "var(--s2)",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid var(--b1)",
                }}
              >
                <div
                  className="mono t3 xs mb1"
                  style={{ letterSpacing: ".06em" }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "var(--green)",
                  }}
                >
                  ₹{f.price}
                </div>
                <div className="mono xs t2 mt1" style={{ fontSize: "9px" }}>
                  per {f.unit} bag
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "var(--s3)",
            borderRadius: "10px",
            fontSize: "11px",
            color: "var(--t3)",
            lineHeight: 1.5,
          }}
        >
          💡 Note: Maximum Retail Price (MRP) includes taxes. Do not pay more
          than the printed MRP. Report overcharging to the local agriculture
          department.
        </div>
      </div>
    </div>
  );
}
