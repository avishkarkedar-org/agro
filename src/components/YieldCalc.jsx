import { useState, useEffect } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import { API } from "../context/SettingsContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CROP_DATA = {
  // Prices: MSP 2026-27 (₹/quintal). Yield: avg Maharashtra (q/acre). Cost: avg input cost/acre.
  Wheat: { yield: 15, cost: 14000, price: 2585 },
  Rice: { yield: 18, cost: 18000, price: 2441 },
  Maize: { yield: 22, cost: 15000, price: 2410 },
  Soybean: { yield: 8, cost: 12000, price: 5708 },
  Sugarcane: { yield: 350, cost: 45000, price: 350 },
  Cotton: { yield: 8, cost: 20000, price: 8667 },
  Onion: { yield: 80, cost: 38000, price: 1050 },
  Potato: { yield: 100, cost: 48000, price: 1450 },
  Tomato: { yield: 150, cost: 55000, price: 850 },
  Groundnut: { yield: 7, cost: 15000, price: 7517 },
  "Tur Dal": { yield: 5, cost: 12000, price: 10200 },
  Chana: { yield: 6, cost: 11000, price: 6200 },
  Mustard: { yield: 6, cost: 12000, price: 6200 },
  Sunflower: { yield: 5, cost: 11000, price: 8343 },
  Bajra: { yield: 8, cost: 10000, price: 2900 },
};

export default function YieldCalc() {
  const [tab, setTab] = useState("yield"); // 'yield' | 'kcc' | 'water'
  const [crop, setCrop] = useState(
    () => safeGetLS("agrointel_crop") || "Wheat",
  );
  const [acres, setAcres] = useState(
    () => safeGetLS("agrointel_acres") || "",
  );
  const [res, setRes] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [fertCost, setFertCost] = useState(5000);

  // KCC State
  const [kccCrop, setKccCrop] = useState("Soybean");
  const [kccAcres, setKccAcres] = useState("3");
  const [kccRes, setKccRes] = useState(null);

  // Irrigation State
  const [irrigCrop, setIrrigCrop] = useState("Sugarcane");
  const [irrigAcres, setIrrigAcres] = useState("2");
  const [soilType, setSoilType] = useState("Loam"); // Sandy | Loam | Clay
  const [irrigMethod, setIrrigMethod] = useState("drip"); // drip | sprinkler | flood
  const [pumpHp, setPumpHp] = useState("5");
  const [irrigRes, setIrrigRes] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/mandi?state=Maharashtra&limit=500`)
      .then((r) => r.json())
      .then((d) => {
        const rec = d.records || [];
        const mapping = {};
        rec.forEach((r) => {
          const c = (r.commodity || "").toLowerCase().trim();
          const p = parseFloat(r.modal_price);
          if (!isNaN(p) && p > 0) {
            if (!mapping[c] || mapping[c] < p) {
              mapping[c] = p;
            }
          }
        });
        setLivePrices(mapping);
      })
      .catch((e) => console.error("Failed to load mandi prices:", e));
  }, []);

  const getMatchedLivePrice = (cropName) => {
    const cn = cropName.toLowerCase();
    if (livePrices[cn]) return livePrices[cn];
    if (cn === "tur dal" && (livePrices["arhar (tur/red gram)"] || livePrices["arhar"] || livePrices["tur"])) {
      return livePrices["arhar (tur/red gram)"] || livePrices["arhar"] || livePrices["tur"];
    }
    if (cn === "chana" && (livePrices["gram raw(chhana)"] || livePrices["bengal gram(gram)(whole)"] || livePrices["gram"])) {
      return livePrices["gram raw(chhana)"] || livePrices["bengal gram(gram)(whole)"] || livePrices["gram"];
    }
    for (const [k, v] of Object.entries(livePrices)) {
      if (k.includes(cn) || cn.includes(k)) return v;
    }
    return null;
  };

  const calc = () => {
    const a = parseFloat(acres);
    if (!a || a <= 0 || a > 10000 || !CROP_DATA[crop]) return;
    const d = CROP_DATA[crop];

    const lp = getMatchedLivePrice(crop);
    let actualPrice = lp && !isNaN(lp) && lp > 0 ? lp : d.price;

    const safeFert = Math.max(0, parseFloat(fertCost) || 0);
    const revenue = Math.round(d.yield * a * actualPrice);
    const totalCost = Math.round(d.cost * a + safeFert);
    const profit = revenue - totalCost;
    setRes({
      revenue,
      profit,
      cost: totalCost,
      priceUsed: actualPrice,
      isLive: !!lp,
    });
  };

  const calcKCC = () => {
    const a = parseFloat(kccAcres);
    if (!a || a <= 0 || a > 10000) return;
    const scaleOfFinance = {
      Wheat: 32000, Rice: 36000, Soybean: 30000, Cotton: 42000,
      Sugarcane: 75000, Onion: 48000, Potato: 52000, Maize: 28000,
      "Tur Dal": 26000, Chana: 25000, Groundnut: 32000
    }[kccCrop] || 30000;

    const cropCost = scaleOfFinance * a;
    const postHarvest = cropCost * 0.10; // 10% household / post-harvest
    const farmMaintenance = cropCost * 0.20; // 20% maintenance of farm assets
    const totalLimit = Math.round(cropCost + postHarvest + farmMaintenance);
    
    // Statutory RBI Rule: 3% prompt repayment subvention applies to max ₹3,00,000 principal
    const subventionEligible = Math.min(totalLimit, 300000);
    const annualInterest7Pct = Math.round(totalLimit * 0.07);
    const promptSubvention3Pct = Math.round(subventionEligible * 0.03);
    const netInterest4Pct = annualInterest7Pct - promptSubvention3Pct;

    setKccRes({
      scaleOfFinance,
      cropCost,
      postHarvest,
      farmMaintenance,
      totalLimit,
      subventionEligible,
      annualInterest7Pct,
      promptSubvention3Pct,
      netInterest4Pct
    });
  };

  const calcIrrigation = () => {
    const a = parseFloat(irrigAcres);
    if (!a || a <= 0 || a > 10000) return;
    // Water requirement in mm/day
    const baseMm = {
      Sugarcane: 8.5, Rice: 9.0, Wheat: 4.5, Cotton: 5.5,
      Soybean: 4.0, Onion: 5.0, Tomato: 6.0, Maize: 5.0
    }[irrigCrop] || 5.0;

    const soilFactor = { Sandy: 1.25, Loam: 1.0, Clay: 0.85 }[soilType] || 1.0;
    const efficiency = { drip: 0.90, sprinkler: 0.75, flood: 0.50 }[irrigMethod] || 0.80;

    // 1 mm water over 1 acre = 4,047 Liters
    const grossLitersPerDay = Math.round((baseMm * soilFactor * a * 4047) / efficiency);
    const hp = Math.max(1, parseFloat(pumpHp) || 5);
    // ~7,000 Liters/hr per HP for typical agricultural submersible head
    const pumpOutputLph = hp * 7000;
    const hoursNeeded = Math.min(24, Number((grossLitersPerDay / pumpOutputLph).toFixed(1)));
    const dischargePerHr = hp * 7000;
    const pumpingHours = (grossLitersPerDay / dischargePerHr).toFixed(1);

    setIrrigRes({
      grossLitersPerDay,
      pumpingHours,
      efficiencyPct: Math.round(efficiency * 100),
      savingsVsFlood: Math.round((1 - (0.50 / efficiency)) * 100)
    });
  };

  return (
    <div className="card mt3">
      <div className="card-hd flex jcb aic">
        <span className="card-title">📈 Farm Calculators & Estimators</span>
        <div className="flex gap1">
          <button
            className={`btn btn-sm ${tab === "yield" ? "btn-g" : "btn-o"}`}
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setTab("yield")}
          >
            💰 Yield & Profit
          </button>
          <button
            className={`btn btn-sm ${tab === "kcc" ? "btn-g" : "btn-o"}`}
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => { setTab("kcc"); if (!kccRes) calcKCC(); }}
          >
            💳 KCC Limit
          </button>
          <button
            className={`btn btn-sm ${tab === "water" ? "btn-g" : "btn-o"}`}
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => { setTab("water"); if (!irrigRes) calcIrrigation(); }}
          >
            💧 Irrigation
          </button>
        </div>
      </div>
      <div className="card-body">
        {tab === "yield" && (
          <div className="fade-in">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label htmlFor="yc-crop">Crop</label>
                <select
                  className="input"
                  value={crop}
                  id="yc-crop"
                  onChange={(e) => {
                    setCrop(e.target.value);
                    setRes(null);
                    safeSetLS("agrointel_crop", e.target.value);
                  }}
                >
                  {Object.keys(CROP_DATA).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="yc-acres">Farm Size (Acres)</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={acres}
                  onChange={(e) => {
                    setAcres(e.target.value);
                    setRes(null);
                    safeSetLS("agrointel_acres", e.target.value);
                  }}
                  id="yc-acres"
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>
            <div className="mb3">
              <div className="flex jcb mb1">
                <label htmlFor="yc-fertcost">Extra Fertilizer / Labor Cost</label>
                <span className="xs tb">₹{fertCost}</span>
              </div>
              <input
                type="range"
                className="w100"
                min="0"
                max="50000"
                step="1000"
                value={fertCost}
                id="yc-fertcost"
                onChange={(e) => {
                  setFertCost(e.target.value);
                  setRes(null);
                }}
              />
            </div>
            <button
              className="btn btn-g w100 mt2"
              style={{ padding: "10px" }}
              onClick={calc}
            >
              Estimate Returns & Profit
            </button>
            {res && (
              <div
                id="yield-result"
                className="fade-in mt3"
                style={{
                  background: "var(--s2)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--b1)",
                }}
              >
                <div className="flex jcb mb2">
                  <span className="xs t2">Est. Production Cost</span>
                  <span className="bold" style={{ color: "var(--red)" }}>
                    - ₹ {res.cost.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">Expected Gross Revenue</span>
                  <span className="bold" style={{ color: "var(--ds-text)" }}>
                    ₹ {res.revenue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">Mandi Selling Price</span>
                  <span
                    className="bold xs"
                    style={{ color: res.isLive ? "var(--green)" : "var(--amber)" }}
                  >
                    ₹{res.priceUsed}/Q {res.isLive ? "(Live APMC)" : "(Govt MSP)"}
                  </span>
                </div>
                <div style={{ width: "100%", height: 180, marginBottom: "12px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Cost", value: Math.round(res.cost) },
                        { name: "Revenue", value: Math.round(res.revenue) },
                        { name: "Profit", value: Math.round(res.profit) },
                      ]}
                      margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{ background: "var(--s3)", border: "1px solid var(--b1)", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val) => ["₹" + Number(val).toLocaleString("en-IN"), "Amount"]}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {["var(--red)", "var(--green)", res.profit >= 0 ? "var(--green)" : "var(--red)"].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="divider mb2 mt2" />
                <div className="flex jcb aic mb3">
                  <span className="sm bold">Est. Net Profit</span>
                  <span
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: res.profit > 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    ₹ {res.profit.toLocaleString("en-IN")}
                  </span>
                </div>
                <button className="btn btn-sm btn-o w100" onClick={() => window.print()}>
                  ⬇ Export / Print Summary
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "kcc" && (
          <div className="fade-in">
            <div className="xs t2 mb3">
              Estimate your statutory <strong>Kisan Credit Card (KCC)</strong> sanctioned limit based on official RBI Scale of Finance guidelines (Crop Cost + 10% Household + 20% Farm Maintenance).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
              <div>
                <label>Primary Crop</label>
                <select className="input" value={kccCrop} onChange={(e) => setKccCrop(e.target.value)}>
                  {["Soybean", "Cotton", "Sugarcane", "Wheat", "Onion", "Tur Dal", "Chana", "Groundnut", "Rice", "Maize"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Operational Land (Acres)</label>
                <input className="input" type="number" step="0.5" value={kccAcres} onChange={(e) => setKccAcres(e.target.value)} placeholder="e.g. 3" />
              </div>
            </div>
            <button className="btn btn-g w100 mb3" onClick={calcKCC}>
              Calculate KCC Loan Limit
            </button>
            {kccRes && (
              <div style={{ background: "var(--s2)", padding: "16px", borderRadius: "12px", border: "1px solid var(--b1)" }}>
                <div className="flex jcb mb2">
                  <span className="xs t2">Scale of Finance ({kccCrop})</span>
                  <span className="bold xs">₹{kccRes.scaleOfFinance.toLocaleString("en-IN")} / Acre</span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">Direct Crop Cultivation Cost</span>
                  <span className="bold xs">₹{kccRes.cropCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">+ 10% Post-Harvest / Household</span>
                  <span className="bold xs">₹{kccRes.postHarvest.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">+ 20% Maintenance of Farm Assets</span>
                  <span className="bold xs">₹{kccRes.farmMaintenance.toLocaleString("en-IN")}</span>
                </div>
                <div className="divider mb2 mt2" />
                <div className="flex jcb aic mb3">
                  <div>
                    <div className="bold tg" style={{ fontSize: "18px" }}>₹{kccRes.totalLimit.toLocaleString("en-IN")}</div>
                    <div className="xs t3">Total Sanctioned KCC Limit (Year 1)</div>
                  </div>
                  <span className="chip cg xs">4% EFFECTIVE APR</span>
                </div>
                <div className="xs t2" style={{ background: "var(--s3)", padding: "10px", borderRadius: "8px" }}>
                  💡 <strong>Prompt Repayment Benefit:</strong> Base interest is 7% (₹{kccRes.annualInterest7Pct}/yr). On prompt repayment before due date, Central Govt grants 3% subvention (₹{kccRes.promptSubvention3Pct}), lowering net interest to only <strong>₹{kccRes.netInterest4Pct}/yr (4% APR)</strong> up to ₹3 Lakhs.
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "water" && (
          <div className="fade-in">
            <div className="xs t2 mb3">
              Calculate daily irrigation water requirement and pump runtime based on crop evapotranspiration (ET0), soil texture, and irrigation method.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div>
                <label>Crop</label>
                <select className="input" value={irrigCrop} onChange={(e) => setIrrigCrop(e.target.value)}>
                  {["Sugarcane", "Cotton", "Soybean", "Wheat", "Onion", "Tomato", "Rice", "Maize"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Area (Acres)</label>
                <input className="input" type="number" step="0.5" value={irrigAcres} onChange={(e) => setIrrigAcres(e.target.value)} />
              </div>
              <div>
                <label>Soil Type</label>
                <select className="input" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Sandy">Sandy (High Leaching)</option>
                  <option value="Loam">Medium Loam (Balanced)</option>
                  <option value="Clay">Black Cotton Clay (High Retention)</option>
                </select>
              </div>
              <div>
                <label>Irrigation System</label>
                <select className="input" value={irrigMethod} onChange={(e) => setIrrigMethod(e.target.value)}>
                  <option value="drip">Drip Irrigation (90% Eff.)</option>
                  <option value="sprinkler">Sprinkler (75% Eff.)</option>
                  <option value="flood">Surface / Flood (50% Eff.)</option>
                </select>
              </div>
            </div>
            <div className="mb3">
              <label>Electric Pump Capacity (HP)</label>
              <select className="input" value={pumpHp} onChange={(e) => setPumpHp(e.target.value)}>
                <option value="3">3 HP Submersible (~21,000 L/hr)</option>
                <option value="5">5 HP Submersible (~35,000 L/hr)</option>
                <option value="7.5">7.5 HP Submersible (~52,000 L/hr)</option>
                <option value="10">10 HP Submersible (~70,000 L/hr)</option>
              </select>
            </div>
            <button className="btn btn-g w100 mb3" onClick={calcIrrigation}>
              Calculate Daily Water & Runtime
            </button>
            {irrigRes && (
              <div style={{ background: "var(--s2)", padding: "16px", borderRadius: "12px", border: "1px solid var(--b1)" }}>
                <div className="flex jcb mb2">
                  <span className="xs t2">Daily Water Requirement</span>
                  <span className="bold xs tg">{irrigRes.grossLitersPerDay.toLocaleString("en-IN")} Liters / Day</span>
                </div>
                <div className="flex jcb mb2">
                  <span className="xs t2">System Efficiency</span>
                  <span className="bold xs">{irrigRes.efficiencyPct}%</span>
                </div>
                <div className="flex jcb aic mb3">
                  <div>
                    <div className="bold tg" style={{ fontSize: "20px" }}>{irrigRes.pumpingHours} Hours / Day</div>
                    <div className="xs t3">Estimated Pump Runtime for {pumpHp} HP</div>
                  </div>
                  {irrigMethod === "drip" && (
                    <span className="chip cg xs">💧 SAVES ~45% WATER</span>
                  )}
                </div>
                <div className="xs t2" style={{ background: "var(--s3)", padding: "10px", borderRadius: "8px" }}>
                  💡 <strong>Agronomy Recommendation:</strong> Operate drip fertigation during early morning (6 AM – 9 AM) or late evening to minimize evaporative losses and prevent leaf thermal shock.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
