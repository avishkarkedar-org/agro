import { useState } from "react";
import { safeGetLS } from "../utils/helpers";
import TTSButton from "./TTSButton";

const RECOMMENDATIONS = {
  Kharif: {
    "Black Cotton": [
      {
        crop: "Soybean",
        emoji: "🫘",
        yield: "8-12 q/acre",
        profit: "₹25,000-40,000/acre",
        tip: "Best for deep black soil. Rhizobium inoculation essential.",
      },
      {
        crop: "Cotton",
        emoji: "🌿",
        yield: "8-10 q/acre",
        profit: "₹35,000-50,000/acre",
        tip: "BT hybrid recommended. 90×60cm spacing.",
      },
      {
        crop: "Pigeon Pea (Tur)",
        emoji: "🫘",
        yield: "5-7 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Intercrop with soybean for maximum returns.",
      },
    ],
    Alluvial: [
      {
        crop: "Rice",
        emoji: "🍚",
        yield: "18-22 q/acre",
        profit: "₹20,000-30,000/acre",
        tip: "Transplant 25-day nursery. SRI method saves water.",
      },
      {
        crop: "Maize",
        emoji: "🌽",
        yield: "20-25 q/acre",
        profit: "₹25,000-35,000/acre",
        tip: "Hybrid seed, 60×20cm spacing. Top-dress at knee-high.",
      },
      {
        crop: "Sugarcane",
        emoji: "🎋",
        yield: "350-400 q/acre",
        profit: "₹60,000-80,000/acre",
        tip: "Annual crop. Drip irrigation recommended.",
      },
    ],
    Red: [
      {
        crop: "Groundnut",
        emoji: "🥜",
        yield: "7-10 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Apply gypsum at pegging. Spreading variety for red soil.",
      },
      {
        crop: "Finger Millet (Ragi)",
        emoji: "🌾",
        yield: "8-12 q/acre",
        profit: "₹15,000-25,000/acre",
        tip: "Drought tolerant. Excellent for red laterite soils.",
      },
      {
        crop: "Sesame",
        emoji: "🌿",
        yield: "3-5 q/acre",
        profit: "₹20,000-30,000/acre",
        tip: "Low water requirement. Good for marginal red soils.",
      },
    ],
    Laterite: [
      {
        crop: "Cashew",
        emoji: "🥜",
        yield: "5-8 kg/tree",
        profit: "₹40,000-60,000/acre",
        tip: "Long-term investment. Intercrop with pineapple initially.",
      },
      {
        crop: "Arecanut",
        emoji: "🌴",
        yield: "1.5-2 ton/acre",
        profit: "₹80,000-1,20,000/acre",
        tip: "Requires good rainfall. 5-year gestation period.",
      },
      {
        crop: "Pepper",
        emoji: "🌶️",
        yield: "2-3 kg/vine",
        profit: "₹50,000-70,000/acre",
        tip: "Train on arecanut/silver oak. Shade loving.",
      },
    ],
    Sandy: [
      {
        crop: "Pearl Millet (Bajra)",
        emoji: "🌾",
        yield: "8-12 q/acre",
        profit: "₹15,000-22,000/acre",
        tip: "Most drought tolerant cereal. Hybrid HHB-67 recommended.",
      },
      {
        crop: "Cluster Bean (Guar)",
        emoji: "🌿",
        yield: "5-8 q/acre",
        profit: "₹20,000-30,000/acre",
        tip: "Industrial demand for guar gum. Low water need.",
      },
      {
        crop: "Moth Bean",
        emoji: "🫘",
        yield: "3-5 q/acre",
        profit: "₹12,000-18,000/acre",
        tip: "Extremely drought hardy. 60-70 days crop.",
      },
    ],
    Loamy: [
      {
        crop: "Soybean",
        emoji: "🫘",
        yield: "10-14 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Ideal soil for soybean. JS-9560 variety recommended.",
      },
      {
        crop: "Cotton",
        emoji: "🌿",
        yield: "10-12 q/acre",
        profit: "₹40,000-55,000/acre",
        tip: "Loamy soil gives best cotton quality.",
      },
      {
        crop: "Maize",
        emoji: "🌽",
        yield: "22-28 q/acre",
        profit: "₹28,000-38,000/acre",
        tip: "Sweet corn variety for premium market price.",
      },
    ],
  },
  Rabi: {
    "Black Cotton": [
      {
        crop: "Wheat",
        emoji: "🌾",
        yield: "15-18 q/acre",
        profit: "₹20,000-30,000/acre",
        tip: "Lok-1 variety for Maharashtra. 4-6 irrigations needed.",
      },
      {
        crop: "Chickpea (Gram)",
        emoji: "🫘",
        yield: "6-8 q/acre",
        profit: "₹25,000-35,000/acre",
        tip: "Desi variety. Minimal irrigation needed on black soil.",
      },
      {
        crop: "Safflower",
        emoji: "🌻",
        yield: "5-7 q/acre",
        profit: "₹20,000-28,000/acre",
        tip: "Rainfed crop. Deep black soil retains moisture.",
      },
    ],
    Alluvial: [
      {
        crop: "Wheat",
        emoji: "🌾",
        yield: "18-22 q/acre",
        profit: "₹25,000-35,000/acre",
        tip: "HD-2967 or PBW-343. Crown root irrigation critical.",
      },
      {
        crop: "Mustard",
        emoji: "🌿",
        yield: "6-8 q/acre",
        profit: "₹22,000-32,000/acre",
        tip: "Pusa Bold variety. Aphid spray at flowering.",
      },
      {
        crop: "Potato",
        emoji: "🥔",
        yield: "80-120 q/acre",
        profit: "₹40,000-60,000/acre",
        tip: "Kufri Jyoti. High investment but high returns.",
      },
    ],
    Red: [
      {
        crop: "Chickpea",
        emoji: "🫘",
        yield: "5-7 q/acre",
        profit: "₹22,000-30,000/acre",
        tip: "JG-11 variety. Wilt resistant for red soils.",
      },
      {
        crop: "Linseed",
        emoji: "🌿",
        yield: "4-6 q/acre",
        profit: "₹18,000-25,000/acre",
        tip: "Low input crop. Good for marginal red soils.",
      },
      {
        crop: "Coriander",
        emoji: "🌿",
        yield: "4-6 q/acre",
        profit: "₹25,000-35,000/acre",
        tip: "Short duration (90 days). Good market demand.",
      },
    ],
    Laterite: [
      {
        crop: "Cashew (maintenance)",
        emoji: "🥜",
        yield: "—",
        profit: "—",
        tip: "Pruning and manuring season for existing orchards.",
      },
      {
        crop: "Vegetables",
        emoji: "🥬",
        yield: "40-60 q/acre",
        profit: "₹30,000-50,000/acre",
        tip: "Cabbage, cauliflower in cool laterite highlands.",
      },
      {
        crop: "Turmeric",
        emoji: "🌿",
        yield: "60-80 q/acre",
        profit: "₹50,000-70,000/acre",
        tip: "Harvest season. Cure and dry for best price.",
      },
    ],
    Sandy: [
      {
        crop: "Mustard",
        emoji: "🌿",
        yield: "5-7 q/acre",
        profit: "₹20,000-28,000/acre",
        tip: "Tolerates sandy soil well. RH-749 variety.",
      },
      {
        crop: "Cumin",
        emoji: "🌿",
        yield: "2-4 q/acre",
        profit: "₹30,000-50,000/acre",
        tip: "High value spice. Needs cool dry weather.",
      },
      {
        crop: "Barley",
        emoji: "🌾",
        yield: "12-15 q/acre",
        profit: "₹15,000-22,000/acre",
        tip: "Most salt-tolerant cereal. Good for poor sandy soils.",
      },
    ],
    Loamy: [
      {
        crop: "Wheat",
        emoji: "🌾",
        yield: "20-24 q/acre",
        profit: "₹28,000-38,000/acre",
        tip: "Best yields on loamy soil. Timely sowing critical.",
      },
      {
        crop: "Potato",
        emoji: "🥔",
        yield: "100-140 q/acre",
        profit: "₹50,000-70,000/acre",
        tip: "Loamy soil ideal for tuber development.",
      },
      {
        crop: "Onion",
        emoji: "🧅",
        yield: "80-100 q/acre",
        profit: "₹40,000-60,000/acre",
        tip: "Nashik Red variety. Stop irrigation before harvest.",
      },
    ],
  },
  Zaid: {
    "Black Cotton": [
      {
        crop: "Sunflower",
        emoji: "🌻",
        yield: "5-7 q/acre",
        profit: "₹22,000-30,000/acre",
        tip: "Short duration (90 days). KBSH-44 hybrid.",
      },
      {
        crop: "Green Gram (Moong)",
        emoji: "🫘",
        yield: "4-6 q/acre",
        profit: "₹20,000-28,000/acre",
        tip: "60-65 days. Excellent nitrogen fixer before Kharif.",
      },
      {
        crop: "Watermelon",
        emoji: "🍉",
        yield: "80-100 q/acre",
        profit: "₹30,000-50,000/acre",
        tip: "High water need but high returns in summer.",
      },
    ],
    Alluvial: [
      {
        crop: "Cucumber",
        emoji: "🥒",
        yield: "60-80 q/acre",
        profit: "₹25,000-40,000/acre",
        tip: "Drip irrigation essential. 45-50 days to harvest.",
      },
      {
        crop: "Bitter Gourd",
        emoji: "🥬",
        yield: "40-60 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Pandal system gives best quality.",
      },
      {
        crop: "Muskmelon",
        emoji: "🍈",
        yield: "50-70 q/acre",
        profit: "₹35,000-50,000/acre",
        tip: "Sandy loam best. Harvest at half-slip stage.",
      },
    ],
    Red: [
      {
        crop: "Green Gram",
        emoji: "🫘",
        yield: "3-5 q/acre",
        profit: "₹18,000-25,000/acre",
        tip: "Short duration pulse. Minimal irrigation.",
      },
      {
        crop: "Sesame",
        emoji: "🌿",
        yield: "3-4 q/acre",
        profit: "₹18,000-24,000/acre",
        tip: "Drought tolerant summer oilseed.",
      },
      {
        crop: "Fodder Sorghum",
        emoji: "🌾",
        yield: "150-200 q/acre (green)",
        profit: "₹10,000-15,000/acre",
        tip: "Quick fodder for livestock in summer.",
      },
    ],
    Laterite: [
      {
        crop: "Pineapple",
        emoji: "🍍",
        yield: "20-25 ton/acre",
        profit: "₹60,000-80,000/acre",
        tip: "Ratoon crop. Plant in April-May.",
      },
      {
        crop: "Banana",
        emoji: "🍌",
        yield: "25-30 ton/acre",
        profit: "₹70,000-1,00,000/acre",
        tip: "Grand Naine variety. Tissue culture plants.",
      },
      {
        crop: "Vegetables",
        emoji: "🥬",
        yield: "30-50 q/acre",
        profit: "₹25,000-40,000/acre",
        tip: "Okra, ridge gourd in summer.",
      },
    ],
    Sandy: [
      {
        crop: "Watermelon",
        emoji: "🍉",
        yield: "100-120 q/acre",
        profit: "₹35,000-55,000/acre",
        tip: "Sandy soil ideal for watermelon. Drip essential.",
      },
      {
        crop: "Muskmelon",
        emoji: "🍈",
        yield: "60-80 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Premium market in summer. 60-70 days.",
      },
      {
        crop: "Cluster Bean",
        emoji: "🌿",
        yield: "5-7 q/acre",
        profit: "₹18,000-25,000/acre",
        tip: "Heat tolerant. Good for sandy arid zones.",
      },
    ],
    Loamy: [
      {
        crop: "Cucumber",
        emoji: "🥒",
        yield: "70-90 q/acre",
        profit: "₹30,000-45,000/acre",
        tip: "Parthenocarpic hybrid for polyhouse.",
      },
      {
        crop: "Tomato",
        emoji: "🍅",
        yield: "100-150 q/acre",
        profit: "₹40,000-60,000/acre",
        tip: "Summer tomato gets premium price.",
      },
      {
        crop: "Green Gram",
        emoji: "🫘",
        yield: "5-7 q/acre",
        profit: "₹22,000-30,000/acre",
        tip: "Quick pulse before monsoon. IPM-2-14 variety.",
      },
    ],
  },
};

export default function SeasonalCropRecommend() {
  const [location, setLocation] = useState(
    () => safeGetLS("agrointel_city") || "Pune",
  );
  const [soilType, setSoilType] = useState("Black Cotton");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const month = new Date().getMonth() + 1;
  const season =
    month >= 6 && month <= 10
      ? "Kharif"
      : month >= 11 || month <= 2
        ? "Rabi"
        : "Zaid";

  const getRecommendations = () => {
    setLoading(true);
    setTimeout(() => {
      const recs =
        RECOMMENDATIONS[season]?.[soilType] ||
        RECOMMENDATIONS["Kharif"]["Black Cotton"];
      setResult(recs);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">🌿 Seasonal Crop Recommendation</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          {season} SEASON
        </span>
      </div>
      <div className="card-body">
        <p className="xs t2 mb3" style={{ lineHeight: 1.5 }}>
          Get AI-powered crop suggestions based on your soil type, location, and
          current season.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div>
            <label>Your Soil Type</label>
            <select
              className="input"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            >
              {[
                "Black Cotton",
                "Alluvial",
                "Red",
                "Laterite",
                "Sandy",
                "Loamy",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Location</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Pune"
            />
          </div>
        </div>
        <div className="flex gap2 mb3 wrap">
          <span className="chip cg xs">
            📅 {new Date().toLocaleString("default", { month: "long" })}
          </span>
          <span className="chip cg xs">🌿 {season} Season</span>
          <span className="chip cx xs">🌍 {location}</span>
        </div>
        <button
          className="btn btn-g w100"
          onClick={getRecommendations}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "🌾 Get Best Crops for This Season"}
        </button>
        {result && (
          <div
            className="fade-in mt3"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div className="flex jcb aic mb1">
              <span className="mono xs tg" style={{ letterSpacing: ".08em" }}>
                TOP 3 RECOMMENDED CROPS
              </span>
              <TTSButton
                text={result
                  .map(
                    (r) =>
                      `${r.crop}: yield ${r.yield}, profit ${r.profit}. ${r.tip}`,
                  )
                  .join(". ")}
                label="Listen"
              />
            </div>
            {result.map((r, i) => (
              <div
                key={i}
                style={{
                  background: "var(--s2)",
                  border: "1px solid var(--b1)",
                  borderRadius: "12px",
                  padding: "14px",
                  borderLeft: `3px solid ${i === 0 ? "var(--green)" : i === 1 ? "var(--amber)" : "var(--blue)"}`,
                }}
              >
                <div className="flex aic jcb mb2">
                  <div className="flex aic gap2">
                    <span style={{ fontSize: "24px" }}>{r.emoji}</span>
                    <div>
                      <div className="sm bold">{r.crop}</div>
                      <div className="xs t3">Expected Yield: {r.yield}</div>
                    </div>
                  </div>
                  <span className="chip cg" style={{ fontSize: "10px" }}>
                    #{i + 1}
                  </span>
                </div>
                <div className="flex jcb aic mb2">
                  <span className="xs t2">Est. Profit/Acre</span>
                  <span className="sm bold" style={{ color: "var(--green)" }}>
                    {r.profit}
                  </span>
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    background: "var(--s3)",
                    borderRadius: "8px",
                  }}
                >
                  <span className="xs t2" style={{ lineHeight: 1.5 }}>
                    💡 {r.tip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
