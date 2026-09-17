import { useState } from "react";

const CROP_CALENDAR = {
  Wheat: [
    { m: "Oct–Nov", act: "🌱 Sow", tip: "Use certified seed, 100 kg/ha" },
    {
      m: "Dec–Jan",
      act: "💧 Irrigate",
      tip: "Crown root initiation — critical",
    },
    { m: "Feb", act: "🌿 Top-dress", tip: "Apply 1/3 urea at tillering" },
    { m: "Mar–Apr", act: "🌾 Harvest", tip: "Moisture <14% before storage" },
  ],
  Rice: [
    {
      m: "Jun–Jul",
      act: "🌱 Transplant",
      tip: "25-day nursery, 2–3 seedlings/hill",
    },
    {
      m: "Jul–Aug",
      act: "💧 Flood",
      tip: "5cm standing water, weed at 20 days",
    },
    {
      m: "Aug–Sep",
      act: "🌿 Fertilize",
      tip: "Top-dress urea at panicle initiation",
    },
    { m: "Oct–Nov", act: "🌾 Harvest", tip: "Drain 10 days before harvest" },
  ],
  Tomato: [
    { m: "Jun–Jul", act: "🌱 Nursery", tip: "Raise seedlings in pro-trays" },
    {
      m: "Jul–Aug",
      act: "🪴 Transplant",
      tip: "45×60cm spacing, drip irrigation",
    },
    {
      m: "Aug–Sep",
      act: "🌿 Stake & Prune",
      tip: "Remove suckers, apply calcium",
    },
    {
      m: "Oct–Dec",
      act: "🍅 Harvest",
      tip: "Pick at breaker stage for market",
    },
  ],
  Cotton: [
    { m: "May–Jun", act: "🌱 Sow", tip: "BT hybrid, 90×60cm spacing" },
    { m: "Jul", act: "💧 Irrigate", tip: "Critical at square formation" },
    {
      m: "Aug–Sep",
      act: "🌿 Spray",
      tip: "Bollworm monitoring, Confidor if needed",
    },
    { m: "Oct–Dec", act: "🌸 Pick", tip: "3–4 pickings, store dry" },
  ],
  Soybean: [
    { m: "Jun", act: "🌱 Sow", tip: "Rhizobium inoculation essential" },
    { m: "Jul", act: "🌿 Weed", tip: "Weed-free first 30 days critical" },
    { m: "Aug", act: "💧 Pod fill", tip: "Avoid moisture stress at pod fill" },
    { m: "Sep–Oct", act: "🌾 Harvest", tip: "Thresh at 12–14% moisture" },
  ],
  Onion: [
    { m: "Oct–Nov", act: "🌱 Nursery", tip: "Raised bed, 5g seed/m²" },
    {
      m: "Dec–Jan",
      act: "🪴 Transplant",
      tip: "15×10cm spacing, 6-week seedlings",
    },
    { m: "Feb–Mar", act: "💧 Irrigate", tip: "Stop 10 days before harvest" },
    {
      m: "Mar–Apr",
      act: "🧅 Harvest",
      tip: "Cure in shade 7–10 days before storage",
    },
  ],
  Potato: [
    { m: "Oct–Nov", act: "🌱 Plant", tip: "Certified seed, 60×20cm spacing" },
    {
      m: "Nov–Dec",
      act: "🌿 Earthing up",
      tip: "Earth up at 30 days, apply MOP",
    },
    { m: "Dec–Jan", act: "💧 Irrigate", tip: "Critical at tuber initiation" },
    { m: "Jan–Feb", act: "🥔 Harvest", tip: "Dry foliage before digging" },
  ],
  Maize: [
    { m: "Jun–Jul", act: "🌱 Sow", tip: "Hybrid seed, 60×20cm, 4–5 kg/ha" },
    { m: "Jul", act: "🌿 Top-dress", tip: "1/3 urea at knee-high stage" },
    { m: "Aug", act: "💧 Irrigate", tip: "Critical at tasseling & silking" },
    { m: "Sep–Oct", act: "🌽 Harvest", tip: "Husk back, dry to 14% moisture" },
  ],
};

export default function CropCalendar() {
  const crops = Object.keys(CROP_CALENDAR);
  const [sel, setSel] = useState("Wheat");
  const steps = CROP_CALENDAR[sel] || [];

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">📅 Crop Calendar</span>
        <span className="chip cx" style={{ fontSize: "9px" }}>
          Sowing to Harvest
        </span>
      </div>
      <div className="card-body">
        <div className="flex gap1 wrap mb3" style={{ gap: "5px" }}>
          {crops.map((c) => (
            <button
              key={c}
              onClick={() => setSel(c)}
              className={`filter-btn${sel === c ? " active" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px",
                background: "var(--s2)",
                borderRadius: "10px",
                border: "1px solid var(--b1)",
                borderLeft: `3px solid var(--g3)`,
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--gdim)",
                  border: "1px solid var(--g3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--green)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "3px",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>
                    {s.act}
                  </span>
                  <span className="chip cx" style={{ fontSize: "9px" }}>
                    {s.m}
                  </span>
                </div>
                <div className="xs t2" style={{ lineHeight: 1.5 }}>
                  {s.tip}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "12px",
            padding: "9px 12px",
            background: "var(--gdim)",
            border: "1px solid var(--g3)",
            borderRadius: "8px",
          }}
        >
          <p className="xs t2">
            📍 Dates are for Maharashtra / Central India. Adjust ±2–4 weeks for
            your region.
          </p>
        </div>
      </div>
    </div>
  );
}
