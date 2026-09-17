import { useState } from "react";

const CROP_CALENDAR = {
  Wheat: [
    { m: "Oct–Nov", act: "🌱 Sow", tip: "Use certified seed, 100 kg/ha with seed treatment (Vitavax)" },
    {
      m: "Dec–Jan",
      act: "💧 Irrigate",
      tip: "Crown root initiation (CRI at 21 days) — most critical stage",
    },
    { m: "Feb", act: "🌿 Top-dress", tip: "Apply 1/3 urea at first node/tillering stage" },
    { m: "Mar–Apr", act: "🌾 Harvest", tip: "Moisture <14% before storage, dry in sun" },
  ],
  Rice: [
    {
      m: "Jun–Jul",
      act: "🌱 Transplant",
      tip: "25-day nursery seedlings, 2–3 seedlings/hill, SRI method",
    },
    {
      m: "Jul–Aug",
      act: "💧 Flood",
      tip: "5cm standing water during vegetative stage, weed at 20 days",
    },
    {
      m: "Aug–Sep",
      act: "🌿 Fertilize",
      tip: "Top-dress urea & potash at panicle initiation",
    },
    { m: "Oct–Nov", act: "🌾 Harvest", tip: "Drain standing water 10 days before harvest" },
  ],
  Tomato: [
    { m: "Jun–Jul", act: "🌱 Nursery", tip: "Raise seedlings in pro-trays with coco-peat" },
    {
      m: "Jul–Aug",
      act: "🪴 Transplant",
      tip: "45×60cm spacing, install drip irrigation lines",
    },
    {
      m: "Aug–Sep",
      act: "🌿 Stake & Prune",
      tip: "Remove suckers, provide bamboo trellis, apply calcium",
    },
    {
      m: "Oct–Dec",
      act: "🍅 Harvest",
      tip: "Pick at breaker stage for long-distance transport",
    },
  ],
  Cotton: [
    { m: "May–Jun", act: "🌱 Sow", tip: "BT hybrid, 90×60cm spacing with basal DAP+MOP" },
    { m: "Jul", act: "💧 Irrigate", tip: "Critical at square formation & flowering" },
    {
      m: "Aug–Sep",
      act: "🌿 Spray",
      tip: "Pink bollworm pheromone traps & IPM monitoring",
    },
    { m: "Oct–Dec", act: "🌸 Pick", tip: "3–4 clean pickings without trash, store dry" },
  ],
  Soybean: [
    { m: "Jun", act: "🌱 Sow", tip: "Rhizobium + PSB seed inoculation essential" },
    { m: "Jul", act: "🌿 Weed", tip: "Weed-free first 30 days critical (Imazethapyr)" },
    { m: "Aug", act: "💧 Pod fill", tip: "Avoid moisture stress during flowering & pod filling" },
    { m: "Sep–Oct", act: "🌾 Harvest", tip: "Thresh at 12–14% seed moisture to avoid cracking" },
  ],
  Onion: [
    { m: "Oct–Nov", act: "🌱 Nursery", tip: "Raised seedbeds, 8–10 kg seed per hectare" },
    {
      m: "Dec–Jan",
      act: "🪴 Transplant",
      tip: "15×10cm spacing, 6-7 week hardened seedlings",
    },
    { m: "Feb–Mar", act: "💧 Irrigate", tip: "Frequent light irrigations, stop 10 days before pulling" },
    {
      m: "Mar–Apr",
      act: "🧅 Harvest",
      tip: "Neck fall at 50%, cure in shade 7–10 days before grading",
    },
  ],
  Potato: [
    { m: "Oct–Nov", act: "🌱 Plant", tip: "Certified disease-free seed tubers, 60×20cm ridges" },
    {
      m: "Nov–Dec",
      act: "🌿 Earthing up",
      tip: "Earth up at 30 days, top-dress MOP + Urea",
    },
    { m: "Dec–Jan", act: "💧 Irrigate", tip: "Critical at stolon formation & tuber bulking" },
    { m: "Jan–Feb", act: "🥔 Harvest", tip: "Dehaulm 10 days before digging to cure skin" },
  ],
  Maize: [
    { m: "Jun–Jul", act: "🌱 Sow", tip: "Hybrid seed, 60×20cm spacing, 20 kg/ha" },
    { m: "Jul", act: "🌿 Top-dress", tip: "1/3 Nitrogen at knee-high stage" },
    { m: "Aug", act: "💧 Irrigate", tip: "Critical at tasseling and silking stages" },
    { m: "Sep–Oct", act: "🌽 Harvest", tip: "Husk dries back, black layer forms at grain base" },
  ],
  Sugarcane: [
    { m: "Jan–Feb / Oct", act: "🌱 Plant Setts", tip: "2-bud setts treated with Carbendazim, 4-foot row spacing" },
    { m: "Mar–Apr", act: "🌿 Earthing & Fert", tip: "Partial earthing up and apply full dose of NPK" },
    { m: "Jun–Aug", act: "💧 Grand Growth", tip: "Ensure proper drainage in monsoon; trash mulching" },
    { m: "Nov–Mar", act: "🎋 Harvest", tip: "Cut flush to ground level for better ratoon yield" },
  ],
  Chilli: [
    { m: "Jun–Jul", act: "🌱 Nursery", tip: "Pro-tray nursery with Trichoderma seed treatment" },
    { m: "Aug", act: "🪴 Transplant", tip: "60×45cm spacing on raised beds with silver-black mulch" },
    { m: "Sep–Nov", act: "🌶️ Mite/Thrips Care", tip: "Monitor for leaf curl; apply micronutrient spray" },
    { m: "Dec–Apr", act: "🧺 Multi-Pick", tip: "Green pickings every 10–12 days or dry on clean mats" },
  ],
  Turmeric: [
    { m: "May–Jun", act: "🌱 Plant Rhizomes", tip: "Mother rhizomes (35–40g), broad bed furrow system" },
    { m: "Jul–Aug", act: "🌿 Mulch & Weeding", tip: "Green leaf mulching (15 t/ha) for moisture conservation" },
    { m: "Sep–Nov", act: "💧 Rhizome Bulking", tip: "Drip fertigation with 0:0:50 and Micronutrient mix" },
    { m: "Jan–Mar", act: "🪴 Harvest & Cure", tip: "Harvest when leaves turn yellow and dry completely" },
  ],
  Ginger: [
    { m: "Apr–May", act: "🌱 Bed Planting", tip: "Certified seed rhizomes treated with Mancozeb" },
    { m: "Jun–Jul", act: "🌿 Mulch Heavy", tip: "Mulch with green leaves immediately after planting" },
    { m: "Aug–Oct", act: "💧 Drench Rot Care", tip: "Drench with Trichoderma to protect against soft rot" },
    { m: "Dec–Feb", act: "🫚 Harvest", tip: "Harvest after 8 months for dry ginger, 6 months for green" },
  ],
  Groundnut: [
    { m: "Jun–Jul", act: "🌱 Sow Pods", tip: "Kernel treatment with Rhizobium + Trichoderma, 30×10cm" },
    { m: "Aug", act: "🌿 Pegging Gypsum", tip: "Apply 200 kg/acre Gypsum at 40–45 days (pegging stage)" },
    { m: "Sep", act: "💧 Pod Filling", tip: "Critical moisture stage; protect from Tikka leaf spot" },
    { m: "Oct–Nov", act: "🥜 Harvest", tip: "Inner shell turns brownish-black; sun-dry pods to <8% moisture" },
  ],
  Mustard: [
    { m: "Oct", act: "🌱 Sow", tip: "Optimum temperature 25–28°C, 45×15cm spacing, 4 kg/ha" },
    { m: "Nov", act: "💧 First Irrigation", tip: "Irrigate at 28–30 days (flowering initiation stage)" },
    { m: "Dec–Jan", act: "🌿 Aphid Watch", tip: "Monitor yellow twigs for aphid colonies; spray Dimethoate" },
    { m: "Feb–Mar", act: "🌾 Harvest", tip: "Harvest when 75% siliquae turn golden yellow" },
  ],
  "Gram (Chickpea)": [
    { m: "Oct–Nov", act: "🌱 Sow", tip: "Deep sowing in conserved moisture, 30×10cm spacing" },
    { m: "Dec", act: "🌿 Nipping", tip: "Nip apical buds at 30–35 days to encourage branching" },
    { m: "Jan", act: "💧 Pod Bore Care", tip: "Install bird perches; spray bio-pesticide HaNPV" },
    { m: "Feb–Mar", act: "🌾 Harvest", tip: "Harvest when pods turn straw-colored and leaves shed" },
  ],
  Bajra: [
    { m: "Jun–Jul", act: "🌱 Sow", tip: "Hybrid seed, 45×12cm spacing, 4 kg/ha seed rate" },
    { m: "Jul–Aug", act: "🌿 Thinning & Weed", tip: "Thin to single plant at 15 days; top-dress urea" },
    { m: "Aug–Sep", act: "💧 Grain Filling", tip: "Critical stage for drought protection in drylands" },
    { m: "Sep–Oct", act: "🌾 Harvest Earheads", tip: "Cut earheads when grains are hard (18–20% moisture)" },
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
