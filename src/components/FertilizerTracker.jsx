import { useState, useEffect } from "react";
import { API } from "../context/SettingsContext";

const DEFAULT_RATES = [
  { name: "Urea (Neem Coated 46% N)", price: 266.5, unit: "45kg", formula: "46-0-0", type: "Major NPK" },
  { name: "DAP (Di-Ammonium Phosphate)", price: 1350.0, unit: "50kg", formula: "18-46-0", type: "Major NPK" },
  { name: "MOP (Muriate of Potash 60% K2O)", price: 1700.0, unit: "50kg", formula: "0-0-60", type: "Major NPK" },
  { name: "NPK (10:26:26 Complex)", price: 1470.0, unit: "50kg", formula: "10-26-26", type: "Complex" },
  { name: "NPK (12:32:16 Complex)", price: 1470.0, unit: "50kg", formula: "12-32-16", type: "Complex" },
  { name: "NPK (20:20:0:13 Ammonium Phos. Sulphate)", price: 1250.0, unit: "50kg", formula: "20-20-0-13S", type: "Complex" },
  { name: "SSP (Single Super Phosphate Granular)", price: 500.0, unit: "50kg", formula: "0-16-0 + 11% S", type: "Major NPK" },
  { name: "SSP (Single Super Phosphate Powder)", price: 480.0, unit: "50kg", formula: "0-16-0 + 11% S", type: "Major NPK" },
  { name: "Zinc Sulphate Monohydrate (33% Zn)", price: 680.0, unit: "10kg", formula: "33% Zn + 15% S", type: "Micronutrients" },
  { name: "Zinc Sulphate Heptahydrate (21% Zn)", price: 520.0, unit: "25kg", formula: "21% Zn + 10% S", type: "Micronutrients" },
  { name: "Ferrous Sulphate (19% Fe)", price: 450.0, unit: "25kg", formula: "19% Fe + 10.5% S", type: "Micronutrients" },
  { name: "Agricultural Gypsum (Soil Conditioner)", price: 280.0, unit: "50kg", formula: "CaSO4 · 2H2O", type: "Micronutrients" },
  { name: "Boron (Disodium Octaborate 20%)", price: 380.0, unit: "1kg", formula: "20% B", type: "Micronutrients" },
  { name: "Magnesium Sulphate (9.6% Mg)", price: 420.0, unit: "25kg", formula: "9.6% Mg + 12% S", type: "Micronutrients" },
];

export default function FertilizerTracker() {
  const [data, setData] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("All");

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
      .catch(() => {
        // Keep default rates intact
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredData =
    filter === "All"
      ? data
      : data.filter((f) => f.type === filter || (filter === "Major NPK" && !f.type));

  return (
    <div className="card" id="sec-fert">
      <div className="card-hd">
        <span className="card-title">🧮 Statutory Fertilizer Rates</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          NBS Govt MRP
        </span>
      </div>
      <div className="card-body">
        <p className="xs t2 mb3" style={{ lineHeight: 1.5 }}>
          Official Department of Fertilizers statutory Maximum Retail Prices (MRP) per bag across India.
          Protects farmers from black market overpricing and unauthorized dealer markups.
        </p>

        <div className="flex gap2 wrap mb3">
          {["All", "Major NPK", "Complex", "Micronutrients"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="btn btn-sm"
              style={{
                background: filter === cat ? "var(--gdim)" : "var(--s2)",
                color: filter === cat ? "var(--green)" : "var(--t2)",
                border: `1px solid ${filter === cat ? "var(--g3)" : "var(--b1)"}`,
                fontSize: "11px",
                padding: "4px 10px",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

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

        {filteredData.length > 0 && !loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
              gap: "12px",
            }}
          >
            {filteredData.map((f) => (
              <div
                key={f.name}
                style={{
                  background: "var(--s2)",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid var(--b1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="flex jcb aic mb1">
                    <span
                      className="mono xs"
                      style={{
                        fontSize: "9px",
                        color: "var(--t3)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {f.type || "Fertilizer"}
                    </span>
                    {f.formula && (
                      <span
                        className="mono xs"
                        style={{
                          background: "var(--s3)",
                          color: "var(--blue)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "9px",
                          fontWeight: 600,
                        }}
                      >
                        {f.formula}
                      </span>
                    )}
                  </div>
                  <div
                    className="bold xs mb2"
                    style={{ color: "var(--fg)", lineHeight: 1.35 }}
                  >
                    {f.name}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "26px",
                      fontWeight: 900,
                      color: "var(--green)",
                    }}
                  >
                    ₹{f.price.toLocaleString("en-IN")}
                  </div>
                  <div className="mono xs t2 mt1" style={{ fontSize: "9px" }}>
                    Statutory MRP per {f.unit} bag
                  </div>
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
          💡 <strong>Farmer Protection Advisory:</strong> Maximum Retail Price (MRP) printed on fertilizer bags is inclusive of all taxes. 
          Retailers charging above statutory rates are liable under the Essential Commodities Act, 1955. 
          Toll-free Kisan Call Center: <strong>1800-180-1551</strong>.
        </div>
      </div>
    </div>
  );
}
