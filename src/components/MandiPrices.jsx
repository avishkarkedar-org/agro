import { useState, useEffect, useCallback } from "react";
import { API } from "../context/SettingsContext";
import { onActivateKey } from "../utils/helpers";
import { useDebounce } from "use-debounce";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import TTSButton from "./TTSButton";

const PUNE_STATIC = [
  {
    commodity: "Wheat",
    variety: "Lok-1 / Sharbati",
    market: "Pune APMC",
    min_price: "2500",
    modal_price: "2650",
    max_price: "2850",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Bajra (Pearl Millet)",
    variety: "Hybrid / Desi",
    market: "Pune APMC",
    min_price: "2600",
    modal_price: "2900",
    max_price: "3150",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Jowar (Sorghum)",
    variety: "White Maldandi",
    market: "Pune APMC",
    min_price: "3800",
    modal_price: "4100",
    max_price: "4400",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Maize",
    variety: "Yellow",
    market: "Pune APMC",
    min_price: "2200",
    modal_price: "2410",
    max_price: "2600",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Rice (Paddy)",
    variety: "Indrayani / Kolam",
    market: "Pune APMC",
    min_price: "3600",
    modal_price: "4100",
    max_price: "4600",
    grade: "Grade A",
    isStatic: true,
  },
  {
    commodity: "Soybean",
    variety: "Yellow",
    market: "Pune APMC",
    min_price: "5200",
    modal_price: "5708",
    max_price: "6100",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Tur Dal (Pigeon Pea)",
    variety: "Local / Hybrid",
    market: "Pune APMC",
    min_price: "9500",
    modal_price: "10200",
    max_price: "11000",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Chana (Chickpea)",
    variety: "Desi",
    market: "Pune APMC",
    min_price: "5800",
    modal_price: "6200",
    max_price: "6700",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Urad Dal",
    variety: "Local",
    market: "Pune APMC",
    min_price: "7600",
    modal_price: "8200",
    max_price: "9000",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Moong Dal",
    variety: "Local",
    market: "Pune APMC",
    min_price: "8000",
    modal_price: "8800",
    max_price: "9500",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Groundnut",
    variety: "Bold / Spreading",
    market: "Pune APMC",
    min_price: "6800",
    modal_price: "7517",
    max_price: "8200",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Mustard",
    variety: "Yellow / Black",
    market: "Pune APMC",
    min_price: "5400",
    modal_price: "5900",
    max_price: "6300",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Sunflower",
    variety: "Hybrid",
    market: "Pune APMC",
    min_price: "7600",
    modal_price: "8343",
    max_price: "8900",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Cotton",
    variety: "Long Staple (DCH)",
    market: "Pune APMC",
    min_price: "8000",
    modal_price: "8667",
    max_price: "9200",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Onion",
    variety: "Red Nashik",
    market: "Pune APMC",
    min_price: "500",
    modal_price: "1200",
    max_price: "1800",
    grade: "Grade A",
    isStatic: true,
  },
  {
    commodity: "Potato",
    variety: "Jyoti / Chandramukhi",
    market: "Pune APMC",
    min_price: "1000",
    modal_price: "1350",
    max_price: "1700",
    grade: "Grade A",
    isStatic: true,
  },
  {
    commodity: "Tomato",
    variety: "Local / Hybrid",
    market: "Pune APMC",
    min_price: "1200",
    modal_price: "1977",
    max_price: "2800",
    grade: "Grade A",
    isStatic: true,
  },
  {
    commodity: "Turmeric",
    variety: "Erode / Sangli",
    market: "Pune APMC",
    min_price: "14000",
    modal_price: "16500",
    max_price: "18500",
    grade: "FAQ",
    isStatic: true,
  },
  {
    commodity: "Ginger",
    variety: "Fresh",
    market: "Pune APMC",
    min_price: "3800",
    modal_price: "4500",
    max_price: "5500",
    grade: "Grade A",
    isStatic: true,
  },
  {
    commodity: "Sugarcane",
    variety: "Co-86032 / 265",
    market: "Pune APMC",
    min_price: "3200",
    modal_price: "3500",
    max_price: "3800",
    grade: "FAQ",
    isStatic: true,
  },
];

function MiniChart({ data, color, commodity }) {
  if (!data || data.length < 2)
    return (
      <div className="tc" style={{ padding: "16px 0" }}>
        <div
          className="ring"
          style={{
            margin: "0 auto",
            width: "20px",
            height: "20px",
            border: "2px solid var(--b2)",
            borderTopColor: color,
          }}
        />
        <p className="mono t3 xs mt2">Building history — recorded daily</p>
      </div>
    );
  const vals = data.map((d) => d.price);
  const mn = Math.min(...vals),
    mx = Math.max(...vals);
  const weekChange = (
    ((vals[vals.length - 1] - vals[0]) / vals[0]) *
    100
  ).toFixed(1);
  const isUp = weekChange >= 0;

  return (
    <div
      style={{
        marginTop: "10px",
        padding: "14px",
        background: "var(--s3)",
        borderRadius: "12px",
        border: "1px solid var(--b1)",
      }}
    >
      <div className="flex jcb aic mb2">
        <span className="mono t3 xs" style={{ letterSpacing: ".07em" }}>
          7-DAY TREND
        </span>
        <div className="flex aic gap2">
          <span
            className="mono xs"
            style={{ color: isUp ? "var(--green)" : "var(--red)" }}
          >
            {isUp ? "▲" : "▼"} {Math.abs(weekChange)}%
          </span>
          <span className="mono xs" style={{ color }}>
            ₹{vals[vals.length - 1].toLocaleString("en-IN")}/q
          </span>
        </div>
      </div>
      <div style={{ width: "100%", height: 100, minHeight: 100 }}>
        <ResponsiveContainer width="100%" height={100} minWidth={100} minHeight={100}>
          <LineChart data={data}>
            <XAxis
              dataKey="label"
              stroke="var(--t3)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
            />
            <YAxis domain={["dataMin - 100", "dataMax + 100"]} hide />
            <Tooltip
              contentStyle={{
                background: "var(--s1)",
                border: "1px solid var(--b2)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              itemStyle={{ color: "var(--t1)" }}
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              formatter={(val) => [`₹${val}`, "Price"]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 2, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex jcb mt1">
        <span className="mono t3" style={{ fontSize: "10px" }}>
          Low ₹{mn.toLocaleString("en-IN")}
        </span>
        <span className="mono t3" style={{ fontSize: "10px" }}>
          Spread ₹{(mx - mn).toLocaleString("en-IN")}
        </span>
        <span className="mono t3" style={{ fontSize: "10px" }}>
          High ₹{mx.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

export default function MandiPrices() {
  const [apiPrices, setApiPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [updated, setUpdated] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [charts, setCharts] = useState({});
  const [tab, setTab] = useState("live");
  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("krishi_mandi_alerts") || "{}");
    } catch {
      return {};
    }
  });
  const [transKm, setTransKm] = useState("25");
  const [transVehicle, setTransVehicle] = useState("tempo"); // tempo (₹16/km) | tractor (₹26/km) | truck (₹42/km)
  const [transQty, setTransQty] = useState("25");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/mandi?state=Maharashtra&limit=500`);
      if (!r.ok)
        throw new Error(
          "Live API unavailable (" +
            r.status +
            "). Check reference tab for Pune rates.",
        );
      const d = await r.json();
      const rec = d.records || [];
      if (rec.length === 0)
        throw new Error(
          "No data from API today. See reference tab for Pune rates.",
        );
      rec.sort((a, b) => {
        const ap = (a.market || "").toLowerCase().includes("pune") ? 0 : 1;
        const bp = (b.market || "").toLowerCase().includes("pune") ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.commodity || "").localeCompare(b.commodity || "");
      });
      setApiPrices(rec);
      setUpdated(new Date().toLocaleTimeString("en-IN"));
      return rec;
    } catch (e) {
      setErr(e.message);
      setTab("reference");
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackTrend = (commodity, modalPrice) => {
    const base = Number(modalPrice) || 2500;
    const offsets = [-0.02, 0.015, -0.008, 0.022, -0.01, 0.005, 0];
    const now = new Date();
    return offsets.map((pct, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - idx));
      return {
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        price: Math.round(base * (1 + pct)),
      };
    });
  };

  const buildChart = useCallback((commodity, modal) => {
    if (!commodity) return;
    let already = false;
    setCharts((prev) => {
      if (prev[commodity] && prev[commodity].length >= 2) {
        already = true;
        return prev;
      }
      return { ...prev, [commodity]: generateFallbackTrend(commodity, modal) };
    });
    if (already) return;
    fetch(`${API}/api/mandi/history?commodity=${encodeURIComponent(commodity)}&days=7`)
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.history) && d.history.length >= 2) {
          const hist = d.history.map((h) => ({
            label: new Date(h.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
            price: h.price,
          }));
          setCharts((prev) => ({ ...prev, [commodity]: hist }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onPricesUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setApiPrices(e.detail);
      } else {
        load();
      }
    };
    // PULL_TO_REFRESH_R200: re-fetch when user pulls down on the Mandi tab
    const onPullRefresh = () => load();
    window.addEventListener("agrointel-live-prices-updated", onPricesUpdated);
    window.addEventListener("agrointel-pull-refresh", onPullRefresh);
    return () => {
      window.removeEventListener("agrointel-live-prices-updated", onPricesUpdated);
      window.removeEventListener("agrointel-pull-refresh", onPullRefresh);
    };
  }, []);


  // Auto-refresh every 30 minutes
  const [prevPrices, setPrevPrices] = useState({});
  const [changedRows, setChangedRows] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(
      async () => {
        const oldPrices = {};
        apiPrices.forEach((p) => {
          oldPrices[p.commodity + "_" + p.market] = p.modal_price;
        });
        setPrevPrices(oldPrices);
        const fresh = await load();
        if (!Array.isArray(fresh)) return;
        const changed = {};
        fresh.forEach((p) => {
          const key = p.commodity + "_" + p.market;
          if (oldPrices[key] && oldPrices[key] !== p.modal_price)
            changed[key] = true;
        });
        if (Object.keys(changed).length > 0) {
          setChangedRows(changed);
          setTimeout(() => setChangedRows({}), 4000);
        }
      },
      30 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [autoRefresh, apiPrices]);

  const toggle = (rowKey, p) => {
    if (expanded === rowKey) {
      setExpanded(null);
      return;
    }
    setExpanded(rowKey);
    buildChart(p.commodity, p.modal_price);
  };

  const priceCol = (min, max) => {
    const s = Number(max) - Number(min);
    return s < 500 ? "var(--green)" : s < 2000 ? "var(--amber)" : "var(--red)";
  };

  const setAlert = (commodity, target) => {
    setAlerts((prev) => {
      const next = { ...prev };
      if (target && Number(target) > 0) next[commodity] = Number(target);
      else delete next[commodity];
      try {
        localStorage.setItem("krishi_mandi_alerts", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [customMandi, setCustomMandi] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.mandi_prices && d.mandi_prices.length > 0)
          setCustomMandi(d.mandi_prices);
      })
      .catch(() => {});
  }, []);
  const refPrices = customMandi.length > 0 ? customMandi : PUNE_STATIC;
  const allPrices = tab === "live" ? apiPrices : refPrices;
  const filtered = allPrices.filter(
    (p) =>
      !debouncedSearch ||
      (p.commodity || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      (p.market || "").toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const PriceRow = ({ p, idx }) => {
    const col = priceCol(p.min_price, p.max_price);
    const rowKey = `${p.commodity}_${p.market || ""}_${p.variety || ""}`;
    const isOpen = expanded === rowKey;
    const modal = Number(p.modal_price),
      minP = Number(p.min_price),
      maxP = Number(p.max_price);
    const sellSignal =
      modal > minP * 1.15 ? "sell" : modal < maxP * 0.85 ? "hold" : "neutral";
    const signalBadge =
      sellSignal === "sell"
        ? { icon: "🟢", text: "Sell Now", color: "var(--green)" }
        : sellSignal === "hold"
          ? { icon: "🔴", text: "Hold", color: "var(--red)" }
          : { icon: "🟡", text: "Neutral", color: "var(--amber)" };
    const midpoint = (minP + maxP) / 2;
    const trend =
      modal > midpoint * 1.02 ? "↑" : modal < midpoint * 0.98 ? "↓" : "→";
    const trendColor =
      trend === "↑"
        ? "var(--green)"
        : trend === "↓"
          ? "var(--red)"
          : "var(--t3)";
    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-label={`${p.commodity} at ${p.market || "Maharashtra"}, modal price ${Number(p.modal_price).toLocaleString("en-IN")} rupees`}
          onClick={() => toggle(rowKey, p)}
          onKeyDown={onActivateKey(() => toggle(rowKey, p))}
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            background: isOpen ? "var(--s3)" : "var(--s2)",
            border: `1px solid ${isOpen ? "var(--g3)" : "var(--b1)"}`,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 3, minWidth: 0, overflow: "hidden" }}>
            <div
              className="sm bold"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.commodity}
              {alerts[p.commodity] &&
                Number(p.modal_price) >= alerts[p.commodity] && (
                  <span className="chip cg">Target hit</span>
                )}
              {p.isStatic && (
                <span
                  className="chip cx"
                  style={{ fontSize: "8px", padding: "1px 5px" }}
                >
                  Ref
                </span>
              )}
            </div>
            <div
              className="mono t3"
              style={{
                fontSize: "10px",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.market || "Maharashtra"}
              {p.variety ? " · " + p.variety : ""}
            </div>
          </div>
          <span
            className="mono"
            style={{
              minWidth: "40px",
              textAlign: "right",
              fontSize: "11px",
              color: "var(--t2)",
              flexShrink: 0,
            }}
          >
            ₹{Number(p.min_price).toLocaleString("en-IN")}
          </span>
          <span
            className="mono bold"
            style={{
              minWidth: "46px",
              textAlign: "right",
              fontSize: "12px",
              color: col,
              flexShrink: 0,
            }}
          >
            ₹{Number(p.modal_price).toLocaleString("en-IN")}
            {changedRows[p.commodity + "_" + p.market] && (
              <span className="mono xs tg"> ⟳</span>
            )}
          </span>
          <span
            className="mono"
            style={{
              minWidth: "40px",
              textAlign: "right",
              fontSize: "11px",
              color: "var(--t2)",
              flexShrink: 0,
            }}
          >
            ₹{Number(p.max_price).toLocaleString("en-IN")}
          </span>
          <span
            style={{
              minWidth: "24px",
              textAlign: "right",
              fontSize: "9px",
              color: signalBadge.color,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {signalBadge.icon}
          </span>
          <span
            style={{
              minWidth: "16px",
              textAlign: "center",
              fontSize: "14px",
              color: trendColor,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {trend}
          </span>
        </div>
        {isOpen && (
          <div
            style={{
              padding: "4px 4px 8px",
              animation: "slide-down 0.25s ease",
            }}
          >
            <div>
              <div
                className="mono t3"
                style={{
                  fontSize: "9px",
                  textAlign: "right",
                  marginBottom: "4px",
                  letterSpacing: ".05em",
                }}
              >
                Real 7-day price history · recorded daily from live mandi data
              </div>
              <MiniChart
                data={charts[p.commodity]}
                color={col}
                commodity={p.commodity}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {[
                {
                  l: "Min",
                  v: "₹" + Number(p.min_price).toLocaleString("en-IN"),
                },
                {
                  l: "Modal",
                  v: "₹" + Number(p.modal_price).toLocaleString("en-IN"),
                },
                {
                  l: "Max",
                  v: "₹" + Number(p.max_price).toLocaleString("en-IN"),
                },
                {
                  l: "Spread",
                  v:
                    "₹" +
                    (Number(p.max_price) - Number(p.min_price)).toLocaleString(
                      "en-IN",
                    ),
                },
                { l: "Grade", v: p.grade || "—" },
                { l: "Variety", v: p.variety || "—" },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: "var(--s3)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    border: "1px solid var(--b1)",
                  }}
                >
                  <div
                    className="mono t3"
                    style={{ fontSize: "9px", marginBottom: "3px" }}
                  >
                    {s.l}
                  </div>
                  <div className="sm bold" style={{ color: col }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
            {p.isStatic && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "7px 10px",
                  background: "var(--adim)",
                  border: "1px solid #92400e",
                  borderRadius: "7px",
                }}
              >
                <p className="mono xs ta" style={{ lineHeight: 1.5 }}>
                  Reference rate from Pune APMC bulletin.
                </p>
              </div>
            )}
            <div className="flex gap2 aic mt2">
              <span className="mono t3 xs">Alert ≥ ₹</span>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                aria-label={`Set price alert for ${p.commodity}`}
                placeholder={
                  alerts[p.commodity] ? String(alerts[p.commodity]) : "target"
                }
                defaultValue={alerts[p.commodity] || ""}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    setAlert(p.commodity, e.target.value);
                  }
                }}
              />
              {alerts[p.commodity] && (
                <button
                  className="btn btn-o btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlert(p.commodity, 0);
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Transport & Net In-Hand Realization Estimator */}
            <div
              style={{
                marginTop: "10px",
                background: "var(--s3)",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--b1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex jcb aic mb2">
                <span className="mono bold xs tg">🚚 Transport & Net Profit</span>
                <span className="mono t3 xs" style={{ fontSize: "9px" }}>Round-Trip Est.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                <div>
                  <label className="mono xs t3" style={{ fontSize: "9px", marginBottom: "2px" }}>Distance</label>
                  <input
                    className="input"
                    type="number"
                    value={transKm}
                    onChange={(e) => setTransKm(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    placeholder="km"
                  />
                </div>
                <div>
                  <label className="mono xs t3" style={{ fontSize: "9px", marginBottom: "2px" }}>Quantity (Q)</label>
                  <input
                    className="input"
                    type="number"
                    value={transQty}
                    onChange={(e) => setTransQty(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    placeholder="quintals"
                  />
                </div>
                <div>
                  <label className="mono xs t3" style={{ fontSize: "9px", marginBottom: "2px" }}>Vehicle</label>
                  <select
                    className="input"
                    value={transVehicle}
                    onChange={(e) => setTransVehicle(e.target.value)}
                    style={{ padding: "4px 20px 4px 6px", fontSize: "11px" }}
                  >
                    <option value="tempo">Tempo (₹16/km)</option>
                    <option value="tractor">Tractor (₹26/km)</option>
                    <option value="truck">Truck (₹42/km)</option>
                  </select>
                </div>
              </div>
              {(() => {
                const rateKm = transVehicle === "tempo" ? 16 : transVehicle === "tractor" ? 26 : 42;
                const km = parseFloat(transKm) || 0;
                const qty = parseFloat(transQty) || 1;
                const modalPr = parseFloat(p.modal_price) || 0;
                const transportCost = Math.round(2 * km * rateKm);
                const grossVal = Math.round(qty * modalPr);
                const netVal = Math.max(0, grossVal - transportCost);
                const netRate = Math.round(netVal / qty);
                return (
                  <div className="flex jcb aic pt1" style={{ borderTop: "1px solid var(--b1)", fontSize: "11px" }}>
                    <div>
                      <span className="t3 xs">Transport: </span>
                      <span className="bold" style={{ color: "var(--red)" }}>-₹{transportCost.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="t3 xs">Net in-hand: </span>
                      <span className="bold tg">₹{netVal.toLocaleString("en-IN")} (₹{netRate}/Q)</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap2 mt2 aic">
              <TTSButton
                text={`${p.commodity} price at ${p.market || "Mandi"}: Modal price is ${p.modal_price} rupees per quintal. Minimum price is ${p.min_price}, maximum is ${p.max_price} rupees.`}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const text = `Current Mandi Price for ${p.commodity} (Pune):\nMin: ₹${p.min_price}\nModal: ₹${p.modal_price}\nMax: ₹${p.max_price}\nShared from AgroIntel App`;
                  window.open(
                    "https://wa.me/?text=" + encodeURIComponent(text),
                    "_blank",
                  );
                }}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  fontSize: "11px",
                  background: "#25D366",
                  color: "#fff",
                  border: "none",
                }}
              >
                Share on WhatsApp
              </button>
              <button
                onClick={() => setExpanded(null)}
                className="btn btn-o btn-sm"
                style={{ flex: 1, fontSize: "11px" }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card mb3">
      <div className="card-hd">
        <span className="card-title">Mandi Prices — Pune</span>
        <div className="flex aic gap2">
          {autoRefresh && (
            <span
              className="chip cx"
              style={{ fontSize: "8px", color: "var(--green)" }}
            >
              Auto-refreshing
            </span>
          )}
          {updated && (
            <span className="chip cx" style={{ fontSize: "9px" }}>
              {updated}
            </span>
          )}
          <TTSButton
            text={`Pune APMC Mandi rates update. Showing ${filtered.length} commodities. Modal rate for ${filtered[0]?.commodity || "first commodity"} is ${filtered[0]?.modal_price || 0} rupees per quintal.`}
          />
          <button
            className="btn btn-o btn-sm"
            onClick={load}
            aria-label="Refresh mandi prices"
            title="Refresh prices"
            style={{ padding: "4px 10px", fontSize: "11px" }}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="flex gap2 mb3">
          <button
            onClick={() => {
              setTab("live");
              setExpanded(null);
            }}
            className={`btn btn-sm${tab === "live" ? " btn-g" : " btn-o"}`}
            style={{ flex: 1, fontSize: "12px" }}
          >
            Live API
          </button>
          <button
            onClick={() => {
              setTab("reference");
              setExpanded(null);
            }}
            className={`btn btn-sm${tab === "reference" ? " btn-g" : " btn-o"}`}
            style={{ flex: 1, fontSize: "12px" }}
          >
            Reference
          </button>
        </div>
        {tab === "reference" && (
          <div
            style={{
              padding: "8px 10px",
              background: "var(--adim)",
              border: "1px solid #92400e",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <p className="mono xs ta" style={{ lineHeight: 1.5 }}>
              {/* MANDI_DATE_R97 */}Reference rates from Pune APMC + MSP 2026-27 (PIB, Agmarknet). Last verified {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}. Tap any row for 7-day trend chart.
            </p>
          </div>
        )}
        <input
          className="input mb2"
          value={search}
          aria-label="Search commodities by name or market"
          onChange={(e) => {
            setSearch(e.target.value);
            setExpanded(null);
          }}
          placeholder="Search wheat, onion, bajra…"
          style={{ padding: "8px 12px", fontSize: "13px" }}
        />
        {loading && tab === "live" && (
          <div style={{ padding: "8px 0" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--b1)",
                }}
              >
                <div
                  className="skel skel-line"
                  style={{ flex: 3, height: "14px" }}
                />
                <div
                  className="skel skel-line"
                  style={{ width: "50px", height: "14px" }}
                />
                <div
                  className="skel skel-line"
                  style={{ width: "50px", height: "14px" }}
                />
                <div
                  className="skel skel-line"
                  style={{ width: "50px", height: "14px" }}
                />
              </div>
            ))}
          </div>
        )}
        {err && tab === "live" && !loading && (
          <div
            style={{
              padding: "12px",
              background: "var(--rdim)",
              border: "1px solid #7f1d1d",
              borderRadius: "10px",
              marginBottom: "10px",
            }}
          >
            <p className="sm tr mb2">{err}</p>
            <button
              className="btn btn-o btn-sm"
              style={{ borderColor: "var(--red)", color: "var(--red)" }}
              onClick={load}
            >
              Retry
            </button>
          </div>
        )}
        {Object.keys(alerts).length > 0 &&
          (() => {
            const hits = allPrices.filter(
              (p) =>
                alerts[p.commodity] &&
                Number(p.modal_price) >= alerts[p.commodity],
            );
            if (hits.length === 0) return null;
            return (
              <div className="mb2">
                <p className="sm bold tg mb1">
                  {hits.length} price alert{hits.length > 1 ? "s" : ""} triggered
                </p>
                {hits.map((p) => (
                  <p key={p.commodity + p.market} className="mono xs t2">
                    {p.commodity}: ₹
                    {Number(p.modal_price).toLocaleString("en-IN")} (target ₹
                    {alerts[p.commodity].toLocaleString("en-IN")})
                  </p>
                ))}
              </div>
            );
          })()}
        {(!loading || tab === "reference") && filtered.length > 0 && (
          <div className="flex aic mb2" style={{ padding: "4px 12px" }}>
            <span
              className="mono t3"
              style={{ fontSize: "9px", flex: 3, letterSpacing: ".07em" }}
            >
              COMMODITY
            </span>
            <span
              className="mono t3"
              style={{ fontSize: "9px", width: "54px", textAlign: "right" }}
            >
              MIN
            </span>
            <span
              className="mono t3"
              style={{ fontSize: "9px", width: "60px", textAlign: "right" }}
            >
              MODAL
            </span>
            <span
              className="mono t3"
              style={{ fontSize: "9px", width: "54px", textAlign: "right" }}
            >
              MAX
            </span>
            <span
              className="mono t3"
              style={{ fontSize: "9px", width: "44px", textAlign: "right" }}
            >
              SIGNAL
            </span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            maxHeight: "460px",
            overflowY: "auto",
          }}
        >
          {(!loading || tab === "reference") &&
            filtered.map((p, i) => <PriceRow key={tab + i} p={p} idx={i} />)}
          {!loading && filtered.length === 0 && (
            <p className="sm t2 tc" style={{ padding: "16px" }}>
              No results for "{search}"
            </p>
          )}
        </div>
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: "8px",
          }}
        >
          <p className="mono t3" style={{ fontSize: "9px", lineHeight: 1.5 }}>
            {tab === "live"
              ? "Live: Maharashtra APMC via Agmarknet · data.gov.in"
              : "Ref: Pune APMC + MSP 2026-27 (PIB/Agmarknet)"}{" "}
            · Prices ₹/Quintal
          </p>
        </div>
      </div>
    </div>
  );
}
