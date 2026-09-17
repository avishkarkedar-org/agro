import { useState, useEffect } from "react";

const recs = {
  Apple: {
    rec: "Clover (Cover Crop)",
    why: "Fixes nitrogen and attracts pollinators.",
  },
  Arecanut: {
    rec: "Black Pepper or Vanilla",
    why: "Synergistic mixed cropping system.",
  },
  Banana: { rec: "Cowpea or Sunhemp", why: "Reduces nematode load in soil." },
  "Black Gram (Urad)": {
    rec: "Rabi Sorghum",
    why: "Restores fertility in rainfed systems.",
  },
  Cashew: { rec: "Pineapple", why: "Intercropping generates early income." },
  Castor: {
    rec: "Sorghum or Pearl Millet",
    why: "Non-edible oilseed breaks typical pest cycles.",
  },
  Chilli: {
    rec: "Onion or Garlic",
    why: "Breaks viral disease transmission cycle.",
  },
  Coconut: {
    rec: "Pepper, Cocoa or Banana",
    why: "Multi-tier cropping maximizes land use.",
  },
  Coffee: {
    rec: "Silver Oak or Legume Cover",
    why: "Shade and nitrogen fixation.",
  },
  Coriander: {
    rec: "Fenugreek or Cumin",
    why: "Suitable for short winter rotation.",
  },
  Cotton: {
    rec: "Sorghum or Maize",
    why: "Deep root system breaks soil compaction.",
  },
  Cumin: {
    rec: "Pearl Millet",
    why: "Reduces blight and wilt disease pressure.",
  },
  Fennel: {
    rec: "Green Gram",
    why: "Restores nitrogen after deep-rooted fennel.",
  },
  Fenugreek: {
    rec: "Cotton or Maize",
    why: "Conditions soil and suppresses early weeds.",
  },
  Garlic: {
    rec: "Legumes",
    why: "Garlic is a heavy feeder; legumes restore balance.",
  },
  Ginger: {
    rec: "Cowpea or Green Manure",
    why: "Prevents bacterial wilt accumulation.",
  },
  "Gram (Chickpea)": {
    rec: "Sorghum or Pearl Millet",
    why: "Balances moisture usage from deep profiles.",
  },
  Grapes: {
    rec: "Sunhemp (Cover Crop)",
    why: "Increases organic carbon in vineyards.",
  },
  "Green Gram (Moong)": {
    rec: "Wheat or Barley",
    why: "Excellent short-duration nitrogen fixer before rabi.",
  },
  Groundnut: {
    rec: "Maize or Pearl Millet",
    why: "Cereals use the fixed nitrogen efficiently.",
  },
  Jute: {
    rec: "Rice or Mustard",
    why: "Standard rotation in eastern floodplains.",
  },
  Linseed: {
    rec: "Rice or Soybean",
    why: "Utilizes residual moisture in heavy soils.",
  },
  Maize: {
    rec: "Groundnut or Cowpea",
    why: "Fixes nitrogen and improves soil structure.",
  },
  Mango: {
    rec: "Turmeric or Ginger",
    why: "Profitable intercrop in early orchard years.",
  },
  Mustard: {
    rec: "Green Gram (Moong)",
    why: "Quick legume rotation builds organic carbon.",
  },
  Onion: {
    rec: "Coriander or Fenugreek",
    why: "Short duration crops utilize residual moisture.",
  },
  Papaya: { rec: "Marigold", why: "Controls root-knot nematodes effectively." },
  "Pearl Millet (Bajra)": {
    rec: "Mustard or Taramira",
    why: "Optimal for light sandy soils with low rainfall.",
  },
  "Pigeon Pea (Tur)": {
    rec: "Cotton or Sesame",
    why: "Deep taproots break hardpans for subsequent crops.",
  },
  Potato: {
    rec: "Cereal Crops (Wheat/Oat)",
    why: "Reduces soil-borne disease buildup like scab.",
  },
  Rice: {
    rec: "Mustard or Pulses",
    why: "Breaks pest cycle and prevents soil hardening.",
  },
  Rubber: {
    rec: "Pueraria (Cover Crop)",
    why: "Prevents soil erosion in hilly terrain.",
  },
  Safflower: { rec: "Sorghum", why: "Deep roots utilize deep soil moisture." },
  Sesame: {
    rec: "Chickpea or Mustard",
    why: "Drought-hardy rotation for low moisture.",
  },
  Sorghum: {
    rec: "Safflower or Gram",
    why: "Drought tolerant rotation for semi-arid regions.",
  },
  Soybean: {
    rec: "Wheat or Mustard",
    why: "Soybean leaves rich nitrogen for the following cereal.",
  },
  Sugarcane: {
    rec: "Green Manure (Dhaincha)",
    why: "Massive nutrient restoration needed after heavy feeding.",
  },
  Sunflower: {
    rec: "Groundnut or Pigeon Pea",
    why: "Heavy potassium feeder; needs legume rotation.",
  },
  Tea: {
    rec: "Guatemala Grass",
    why: "Used for rehabilitation of old tea soil.",
  },
  Tobacco: {
    rec: "Groundnut",
    why: "Breaks nematode cycles and restores fertility.",
  },
  Tomato: {
    rec: "Marigold or Legumes",
    why: "Marigold reduces nematode population.",
  },
  Turmeric: {
    rec: "Maize or Finger Millet",
    why: "Avoids rhizome rot carryover in the soil.",
  },
  Wheat: {
    rec: "Legumes (Soybean/Gram/Moong)",
    why: "Restores Nitrogen depleted by Wheat.",
  },
};

const ALL_CROPS = Object.keys(recs);

export default function SoilHealthPlanner() {
  const [tab, setTab] = useState("Rotation");
  
  const [saved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ks_soil_plan") || "null") || {};
    } catch {
      return {};
    }
  });
  const [last, setLast] = useState(saved.last || "Wheat");
  const [soil, setSoil] = useState(saved.soil || "Black Cotton");

  // NPK State
  const [n, setN] = useState(typeof saved.n === "number" ? saved.n : 100);
  const [p, setP] = useState(typeof saved.p === "number" ? saved.p : 30);
  const [k, setK] = useState(typeof saved.k === "number" ? saved.k : 150);
  const [ph, setPh] = useState(typeof saved.ph === "number" ? saved.ph : 6.5);

  useEffect(() => {
    const data = { last, soil, n, p, k, ph };
    try { localStorage.setItem("ks_soil_plan", JSON.stringify(data)); } catch (e) {}
  }, [last, soil, n, p, k, ph]);

  const getRec = (l, s) => {
    const base = recs[l] || recs["Wheat"];
    let fRec = base.rec,
      fWhy = base.why;
    if (
      s === "Desert" &&
      !fRec.includes("Millet") &&
      !fRec.includes("Sorghum")
    ) {
      fRec = "Pearl Millet or Desert Legumes";
      fWhy =
        base.why +
        " (Adapted for arid desert soils requiring minimal moisture).";
    } else if (
      s === "Saline" &&
      !fRec.includes("Barley") &&
      !fRec.includes("Mustard")
    ) {
      fRec = "Barley or Mustard";
      fWhy =
        "Barley and Mustard have high salt tolerance, crucial for saline soils. " +
        base.why;
    } else if (s === "Mountain" && l === "Tea") {
      fRec = "Guatemala Grass or Silver Oak";
      fWhy =
        "Terrace rehabilitation in high-altitude mountain soils to prevent leaching.";
    } else if (s === "Mountain" && !fRec.includes("Millet")) {
      fRec = "Finger Millet (Ragi) or Buckwheat";
      fWhy = "Hardy, short-season crops suited to cool high-altitude mountain soils. " + base.why;
    } else if (s === "Red" && fRec.includes("Rice")) {
      fRec = "Finger Millet (Ragi)";
      fWhy =
        "Red soils drain too quickly for Rice. Ragi is highly resilient and nutrient-dense.";
    } else if (s === "Alluvial" && l === "Sugarcane") {
      fRec = "Wheat or Mustard";
      fWhy =
        "Rich alluvial soils can support heavy winter crops immediately after sugarcane harvest.";
    } else if (s === "Black Cotton" && l === "Cotton") {
      fRec = "Pigeon Pea (Tur)";
      fWhy =
        "Tur breaks the deep hardpan in black cotton soils while fixing essential nitrogen.";
    } else if (s === "Laterite" && fRec.includes("Cotton")) {
      fRec = "Cashew or Coconut";
      fWhy =
        "Laterite soils are poor for Cotton. Tree crops thrive here and prevent soil erosion.";
    }
    return { rec: fRec, why: fWhy };
  };
  const r = getRec(last, soil);

  const getNPKStatus = () => {
    let statusList = [];
    if (n < 50)
      statusList.push({
        t: "Nitrogen (N) is Deficient.",
        c: "var(--red)",
        d: "Apply 50-70kg Urea per acre or plant nitrogen-fixing legumes (Moong/Soybean).",
      });
    else if (n > 150)
      statusList.push({
        t: "Nitrogen (N) is Excess.",
        c: "var(--amber)",
        d: "Risk of crop lodging and pests. Withhold nitrogen fertilizers.",
      });
    else
      statusList.push({
        t: "Nitrogen (N) is Optimal.",
        c: "var(--green)",
        d: "Maintain current practices.",
      });

    if (p < 20)
      statusList.push({
        t: "Phosphorus (P) is Deficient.",
        c: "var(--red)",
        d: "Apply 30-50kg DAP (Diammonium Phosphate) to boost root development.",
      });
    else if (p > 80)
      statusList.push({
        t: "Phosphorus (P) is Excess.",
        c: "var(--amber)",
        d: "Can lock out Zinc and Iron. Apply Zinc Sulphate.",
      });
    else
      statusList.push({
        t: "Phosphorus (P) is Optimal.",
        c: "var(--green)",
        d: "Excellent range for flowering.",
      });

    if (k < 150)
      statusList.push({
        t: "Potassium (K) is Deficient.",
        c: "var(--red)",
        d: "Apply MOP (Muriate of Potash) to improve grain weight and drought tolerance.",
      });
    else if (k > 300)
      statusList.push({
        t: "Potassium (K) is Excess.",
        c: "var(--amber)",
        d: "High K can block Magnesium uptake. Pause potash; add Magnesium Sulphate if leaves yellow.",
      });
    else
      statusList.push({
        t: "Potassium (K) is Optimal.",
        c: "var(--green)",
        d: "Good disease resistance.",
      });

    if (ph < 6.0)
      statusList.push({
        t: `pH is ${ph.toFixed(1)} (Acidic).`,
        c: "var(--red)",
        d: "Apply Agricultural Lime (CaCO3) at 1 ton/acre to neutralize acidity.",
      });
    else if (ph > 7.8)
      statusList.push({
        t: `pH is ${ph.toFixed(1)} (Alkaline).`,
        c: "var(--purple, #c084fc)",
        d: "Apply Gypsum (CaSO4) and organic green manure to lower pH.",
      });
    else
      statusList.push({
        t: `pH is ${ph.toFixed(1)} (Optimal).`,
        c: "var(--green)",
        d: "Ideal pH for nutrient absorption.",
      });

    return statusList;
  };

  const copyReport = () => {
    const lines = getNPKStatus().map(s => "• " + s.t + " " + s.d).join("\n");
    const report = "AgroIntel Soil Report\nLast crop: " + last + " | Soil: " + soil + "\nNext crop: " + r.rec + "\n\nNPK  N" + n + " P" + p + " K" + k + " pH" + ph + ":\n" + lines;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(report)
        .then(() => window.dispatchEvent(new CustomEvent("show-toast", { detail: "Soil health report copied! ✓" })))
        .catch(() => {});
    }
  };

  return (
    <div className="card mt3">
      <div className="card-hd flex jcb aic">
        <span className="card-title">🌱 Soil Health & NPK</span>
        <div className="flex gap1">
          <button
            className={`btn btn-sm ${tab === "Rotation" ? "btn-g" : "btn-o"}`}
            onClick={() => setTab("Rotation")}
          >
            Rotation
          </button>
          <button
            className={`btn btn-sm ${tab === "NPK" ? "btn-g" : "btn-o"}`}
            onClick={() => setTab("NPK")}
          >
            NPK Dashboard
          </button>
        </div>
      </div>
      <div className="card-body">
        {tab === "Rotation" ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <div>
                <label htmlFor="shp-lastcrop">Last Crop</label>
                <select
                  className="input"
                  value={last}
                  id="shp-lastcrop"
                  onChange={(e) => setLast(e.target.value)}
                >
                  {ALL_CROPS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="shp-soil">Soil Type</label>
                <select
                  className="input"
                  value={soil}
                  id="shp-soil"
                  onChange={(e) => setSoil(e.target.value)}
                >
                  {[
                    "Black Cotton",
                    "Alluvial",
                    "Red",
                    "Laterite",
                    "Mountain",
                    "Desert",
                    "Saline",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                background: "var(--s2)",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid var(--b2)",
              }}
            >
              <div className="xs t2">Recommended Next Crop</div>
              <div
                className="sm bold"
                style={{
                  color: "var(--green)",
                  fontSize: "16px",
                  marginTop: "4px",
                }}
              >
                {r.rec}
              </div>
              <div className="xs t2 mt1" style={{ lineHeight: 1.4 }}>
                {r.why}
              </div>
            </div>
          </>
        ) : (
          <div className="fade-in">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label htmlFor="shp-n" className="flex jcb xs">
                  <span>Nitrogen (N)</span>
                  <span className="t2">{n} kg/ha</span>
                </label>
                <input
                  id="shp-n"
                  type="range"
                  className="slider"
                  min="0"
                  max="250"
                  value={n}
                  onChange={(e) => setN(parseInt(e.target.value))}
                />
                <div
                  style={{
                    height: "4px",
                    background: `linear-gradient(90deg, var(--red) 20%, var(--green) 50%, var(--amber) 90%)`,
                    borderRadius: "2px",
                    marginTop: "2px",
                  }}
                />
              </div>
              <div>
                <label htmlFor="shp-p" className="flex jcb xs">
                  <span>Phosphorus (P)</span>
                  <span className="t2">{p} kg/ha</span>
                </label>
                <input
                  id="shp-p"
                  type="range"
                  className="slider"
                  min="0"
                  max="150"
                  value={p}
                  onChange={(e) => setP(parseInt(e.target.value))}
                />
                <div
                  style={{
                    height: "4px",
                    background: `linear-gradient(90deg, var(--red) 15%, var(--green) 40%, var(--amber) 80%)`,
                    borderRadius: "2px",
                    marginTop: "2px",
                  }}
                />
              </div>
              <div>
                <label htmlFor="shp-k" className="flex jcb xs">
                  <span>Potassium (K)</span>
                  <span className="t2">{k} kg/ha</span>
                </label>
                <input
                  id="shp-k"
                  type="range"
                  className="slider"
                  min="0"
                  max="400"
                  value={k}
                  onChange={(e) => setK(parseInt(e.target.value))}
                />
                <div
                  style={{
                    height: "4px",
                    background: `linear-gradient(90deg, var(--red) 30%, var(--green) 60%, var(--green) 100%)`,
                    borderRadius: "2px",
                    marginTop: "2px",
                  }}
                />
              </div>
              <div>
                <label htmlFor="shp-ph" className="flex jcb xs">
                  <span>Soil pH Level</span>
                  <span className="bold" style={{ color: ph < 6.0 ? "var(--red)" : ph > 7.8 ? "var(--purple, #c084fc)" : "var(--green)" }}>
                    {ph} {ph < 6.0 ? "· Acidic" : ph > 7.8 ? "· Alkaline" : "· Optimal"}
                  </span>
                </label>
                <input
                  id="shp-ph"
                  type="range"
                  className="slider"
                  min="4.0"
                  max="9.0"
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(parseFloat(e.target.value))}
                />
                <div
                  style={{
                    height: "6px",
                    background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%)",
                    borderRadius: "3px",
                    marginTop: "4px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "-3px",
                      left: `${((ph - 4.0) / 5.0) * 100}%`,
                      width: "12px",
                      height: "12px",
                      background: "#ffffff",
                      border: "2px solid #000000",
                      borderRadius: "50%",
                      transform: "translateX(-50%)",
                      transition: "left 0.1s ease-out",
                    }}
                  />
                </div>
                <div className="flex jcb xs t3 mt1" style={{ fontSize: "9px" }}>
                  <span>4.0 Acidic</span>
                  <span>6.5 - 7.5 Ideal</span>
                  <span>9.0 Alkaline</span>
                </div>
              </div>
            </div>

            <div
              className="mt3"
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {getNPKStatus().map((status, i) => (
                <div
                  key={i}
                  className="flex gap2"
                  style={{
                    background: "var(--s2)",
                    padding: "12px",
                    borderRadius: "8px",
                    borderLeft: `3px solid ${status.c}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div className="xs bold mb1" style={{ color: status.c }}>
                      {status.t}
                    </div>
                    <div className="xs t2" style={{ lineHeight: 1.4 }}>
                      {status.d}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-o btn-sm mt2" onClick={copyReport}>📋 Copy Soil Diagnostic Report</button>
          </div>
        )}
      </div>
    </div>
  );
}
