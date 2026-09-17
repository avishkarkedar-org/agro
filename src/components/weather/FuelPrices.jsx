// FUEL_PRICES_R104
// Extracted from Weather.jsx. Three honesty fixes:
//   - `fuel?.diesel || "--"` treated a legitimate 0 as missing, and could not
//     tell "still loading" apart from "unavailable"
//   - the caption printed "IOC Maharashtra" for ANY source that was not
//     explicitly reference/static, including an unknown or failed one
//   - reference rates are now labelled as not live, because the backend serves
//     documented dummy fallbacks when scraping fails

import { surfacePanelStyle, eyebrowStyle, captionStyle, RADIUS } from "./panel";

const RUPEE = "\u20B9";
const DASH = "\u2014";

function Price({ label, value, color }) {
  const n = Number(value);
  const has = value !== null && value !== undefined && value !== "" && Number.isFinite(n);
  return (
    <div
      className="flex aic gap1"
      style={{
        background: "var(--ds-surface, #121815)",
        border: "1px solid var(--ds-line, rgba(255,255,255,0.08))",
        borderRadius: RADIUS.sm,
        padding: "5px 9px",
      }}
    >
      <span style={{ fontSize: "11.5px", color: "var(--ds-text-2, rgba(238,242,239,0.74))" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "var(--mono)",
          fontVariantNumeric: "tabular-nums",
          color: has ? color : "var(--ds-text-3, rgba(238,242,239,0.56))",
        }}
      >
        {has ? RUPEE + n.toFixed(2) : DASH}
      </span>
    </div>
  );
}

export default function FuelPrices({ fuel, loading }) {
  const source = fuel?.source;
  const isLive = source === "live";
  const isReference = source === "reference" || source === "static";

  let provenance;
  if (loading) provenance = "Loading current rates";
  else if (!fuel) provenance = "Rates unavailable right now";
  else if (isLive) provenance = "Live rate" + (fuel.updated ? ", updated " + fuel.updated : "");
  else if (isReference)
    provenance = "Reference rate, not a live price - treat as approximate";
  else provenance = "Source not confirmed - treat as approximate";

  return (
    <div style={surfacePanelStyle()}>
      <div className="flex jcb aic" style={{ marginBottom: "8px" }}>
        <div style={eyebrowStyle("neutral", { marginBottom: 0 })}>
          {"Fuel prices" + (fuel?.city ? " - " + fuel.city : "")}
        </div>
        {isLive && (
          <span className="chip cg" style={{ fontSize: "11px" }}>
            Live
          </span>
        )}
      </div>

      <div className="flex gap3 wrap">
        <Price
          label="Diesel"
          value={fuel?.diesel}
          color="var(--ds-accent, #34d399)"
        />
        <Price
          label="Petrol"
          value={fuel?.petrol}
          color="var(--ds-info, #60a5fa)"
        />
      </div>

      <p style={{ ...captionStyle, marginTop: "6px" }}>{provenance}</p>
    </div>
  );
}
