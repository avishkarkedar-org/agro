import React, { useState } from "react";

const PESTS = [
  {
    crop: "Tomato",
    pest: "Fruit Borer (Helicoverpa)",
    months: [2, 3, 4, 9, 10, 11],
    color: "#f87171",
    severity: "High",
    control: "Spray Spinosad 45% SC @ 0.3ml/L or Indoxacarb 14.5% SC @ 1ml/L. Install bird perches.",
  },
  {
    crop: "Cotton",
    pest: "Pink Bollworm & Whitefly",
    months: [7, 8, 9, 10, 11],
    color: "#fb923c",
    severity: "Severe",
    control:
      "Install pheromone traps (5/acre). Spray Profenofos 50% EC @ 2ml/L or Pyriproxyfen 10% EC @ 2ml/L.",
  },
  {
    crop: "Wheat",
    pest: "Yellow Rust & Aphids",
    months: [1, 2, 11, 12],
    color: "#facc15",
    severity: "Severe",
    control:
      "Spray Propiconazole 25% EC (Tilt) @ 1ml/L for rust; Thiamethoxam 25% WG @ 0.2g/L for aphids.",
  },
  {
    crop: "Rice",
    pest: "Brown Planthopper & Stem Borer",
    months: [7, 8, 9, 10],
    color: "#f87171",
    severity: "High",
    control:
      "Alternate wetting/drying to break hopper cycle. Spray Pymetrozine 50% WG @ 0.6g/L or Cartap Hydrochloride 50% SP.",
  },
  {
    crop: "Rice",
    pest: "Blast Disease (Pyricularia)",
    months: [8, 9, 10],
    color: "#f87171",
    severity: "High",
    control: "Foliar spray of Tricyclazole 75% WP @ 0.6g/L or Isoprothiolane 40% EC @ 1.5ml/L at tillering/booting.",
  },
  {
    crop: "Soybean",
    pest: "Stem Fly & Girdle Beetle",
    months: [7, 8, 9],
    color: "#a78bfa",
    severity: "High",
    control: "Seed treatment with Thiamethoxam 30 FS. Spray Chlorantraniliprole 18.5% SC @ 0.3ml/L if infested.",
  },
  {
    crop: "Sugarcane",
    pest: "Top Shoot Borer & Early Shoot Borer",
    months: [3, 4, 5, 6],
    color: "#f87171",
    severity: "High",
    control:
      "Soil application of Chlorantraniliprole 0.4% GR @ 7.5kg/acre at planting or spray Chlorantraniliprole 18.5% SC @ 0.3ml/L.",
  },
  {
    crop: "Onion",
    pest: "Thrips & Purple Blotch",
    months: [1, 2, 3, 11, 12],
    color: "#facc15",
    severity: "Moderate",
    control: "Spray Fipronil 5% SC @ 2ml/L with Mancozeb 75% WP @ 2.5g/L + sticking agent.",
  },
  {
    crop: "Potato",
    pest: "Late Blight Alert (Phytophthora)",
    months: [1, 7, 8, 9, 10, 11, 12],
    color: "#f87171",
    severity: "Severe",
    control:
      "Prophylactic spray of Mancozeb 75% WP @ 2.5g/L. If disease appears, spray Cymoxanil 8% + Mancozeb 64% WP @ 3g/L.",
  },
  {
    crop: "Maize",
    pest: "Fall Armyworm (Spodoptera frugiperda)",
    months: [6, 7, 8, 9],
    color: "#fb923c",
    severity: "Severe",
    control: "Whorl application of sand/ash mixture + Emamectin Benzoate 5% SG @ 0.4g/L or Spinetoram 11.7% SC @ 0.5ml/L.",
  },
  {
    crop: "Gram (Chickpea)",
    pest: "Pod Borer & Wilt",
    months: [1, 2, 3, 11, 12],
    color: "#f87171",
    severity: "High",
    control:
      "Install T-shaped bird perches. Spray Flubendiamide 39.35% SC @ 0.2ml/L or Chlorantraniliprole 18.5% SC at 50% flowering.",
  },
  {
    crop: "Groundnut",
    pest: "White Grub & Tikka Leaf Spot",
    months: [6, 7, 8, 9],
    color: "#a78bfa",
    severity: "Severe",
    control:
      "Seed treatment with Imidacloprid 600 FS @ 3ml/kg. Spray Hexaconazole 5% SC @ 2ml/L for Tikka disease.",
  },
  {
    crop: "Chilli",
    pest: "Murda Leaf Curl & Mites/Thrips Complex",
    months: [2, 3, 4, 8, 9, 10],
    color: "#facc15",
    severity: "High",
    control:
      "Spray Spiromesifen 22.9% SC @ 1ml/L for mites; Spinetoram 11.7% SC @ 1ml/L for thrips; use blue sticky traps.",
  },
  {
    crop: "Mango",
    pest: "Mango Hopper & Powdery Mildew",
    months: [1, 2, 3, 4],
    color: "#fb923c",
    severity: "High",
    control:
      "Spray Buprofezin 25% SC @ 1.5ml/L + Wettable Sulphur 80% WP @ 2g/L prior to panicle emergence.",
  },
  {
    crop: "Mustard",
    pest: "Mustard Aphid & White Rust",
    months: [1, 2, 12],
    color: "#f87171",
    severity: "Severe",
    control: "Spray Dimethoate 30% EC @ 2ml/L or Oxydemeton-methyl 25% EC; Metalaxyl 8% + Mancozeb 64% for white rust.",
  },
  {
    crop: "Pigeon Pea (Tur)",
    pest: "Pod Fly & Pod Borer",
    months: [2, 3, 10, 11],
    color: "#facc15",
    severity: "Moderate",
    control: "Spray Emamectin Benzoate 5% SG @ 0.4g/L or Azadirachtin (Neem Oil 10,000 ppm) @ 2ml/L at pod initiation.",
  },
  {
    crop: "Pomegranate",
    pest: "Bacterial Blight (Telya / Xanthomonas)",
    months: [6, 7, 8, 9, 10],
    color: "#f87171",
    severity: "Severe",
    control: "Spray Streptocycline @ 0.5g/L + Copper Oxychloride @ 2.5g/L. Disinfect pruning shears with Dettol.",
  },
  {
    crop: "Banana",
    pest: "Sigatoka Leaf Spot & Rhizome Weevil",
    months: [6, 7, 8, 9, 10, 11],
    color: "#fb923c",
    severity: "High",
    control: "Spray Propiconazole 25% EC @ 1ml/L with mineral oil (10ml/L). De-sucker regularly and destroy infected leaves.",
  },
  {
    crop: "Grapes",
    pest: "Downy Mildew & Powdery Mildew",
    months: [8, 9, 10, 11, 12],
    color: "#f87171",
    severity: "Severe",
    control: "Prophylactic spray of Bordeaux Mixture 1% or Metalaxyl + Mancozeb @ 2.5g/L. Maintain canopy ventilation.",
  },
  {
    crop: "Ginger / Turmeric",
    pest: "Rhizome Rot (Pythium / Soft Rot)",
    months: [7, 8, 9, 10],
    color: "#f87171",
    severity: "Severe",
    control: "Rhizome treatment with Metalaxyl-M + Mancozeb @ 2.5g/L. Soil drench with Trichoderma harzianum bio-fungicide.",
  },
];

export default function PestCalendar() {
  const [expanded, setExpanded] = useState(null);
  const month = new Date().getMonth() + 1;
  const active = PESTS.filter((p) => p.months.includes(month));
  const upcoming = PESTS.filter(
    (p) =>
      p.months.includes((month % 12) + 1) ||
      p.months.includes(((month + 1) % 12) + 1),
  ).filter((p) => !p.months.includes(month));

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">🐛 Pest Alert Calendar</span>
        <span className="chip ca" style={{ fontSize: "9px" }}>
          THIS MONTH
        </span>
      </div>
      <div className="card-body">
        {active.length === 0 && (
          <p className="sm t2 tc" style={{ padding: "12px 0" }}>
            No major pest alerts this month.
          </p>
        )}
        {active.length > 0 && (
          <>
            <div className="mono xs ta mb2" style={{ letterSpacing: ".08em" }}>
              ⚠️ ACTIVE —{" "}
              {new Date().toLocaleString("default", { month: "long" })}
            </div>
            {active.map((p) => {
              const pKey = `${p.crop}_${p.pest}`;
              const isExp = expanded === pKey;
              return (
                <React.Fragment key={pKey}>
                  <div
                    className="pest-item mb2"
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(isExp ? null : pKey)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(isExp ? null : pKey)}
                  >
                    <div className="pest-dot" style={{ background: p.color }} />
                    <div style={{ flex: 1 }}>
                      <div className="sm bold">
                        {p.crop} — {p.pest}
                      </div>
                      <div className="xs t2 mt1">
                        Click to see control measures
                      </div>
                    </div>
                    <span
                      className={`chip ${p.severity === "Severe" ? "cr" : p.severity === "High" ? "ca" : "cx"}`}
                      style={{ fontSize: "9px" }}
                    >
                      {p.severity}
                    </span>
                  </div>
                  {isExp && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "var(--bg)",
                        borderRadius: "6px",
                        marginTop: "-4px",
                        marginBottom: "8px",
                        fontSize: "12px",
                        color: "var(--t2)",
                        lineHeight: 1.5,
                        border: "1px solid var(--b1)",
                        borderTop: "none",
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                      }}
                    >
                      <strong style={{ color: "var(--fg)" }}>Control:</strong>{" "}
                      {p.control || "Consult local KVK."}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <div className="divider" />
            <div className="mono xs t3 mb2" style={{ letterSpacing: ".08em" }}>
              UPCOMING NEXT 2 MONTHS
            </div>
            {upcoming.map((p) => {
              const pKey = `up_${p.crop}_${p.pest}`;
              const isExp = expanded === pKey;
              return (
                <React.Fragment key={pKey}>
                  <div
                    className="pest-item mb2"
                    style={{ opacity: 0.8 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(isExp ? null : pKey)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(isExp ? null : pKey)}
                  >
                    <div className="pest-dot" style={{ background: p.color }} />
                    <div style={{ flex: 1 }}>
                      <div className="xs t2">
                        {p.crop} — {p.pest}
                      </div>
                    </div>
                    <span className="chip cx" style={{ fontSize: "9px" }}>
                      Soon
                    </span>
                  </div>
                  {isExp && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "var(--bg)",
                        borderRadius: "6px",
                        marginTop: "-4px",
                        marginBottom: "8px",
                        fontSize: "12px",
                        color: "var(--t2)",
                        lineHeight: 1.5,
                        border: "1px solid var(--b1)",
                        borderTop: "none",
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                      }}
                    >
                      <strong style={{ color: "var(--fg)" }}>Control:</strong>{" "}
                      {p.control || "Consult local KVK."}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
        <div
          style={{
            marginTop: "12px",
            padding: "9px 12px",
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: "8px",
          }}
        >
          <p className="xs t2" style={{ lineHeight: 1.55 }}>
            💡 Scout fields every 7 days during active pest months.
          </p>
        </div>
      </div>
    </div>
  );
}
