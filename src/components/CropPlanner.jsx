import { useState, useRef, useEffect } from "react";
import { API } from "../context/SettingsContext";

export default function CropPlanner() {
  const [tab, setTab] = useState("recommend");
  // Quick Recommend state
  const [soilType, setSoilType] = useState("Black Cotton");
  const [water, setWater] = useState("Rainfed");
  const [farmSize, setFarmSize] = useState("");
  const [recResult, setRecResult] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  // Full Plan state
  const [planAcres, setPlanAcres] = useState("");
  const [planBudget, setPlanBudget] = useState("");
  const [planWater, setPlanWater] = useState("Borewell");
  const [planLocation, setPlanLocation] = useState("");
  const [planResult, setPlanResult] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  const abortCtrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
    };
  }, []);

  // Auto-detect season
  const getSeasonName = () => {
    const m = new Date().getMonth() + 1;
    if (m >= 6 && m <= 10) return "Kharif";
    if (m >= 11 || m <= 2) return "Rabi";
    return "Zaid/Summer";
  };

  const getRecommendation = async () => {
    const fs = parseFloat(farmSize);
    if (!fs || fs <= 0 || fs > 10000) return;
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    setRecLoading(true);
    setRecResult("");
    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    const season = getSeasonName();
    const question = `As an expert Indian agronomist, based on ${soilType} soil, ${water} irrigation, and ${fs} acres farm in Maharashtra during ${currentMonth}/${season} season, recommend the top 3 most profitable crops to grow. For each, give crop name, expected yield per acre, approximate modal price in Maharashtra APMC, and estimated net profit. Provide specific, practical advice.`;
    try {
      const r = await fetch(`${API}/api/chat`, {
        method: "POST",
        signal: abortCtrlRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          lang: "en-IN",
          stream: true,
        }),
      });
      if (!r.ok) throw new Error("API Error");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let lineBuffer = "";
      setRecResult("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              if (data.text) {
                aiText += data.text;
                setRecResult(aiText);
              }
            } catch (e) {
              if (e.message && !e.message.includes("JSON")) throw e;
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setRecResult("❌ Error: " + (e.message || "Failed to generate recommendation."));
      }
    } finally {
      setRecLoading(false);
    }
  };

  const getFullPlan = async () => {
    const acres = parseFloat(planAcres);
    const budget = parseFloat(planBudget);
    if (!acres || acres <= 0 || !budget || budget <= 0) return;
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    setPlanLoading(true);
    setPlanResult("");
    const season = getSeasonName();
    const location = (planLocation || "Maharashtra").trim().slice(0, 80);
    const question = `I have ${acres} acres, budget ₹${budget}, ${planWater} irrigation in ${location} during ${season} season. Create a complete farming plan: 1) Best crop to grow 2) Seed variety and quantity needed 3) Fertilizer schedule 4) Expected timeline 5) Estimated cost breakdown 6) Expected revenue and profit. Be specific with numbers and local varieties.`;
    try {
      const r = await fetch(`${API}/api/crop-doctor`, {
        method: "POST",
        signal: abortCtrlRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          crop: "General",
          disease: "",
          severity: "",
          stream: true,
        }),
      });
      if (!r.ok) throw new Error("API Error");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let lineBuffer = "";
      setPlanResult("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              if (data.text) {
                aiText += data.text;
                setPlanResult(aiText);
              }
            } catch (e) {
              if (e.message && !e.message.includes("JSON")) throw e;
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setPlanResult("❌ Error: " + (e.message || "Failed to generate plan."));
      }
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <div className="card mt3" id="sec-planner">
      <div className="card-hd">
        <span className="card-title">🤖 AI Crop Planner</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          POWERED BY AI
        </span>
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          gap: "6px",
        }}
      >
        <button
          className={`btn btn-sm ${tab === "recommend" ? "btn-g" : "btn-o"}`}
          onClick={() => setTab("recommend")}
        >
          Quick Recommend
        </button>
        <button
          className={`btn btn-sm ${tab === "plan" ? "btn-g" : "btn-o"}`}
          onClick={() => setTab("plan")}
        >
          Full Plan
        </button>
      </div>
      <div className="card-body">
        {(() => {
          const m = new Date().getMonth() + 1;
          const stages =
            m >= 6 && m <= 10
              ? [
                  { label: "Sowing", offset: 0 },
                  { label: "1st Fert.", offset: 21 },
                  { label: "Top Dressing", offset: 45 },
                  { label: "Harvest", offset: 120 },
                ]
              : m >= 11 || m <= 2
              ? [
                  { label: "Sowing", offset: 0 },
                  { label: "Irrigation", offset: 14 },
                  { label: "Fertilizer", offset: 30 },
                  { label: "Harvest", offset: 135 },
                ]
              : [
                  { label: "Sowing", offset: 0 },
                  { label: "Watering", offset: 10 },
                  { label: "Fertilizer", offset: 25 },
                  { label: "Harvest", offset: 90 },
                ];
          return (
            <div className="flex gap2 mb3 wrap">
              <span className="xs t3 bold">📅 Stages:</span>
              {stages.map((st, i) => {
                const d = new Date();
                d.setDate(d.getDate() + st.offset);
                const dl = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                return (
                  <span key={i} className="chip cx xs">
                    {st.label}: {dl}
                  </span>
                );
              })}
            </div>
          );
        })()}
        {tab === "recommend" ? (
          <div className="fade-in">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label htmlFor="cp-soil">Soil Type</label>
                <select
                  className="input"
                  id="cp-soil"
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
                <label htmlFor="cp-water">Water Availability</label>
                <select
                  className="input"
                  id="cp-water"
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                >
                  {["Rainfed", "Canal", "Borewell", "Drip"].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor="cp-farmsize">Farm Size (Acres)</label>
            <input
              className="input"
              type="number"
              min="0.1"
              step="0.1"
              value={farmSize}
              onChange={(e) => setFarmSize(e.target.value)}
              id="cp-farmsize"
              placeholder="e.g. 3"
            />
            <div className="flex gap2 mt2 mb2">
              <span className="chip cx xs">🌿 {getSeasonName()} Season</span>
              <span className="chip cx xs">
                📅 {new Date().toLocaleString("default", { month: "long" })}
              </span>
            </div>
            <button
              className="btn btn-g w100 mt2"
              onClick={getRecommendation}
              disabled={recLoading || !farmSize}
            >
              {recLoading ? "🤔 AI Thinking..." : "🌾 Get Crop Recommendations"}
            </button>
            {recLoading && (
              <div className="tc mt3">
                <div className="ring" style={{ margin: "0 auto" }} />
                <p className="xs t2 mt2">
                  Analyzing soil, water, and market conditions...
                </p>
              </div>
            )}
            {recResult && !recLoading && (
              <div
                className="mt3 fade-in"
                aria-live="polite"
                style={{
                  background: "var(--s2)",
                  border: "1px solid var(--b2)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div
                  className="mono xs tg mb2"
                  style={{ letterSpacing: ".08em" }}
                >
                  🤖 AI RECOMMENDATION
                </div>
                <div
                  className="sm t2"
                  style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}
                >
                  {recResult}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="fade-in">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label htmlFor="cp-acres">Land Size (Acres)</label>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={planAcres}
                  onChange={(e) => setPlanAcres(e.target.value)}
                  id="cp-acres"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label htmlFor="cp-budget">Budget (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="1000"
                  step="1000"
                  value={planBudget}
                  onChange={(e) => setPlanBudget(e.target.value)}
                  id="cp-budget"
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label htmlFor="cp-watersrc">Water Source</label>
                <select
                  className="input"
                  id="cp-watersrc"
                  value={planWater}
                  onChange={(e) => setPlanWater(e.target.value)}
                >
                  {["Rainfed", "Canal", "Borewell", "Drip", "Sprinkler"].map(
                    (w) => (
                      <option key={w}>{w}</option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="cp-loc">Location / District</label>
                <input
                  className="input"
                  value={planLocation}
                  onChange={(e) => setPlanLocation(e.target.value)}
                  id="cp-loc"
                  placeholder="e.g. Pune"
                />
              </div>
            </div>
            <div className="flex gap2 mb2">
              <span className="chip cg xs">
                🌿 {getSeasonName()} Season (Auto-detected)
              </span>
            </div>
            <button
              className="btn btn-g w100 mt2"
              onClick={getFullPlan}
              disabled={planLoading || !planAcres || !planBudget}
            >
              {planLoading
                ? "🤔 Creating Plan..."
                : "📋 Generate Full Farm Plan"}
            </button>
            {planLoading && (
              <div className="tc mt3">
                <div className="ring" style={{ margin: "0 auto" }} />
                <p className="xs t2 mt2">
                  Creating personalized farming plan...
                </p>
              </div>
            )}
            {planResult && !planLoading && (
              <div
                className="mt3 fade-in"
                aria-live="polite"
                style={{
                  background: "var(--s2)",
                  border: "1px solid var(--b2)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div
                  className="mono xs tg mb2"
                  style={{ letterSpacing: ".08em" }}
                >
                  📋 YOUR FARM PLAN
                </div>
                <div
                  className="sm t2"
                  style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}
                >
                  {planResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
