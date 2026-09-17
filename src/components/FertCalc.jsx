import { useState, useEffect, useMemo } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import TTSButton from "./TTSButton";

const CROPS = {
  Wheat: {
    urea: 87,
    dap: 54,
    mop: 27,
    season: "Rabi (Nov–Mar)",
    days: 120,
    emoji: "🌾",
    cat: "Cereal",
  },
  Rice: {
    urea: 116,
    dap: 54,
    mop: 40,
    season: "Kharif (Jun–Nov)",
    days: 130,
    emoji: "🍚",
    cat: "Cereal",
  },
  Maize: {
    urea: 108,
    dap: 81,
    mop: 40,
    season: "Kharif / Rabi",
    days: 90,
    emoji: "🌽",
    cat: "Cereal",
  },
  Sorghum: {
    urea: 65,
    dap: 40,
    mop: 27,
    season: "Kharif (Jun–Oct)",
    days: 110,
    emoji: "🌾",
    cat: "Cereal",
  },
  Bajra: {
    urea: 54,
    dap: 27,
    mop: 13,
    season: "Kharif (Jun–Sep)",
    days: 85,
    emoji: "🌾",
    cat: "Cereal",
  },
  Soybean: {
    urea: 44,
    dap: 87,
    mop: 40,
    season: "Kharif (Jun–Oct)",
    days: 100,
    emoji: "🫘",
    cat: "Pulse/Oil",
  },
  Cotton: {
    urea: 108,
    dap: 81,
    mop: 54,
    season: "Kharif (Jun–Oct)",
    days: 180,
    emoji: "🌿",
    cat: "Cash",
  },
  Sugarcane: {
    urea: 174,
    dap: 62,
    mop: 95,
    season: "Annual",
    days: 365,
    emoji: "🎋",
    cat: "Cash",
  },
  Groundnut: {
    urea: 22,
    dap: 54,
    mop: 40,
    season: "Kharif (Jun–Oct)",
    days: 120,
    emoji: "🥜",
    cat: "Oil",
  },
  Sunflower: {
    urea: 54,
    dap: 54,
    mop: 27,
    season: "Rabi / Kharif",
    days: 95,
    emoji: "🌻",
    cat: "Oil",
  },
  Mustard: {
    urea: 87,
    dap: 40,
    mop: 27,
    season: "Rabi (Oct–Mar)",
    days: 120,
    emoji: "🌿",
    cat: "Oil",
  },
  Tomato: {
    urea: 72,
    dap: 108,
    mop: 81,
    season: "Year-round",
    days: 90,
    emoji: "🍅",
    cat: "Vegetable",
  },
  Onion: {
    urea: 100,
    dap: 54,
    mop: 50,
    season: "Rabi (Oct–Apr)",
    days: 120,
    emoji: "🧅",
    cat: "Vegetable",
  },
  Potato: {
    urea: 116,
    dap: 87,
    mop: 108,
    season: "Rabi (Oct–Mar)",
    days: 90,
    emoji: "🥔",
    cat: "Vegetable",
  },
  Chilli: {
    urea: 80,
    dap: 54,
    mop: 40,
    season: "Year-round",
    days: 150,
    emoji: "🌶️",
    cat: "Vegetable",
  },
  Brinjal: {
    urea: 72,
    dap: 54,
    mop: 40,
    season: "Year-round",
    days: 120,
    emoji: "🍆",
    cat: "Vegetable",
  },
  Cabbage: {
    urea: 108,
    dap: 81,
    mop: 54,
    season: "Rabi (Sep–Feb)",
    days: 90,
    emoji: "🥬",
    cat: "Vegetable",
  },
  Cauliflower: {
    urea: 100,
    dap: 81,
    mop: 54,
    season: "Rabi (Sep–Feb)",
    days: 90,
    emoji: "🥦",
    cat: "Vegetable",
  },
  Banana: {
    urea: 200,
    dap: 87,
    mop: 230,
    season: "Year-round",
    days: 365,
    emoji: "🍌",
    cat: "Fruit",
  },
  Mango: {
    urea: 87,
    dap: 54,
    mop: 87,
    season: "Annual",
    days: 365,
    emoji: "🥭",
    cat: "Fruit",
  },
  Grapes: {
    urea: 87,
    dap: 54,
    mop: 108,
    season: "Annual",
    days: 365,
    emoji: "🍇",
    cat: "Fruit",
  },
  Pomegranate: {
    urea: 65,
    dap: 54,
    mop: 87,
    season: "Annual",
    days: 365,
    emoji: "🍎",
    cat: "Fruit",
  },
  Turmeric: {
    urea: 65,
    dap: 54,
    mop: 95,
    season: "Kharif (Jun–Jan)",
    days: 210,
    emoji: "🌿",
    cat: "Spice",
  },
  Ginger: {
    urea: 65,
    dap: 54,
    mop: 108,
    season: "Kharif (Apr–Dec)",
    days: 240,
    emoji: "🫚",
    cat: "Spice",
  },
  Tur_Dal: {
    urea: 22,
    dap: 54,
    mop: 27,
    season: "Kharif (Jun–Dec)",
    days: 180,
    emoji: "🫘",
    cat: "Pulse/Oil",
  },
  Chickpea: {
    urea: 22,
    dap: 54,
    mop: 20,
    season: "Rabi (Oct–Mar)",
    days: 120,
    emoji: "🫘",
    cat: "Pulse/Oil",
  },
};
const CROP_CATS = [...new Set(Object.values(CROPS).map((c) => c.cat))];

export default function FertCalc() {
  const [cat, setCat] = useState("All");
  const [crop, setCrop] = useState(
    () => safeGetLS("agrointel_crop") || "Wheat",
  );
  const [acres, setAcres] = useState(
    () => safeGetLS("agrointel_acres") || "",
  );
  const [res, setRes] = useState(null);

  useEffect(() => safeSetLS("agrointel_crop", crop), [crop]);
  useEffect(() => safeSetLS("agrointel_acres", acres), [acres]);

  // Feature 1: Listen for autofill from scan
  useEffect(() => {
    const handler = (e) => {
      const c = e.detail?.crop;
      if (c) {
        const match = Object.keys(CROPS).find(
          (k) =>
            k.toLowerCase() === c.toLowerCase() ||
            c.toLowerCase().includes(k.toLowerCase()),
        );
        if (match) {
          setCrop(match);
          document
            .getElementById("sec-fert")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    window.addEventListener("autofill-fert", handler);
    return () => window.removeEventListener("autofill-fert", handler);
  }, []);

  const cropList = useMemo(
    () =>
      cat === "All"
        ? Object.keys(CROPS)
        : Object.keys(CROPS).filter((k) => CROPS[k].cat === cat),
    [cat]
  );

  useEffect(() => {
    if (!cropList.includes(crop)) setCrop(cropList[0]);
    setRes(null);
  }, [crop, cropList]);

  const calc = () => {
    const a = parseFloat(acres);
    if (!a || a <= 0) return;
    const d = CROPS[crop];
    setRes({
      urea: (d.urea * a).toFixed(1),
      dap: (d.dap * a).toFixed(1),
      mop: (d.mop * a).toFixed(1),
      acres: a,
      crop,
      d,
    });
  };

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">🌱 Fertilizer Calculator</span>
        <span className="chip cx mono" style={{ fontSize: "9px" }}>
          ICAR STANDARDS
        </span>
      </div>
      <div className="card-body">
        <div className="flex gap1 wrap mb3" style={{ gap: "5px" }}>
          {["All", ...CROP_CATS].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`filter-btn${cat === c ? " active" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
        <label htmlFor="fc-crop">Crop</label>
        <select
          className="input"
          value={crop}
          id="fc-crop"
          onChange={(e) => {
            setCrop(e.target.value);
            setRes(null);
          }}
        >
          {cropList.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {crop && CROPS[crop] && (
          <div className="flex gap2 wrap mt2">
            <span className="chip cx xs">
              {CROPS[crop].emoji} {CROPS[crop].cat}
            </span>
            <span className="chip cx xs">📅 {CROPS[crop].season}</span>
            <span className="chip cx xs">⏱ {CROPS[crop].days} days</span>
          </div>
        )}
        <label htmlFor="fc-acres">Farm Size (Acres)</label>
        <input
          className="input"
          type="number"
          min="0"
          step="0.1"
          value={acres}
          placeholder="e.g. 2.5"
          id="fc-acres"
          onChange={(e) => {
            setAcres(e.target.value);
            setRes(null);
          }}
        />
        <button
          className="btn btn-g w100 mt3"
          onClick={calc}
          disabled={!acres || parseFloat(acres) <= 0}
        >
          Calculate Requirements
        </button>
        {res && (
          <div className="fade-in">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "14px",
                padding: "8px 12px",
                background: "var(--s2)",
                border: "1px solid var(--b1)",
                borderRadius: "8px",
              }}
            >
              <span className="mono bold xs tg">
                🎯 {res.crop.replace(/_/g, " ")} ({res.acres} AC)
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <TTSButton
                  text={`${res.crop.replace(/_/g, " ")} fertilizer dosage for ${res.acres} acres: Urea ${res.urea} kilograms or ${Math.ceil(res.urea / 45)} bags. DAP ${res.dap} kilograms or ${Math.ceil(res.dap / 50)} bags. MOP ${res.mop} kilograms or ${Math.ceil(res.mop / 50)} bags.`}
                />
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🌱 *AgroIntel Fertilizer Advisory*\nCrop: ${res.crop.replace(/_/g, " ")}\nLand Area: ${res.acres} Acres\n\n*Recommended Quantity:*\n• Urea: ${res.urea} kg (${Math.ceil(res.urea / 45)} bags)\n• DAP: ${res.dap} kg (${Math.ceil(res.dap / 50)} bags)\n• MOP: ${res.mop} kg (${Math.ceil(res.mop / 50)} bags)\n\nCalculated as per ICAR agricultural standards via AgroIntel.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    fontSize: "11px",
                    background: "#25D366",
                    color: "#fff",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    border: "none",
                    borderRadius: "6px",
                  }}
                  title="Share Advisory on WhatsApp"
                >
                  💬 Share
                </a>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              {[
                {
                  label: "UREA",
                  val: res.urea,
                  col: "var(--green)",
                  hint: "46% N",
                },
                {
                  label: "DAP",
                  val: res.dap,
                  col: "var(--amber)",
                  hint: "18% N · 46% P",
                },
                {
                  label: "MOP",
                  val: res.mop,
                  col: "var(--blue)",
                  hint: "60% K₂O",
                },
              ].map((f) => (
                <div key={f.label} className="fert-box">
                  <div
                    className="mono t3"
                    style={{ fontSize: "10px", letterSpacing: ".1em" }}
                  >
                    {f.label}
                  </div>
                  <div
                    className="fert-num"
                    style={{ color: f.col, fontSize: "28px" }}
                  >
                    {f.val}
                  </div>
                  <div className="xs t2">kg</div>
                  <div
                    className="mono t3"
                    style={{ fontSize: "9px", marginTop: "2px" }}
                  >
                    {f.hint}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "12px",
                padding: "12px 14px",
                background: "var(--s2)",
                border: "1px solid var(--b1)",
                borderRadius: "10px",
              }}
            >
              <div
                className="mono xs tg mb2"
                style={{ letterSpacing: ".08em" }}
              >
                SPLIT APPLICATION SCHEDULE
              </div>
              {[
                {
                  phase: "Basal — at sowing",
                  u: (res.urea * 0.5).toFixed(1),
                  d: res.dap,
                  m: (res.mop * 0.5).toFixed(1),
                },
                {
                  phase: "30 days — tillering",
                  u: (res.urea * 0.25).toFixed(1),
                  d: "—",
                  m: (res.mop * 0.25).toFixed(1),
                },
                {
                  phase: "60 days — heading",
                  u: (res.urea * 0.25).toFixed(1),
                  d: "—",
                  m: (res.mop * 0.25).toFixed(1),
                },
              ].map((r) => (
                <div
                  key={r.phase}
                  className="flex jcb aic"
                  style={{
                    padding: "6px 0",
                    borderBottom: "1px solid var(--b1)",
                  }}
                >
                  <span className="xs t2">{r.phase}</span>
                  <span className="mono xs tg">
                    {r.u}U · {r.d}D · {r.m}K
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "10px",
                padding: "9px 12px",
                background: "var(--gdim)",
                border: "1px solid var(--g3)",
                borderRadius: "8px",
              }}
            >
              <p className="xs t2" style={{ lineHeight: 1.55 }}>
                ℹ️ Adjust based on soil test report from your local KVK.
              </p>
            </div>
            {/* Feature 8 — Bag Calculator */}
            <div
              style={{
                marginTop: "12px",
                padding: "12px 14px",
                background: "var(--s2)",
                border: "1px solid var(--b2)",
                borderRadius: "10px",
              }}
            >
              <div
                className="mono xs tb mb2"
                style={{ letterSpacing: ".08em" }}
              >
                🛍️ BAG CALCULATOR (50 kg bags)
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                }}
              >
                {[
                  {
                    label: "UREA bags",
                    val: Math.ceil(res.urea / 45),
                    sub: `${res.urea} kg ÷ 45kg`,
                    col: "var(--green)",
                  },
                  {
                    label: "DAP bags",
                    val: Math.ceil(res.dap / 50),
                    sub: `${res.dap} kg ÷ 50kg`,
                    col: "var(--amber)",
                  },
                  {
                    label: "MOP bags",
                    val: Math.ceil(res.mop / 50),
                    sub: `${res.mop} kg ÷ 50kg`,
                    col: "var(--blue)",
                  },
                ].map((b) => (
                  <div
                    key={b.label}
                    style={{
                      textAlign: "center",
                      padding: "10px 6px",
                      background: "var(--s3)",
                      borderRadius: "8px",
                      border: `1px solid var(--b1)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Playfair Display",
                        fontSize: "28px",
                        fontWeight: 900,
                        color: b.col,
                        lineHeight: 1,
                      }}
                    >
                      {b.val}
                    </div>
                    <div
                      className="mono t3"
                      style={{
                        fontSize: "9px",
                        marginTop: "3px",
                        letterSpacing: ".06em",
                      }}
                    >
                      {b.label}
                    </div>
                    <div className="mono t3" style={{ fontSize: "9px" }}>
                      {b.sub}
                    </div>
                  </div>
                ))}
              </div>
              <p className="xs t3 mt2">
                Prices vary — check your nearest agri-input dealer.
              </p>
            </div>

            {res && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "14px",
                  background: "var(--s2)",
                  border: "1px solid var(--b2)",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="mono xs tg mb3"
                  style={{ letterSpacing: ".08em" }}
                >
                  🌿 CROP ADVISORY — {res.crop}
                </div>
                {[
                  {
                    icon: "💧",
                    label: "Irrigation",
                    val:
                      {
                        Wheat:
                          "4–6 irrigations. Critical at crown root, jointing, flowering.",
                        Rice: "Maintain 5cm standing water during vegetative stage.",
                        Maize:
                          "Critical at knee-high, tasseling, silking stages.",
                        Sugarcane:
                          "Drip irrigation best. 1500–2500mm per season.",
                        Cotton:
                          "Avoid waterlogging. Critical at boll formation.",
                        Soybean:
                          "Avoid excess moisture. Critical at pod filling.",
                        Tomato: "Drip irrigation. Avoid wet/dry cycles.",
                        Onion: "Stop irrigation 10 days before harvest.",
                        Potato: "Critical at tuber initiation. Avoid stress.",
                        Groundnut: "Pod filling stage most critical.",
                      }[res.crop] || "Consult KVK for schedule.",
                  },
                  {
                    icon: "🌱",
                    label: "Ideal Soil pH",
                    val:
                      {
                        Wheat: "6.0–7.5",
                        Rice: "5.5–6.5",
                        Maize: "5.8–7.0",
                        Sugarcane: "6.0–7.5",
                        Cotton: "6.0–8.0",
                        Soybean: "6.0–7.0",
                        Tomato: "6.0–6.8",
                        Onion: "6.0–7.0",
                        Potato: "5.2–6.0",
                        Groundnut: "6.0–6.5",
                        Bajra: "6.0–7.5",
                        Jowar: "6.0–7.5",
                        Mustard: "6.0–7.5",
                      }[res.crop] || "6.0–7.0",
                  },
                  {
                    icon: "📅",
                    label: "Sowing Season",
                    val: res.d?.season || "—",
                  },
                  {
                    icon: "⏱",
                    label: "Crop Duration",
                    val: `${res.d?.days || "—"} days to harvest`,
                  },
                  {
                    icon: "🧪",
                    label: "Micronutrients",
                    val:
                      {
                        Wheat:
                          "Zinc sulfate 25 kg/ha. Boron spray at flowering.",
                        Rice: "Zinc sulfate 25 kg/ha. Iron chelate if yellowing.",
                        Maize: "Zinc 25 kg/ha. Boron if tassel sterility seen.",
                        Sugarcane:
                          "Iron + Zinc + Boron foliar spray in ratoon.",
                        Cotton:
                          "Boron 0.2% at flowering. Zinc for square dropping.",
                        Soybean:
                          "Molybdenum + Boron. Rhizobium inoculation essential.",
                        Tomato: "Calcium + Boron prevent blossom end rot.",
                        Onion: "Boron 0.1% spray. Zinc for bulb development.",
                        Potato: "Calcium + Boron for tuber quality.",
                        Groundnut: "Gypsum 400 kg/ha at pegging for calcium.",
                      }[res.crop] || "Zinc sulfate 25 kg/ha if deficient.",
                  },
                  {
                    icon: "⚠️",
                    label: "Common Mistake",
                    val:
                      {
                        Wheat:
                          "Over-irrigation at grain fill causes lodging. Stop urea after flag leaf.",
                        Rice: "Excess N causes blast. Split apply in 3 doses.",
                        Maize:
                          "Never apply full urea as single dose — always split 3 times.",
                        Sugarcane:
                          "Skipping trash mulching wastes 40% summer moisture.",
                        Cotton:
                          "Early excess urea causes vegetative growth, reduces bolls.",
                        Soybean:
                          "Applying heavy urea defeats Rhizobium — use only 22 kg basal.",
                        Tomato:
                          "Overhead irrigation spreads foliar diseases. Use drip.",
                        Onion:
                          "Late nitrogen causes poor storage and sprouting.",
                        Potato: "Excess N causes leafy growth, poor tuber set.",
                        Groundnut:
                          "Empty pods = calcium deficiency — apply gypsum at pegging.",
                      }[res.crop] || "Always split fertilizer for best uptake.",
                  },
                ].map((a) => (
                  <div
                    key={a.label}
                    style={{
                      display: "flex",
                      gap: "10px",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--b1)",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ fontSize: "16px", flexShrink: 0 }}>
                      {a.icon}
                    </span>
                    <div>
                      <div
                        className="mono t3"
                        style={{
                          fontSize: "9px",
                          letterSpacing: ".06em",
                          marginBottom: "2px",
                        }}
                      >
                        {a.label.toUpperCase()}
                      </div>
                      <div style={{ color: "var(--t2)", lineHeight: 1.55 }}>
                        {a.val}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
