import { useState, useEffect, useCallback, memo } from "react";
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
import { setDeviceMandiAlert, clearDeviceMandiAlert } from "../utils/onesignal";

function MiniChart({ data, color, commodity }) {
  if (!data || data.length < 2) {
    return (
      <div
        className="tc"
        style={{
          padding: "16px 12px",
          background: "var(--s3)",
          borderRadius: "10px",
          marginTop: "8px",
          border: "1px dashed var(--b2)",
        }}
      >
        <p className="mono t2 xs bold">📊 Real 7-Day Trend</p>
        <p className="mono t3 xs mt1" style={{ fontSize: "10px", lineHeight: 1.4 }}>
          Live APMC rates are recorded daily in Supabase.
          <br />
          Historical curve displays once 2+ daily arrivals are logged for {commodity}.
        </p>
      </div>
    );
  }

  const vals = data.map((d) => d.price);
  const mn = Math.min(...vals),
    mx = Math.max(...vals);
  const weekChange = (
    ((vals[vals.length - 1] - vals[0]) / (vals[0] || 1)) *
    100
  ).toFixed(1);
  const isUp = Number(weekChange) >= 0;

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
          LIVE 7-DAY APMC TREND
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
        <ResponsiveContainer width="100%" height={100} minWidth={0} minHeight={100} debounce={50}>
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

const priceCol = (min, max) => {
  const s = Number(max) - Number(min);
  return s < 500 ? "var(--green)" : s < 2000 ? "var(--amber)" : "var(--red)";
};

// Extracted outside MandiPrices to avoid component re-instantiation on every parent render
const PriceRow = memo(function PriceRow({
  p,
  isOpen,
  onToggle,
  alertVal,
  onSetAlert,
  chartData,
  isChanged,
  transKm,
  setTransKm,
  transVehicle,
  setTransVehicle,
  transQty,
  setTransQty,
}) {
  const [targetInput, setTargetInput] = useState(alertVal ? String(alertVal) : "");

  useEffect(() => {
    setTargetInput(alertVal ? String(alertVal) : "");
  }, [alertVal]);

  const col = priceCol(p.min_price, p.max_price);
  const rowKey = `${p.commodity}_${p.market || ""}_${p.variety || ""}`;
  const modal = Number(p.modal_price) || 0,
    minP = Number(p.min_price) || 0,
    maxP = Number(p.max_price) || 0;
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
        onClick={() => onToggle(rowKey, p)}
        onKeyDown={onActivateKey(() => onToggle(rowKey, p))}
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
            {alertVal && Number(p.modal_price) >= alertVal && (
              <span className="chip cg">Target hit</span>
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
          {isChanged && <span className="mono xs tg"> ⟳</span>}
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
            <MiniChart
              data={chartData}
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
              { l: "Grade", v: p.grade || "FAQ" },
              { l: "Variety", v: p.variety || "Local" },
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

          <div className="flex gap2 aic mt2" onClick={(e) => e.stopPropagation()}>
            <span className="mono t3 xs" style={{ whiteSpace: "nowrap" }}>Target Alert ≥ ₹</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              aria-label={`Set price alert for ${p.commodity}`}
              placeholder="e.g. 3000"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onSetAlert(p.commodity, targetInput);
                }
              }}
              style={{ padding: "6px 10px", fontSize: "12px", height: "34px", maxWidth: "120px" }}
            />
            <button
              type="button"
              className="btn btn-g btn-sm"
              style={{ padding: "6px 12px", fontSize: "12px", height: "34px" }}
              onClick={(e) => {
                e.stopPropagation();
                onSetAlert(p.commodity, targetInput);
              }}
            >
              Set
            </button>
            {alertVal && (
              <button
                type="button"
                className="btn btn-o btn-sm"
                style={{ padding: "6px 10px", fontSize: "12px", height: "34px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetInput("");
                  onSetAlert(p.commodity, 0);
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
                const text = `Live Mandi Rate for ${p.commodity} (${p.market || "Maharashtra"}):\nMin: ₹${p.min_price}\nModal: ₹${p.modal_price}\nMax: ₹${p.max_price}\nRecorded via AgroIntel App`;
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
              onClick={() => onToggle(null)}
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
});

export default function MandiPrices() {
  const [apiPrices, setApiPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [updated, setUpdated] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [charts, setCharts] = useState({});
  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("krishi_mandi_alerts") || "{}");
    } catch {
      return {};
    }
  });
  const [transKm, setTransKm] = useState("25");
  const [transVehicle, setTransVehicle] = useState("tempo");
  const [transQty, setTransQty] = useState("25");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/mandi?state=Maharashtra&limit=500`);
      if (!r.ok) {
        throw new Error(`Live API unavailable (${r.status}). Retrying...`);
      }
      const d = await r.json();
      const rec = d.records || [];
      if (rec.length === 0) {
        throw new Error("No live APMC records returned today. Pull to refresh.");
      }
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
    } finally {
      setLoading(false);
    }
  };

  const buildChart = useCallback((commodity) => {
    if (!commodity) return;
    if (charts[commodity]) return;

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
  }, [charts]);

  useEffect(() => {
    load();
    const onPricesUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setApiPrices(e.detail);
      } else {
        load();
      }
    };
    const onPullRefresh = () => load();
    window.addEventListener("agrointel-live-prices-updated", onPricesUpdated);
    window.addEventListener("agrointel-pull-refresh", onPullRefresh);
    return () => {
      window.removeEventListener("agrointel-live-prices-updated", onPricesUpdated);
      window.removeEventListener("agrointel-pull-refresh", onPullRefresh);
    };
  }, []);

  // Auto-refresh every 30 minutes
  const [changedRows, setChangedRows] = useState({});
  const [autoRefresh] = useState(true);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(
      async () => {
        const oldPrices = {};
        apiPrices.forEach((p) => {
          oldPrices[p.commodity + "_" + p.market] = p.modal_price;
        });
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

  const toggle = useCallback((rowKey, p) => {
    if (rowKey === null || expanded === rowKey) {
      setExpanded(null);
      return;
    }
    setExpanded(rowKey);
    if (p) {
      buildChart(p.commodity);
    }
  }, [expanded, buildChart]);

  const setAlert = useCallback((commodity, target) => {
    const num = Number(target);
    setAlerts((prev) => {
      const next = { ...prev };
      if (target && num > 0) {
        next[commodity] = num;
        setDeviceMandiAlert(commodity, num);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `🔔 Alert set for ${commodity} ≥ ₹${num.toLocaleString("en-IN")}/q`,
          }),
        );
      } else {
        delete next[commodity];
        clearDeviceMandiAlert(commodity);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `Alert cleared for ${commodity}`,
          }),
        );
      }
      try {
        localStorage.setItem("krishi_mandi_alerts", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const filtered = apiPrices.filter(
    (p) =>
      !debouncedSearch ||
      (p.commodity || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      (p.market || "").toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="card mb3">
      <div className="card-hd">
        <span className="card-title">Live Mandi Prices — Maharashtra APMC</span>
        <div className="flex aic gap2">
          {autoRefresh && (
            <span
              className="chip cx"
              style={{ fontSize: "8px", color: "var(--green)" }}
            >
              Live Sync
            </span>
          )}
          {updated && (
            <span className="chip cx" style={{ fontSize: "9px" }}>
              {updated}
            </span>
          )}
          <TTSButton
            text={`Live APMC Mandi rates update. Showing ${filtered.length} commodities. Modal rate for ${filtered[0]?.commodity || "first crop"} is ${filtered[0]?.modal_price || 0} rupees per quintal.`}
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
        <input
          className="input mb2"
          value={search}
          aria-label="Search commodities by name or market"
          onChange={(e) => {
            setSearch(e.target.value);
            setExpanded(null);
          }}
          placeholder="Search wheat, onion, soybean, cotton…"
          style={{ padding: "8px 12px", fontSize: "13px" }}
        />
        {loading && (
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
        {err && !loading && (
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
              Retry Live Sync
            </button>
          </div>
        )}
        {Object.keys(alerts).length > 0 &&
          (() => {
            const hits = apiPrices.filter(
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
        {!loading && filtered.length > 0 && (
          <div className="flex aic mb2" style={{ padding: "4px 12px" }}>
            <span
              className="mono t3"
              style={{ fontSize: "9px", flex: 3, letterSpacing: ".07em" }}
            >
              COMMODITY / APMC
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
            maxHeight: "480px",
            overflowY: "auto",
          }}
        >
          {!loading &&
            filtered.map((p, i) => {
              const rowKey = `${p.commodity}_${p.market || ""}_${p.variety || ""}`;
              return (
                <PriceRow
                  key={rowKey + "_" + i}
                  p={p}
                  isOpen={expanded === rowKey}
                  onToggle={toggle}
                  alertVal={alerts[p.commodity]}
                  onSetAlert={setAlert}
                  chartData={charts[p.commodity]}
                  isChanged={Boolean(changedRows[p.commodity + "_" + p.market])}
                  transKm={transKm}
                  setTransKm={setTransKm}
                  transVehicle={transVehicle}
                  setTransVehicle={setTransVehicle}
                  transQty={transQty}
                  setTransQty={setTransQty}
                />
              );
            })}
          {!loading && filtered.length === 0 && !err && (
            <p className="sm t2 tc" style={{ padding: "20px" }}>
              {search ? `No live arrivals matching "${search}"` : "No APMC price data available at this moment."}
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
            Live: Official Maharashtra APMC arrivals via Agmarknet (data.gov.in) · Rates in ₹/Quintal
          </p>
        </div>
      </div>
    </div>
  );
}
