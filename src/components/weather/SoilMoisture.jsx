// SOIL_MOISTURE_R104
// Extracted from Weather.jsx. Border hexes (#7f1d1d, #1e3a5f) replaced with
// tokens, and the status no longer depends on colour alone (audit item 37).

import { surfacePanelStyle, eyebrowStyle, insetStyle, captionStyle } from "./panel";

const PCT = 0.5; // fraction treated as "full" on the bar

function band(v) {
  if (v < 0.15) return "dry";
  if (v > 0.35) return "wet";
  return "ok";
}

const BAND_TONE = { dry: "danger", wet: "info", ok: "accent" };
const BAND_COLOR = {
  dry: "var(--ds-danger, #fb7185)",
  wet: "var(--ds-info, #60a5fa)",
  ok: "var(--ds-accent, #34d399)",
};
// A glyph carries the reading for anyone who cannot separate the hues.
const BAND_MARK = { dry: "!", wet: "~", ok: "+" };
const BAND_TEXT = {
  dry: "Soil is dry - irrigate soon",
  wet: "Saturated - avoid irrigation",
  ok: "Good moisture level",
};

function Bar({ label, value }) {
  const b = band(value);
  const pct = Math.min(100, Math.max(0, (value * 100) / PCT));
  const shown = (value * 100).toFixed(1);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div className="flex jcb aic" style={{ marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "var(--ds-text-2, rgba(238,242,239,0.74))" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "var(--mono)",
            fontVariantNumeric: "tabular-nums",
            color: BAND_COLOR[b],
          }}
        >
          {shown + "%"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label + " soil moisture"}
        aria-valuenow={Number(shown)}
        aria-valuemin={0}
        aria-valuemax={50}
        aria-valuetext={shown + " percent, " + BAND_TEXT[b]}
        style={{
          height: "7px",
          borderRadius: "999px",
          background: "var(--ds-surface-3, #1e2823)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: pct + "%",
            height: "100%",
            borderRadius: "999px",
            background: BAND_COLOR[b],
          }}
        />
      </div>
    </div>
  );
}

export default function SoilMoisture({ soil }) {
  if (!soil) return null;
  const surface = Number(soil.surface) || 0;
  const deep = Number(soil.deep) || 0;
  const b = band(surface);

  return (
    <div style={surfacePanelStyle()}>
      <div style={eyebrowStyle("info")}>Soil moisture</div>

      <Bar label="Surface (0-7cm)" value={surface} />
      <Bar label="Deep (7-28cm)" value={deep} />

      <div style={insetStyle(BAND_TONE[b], { display: "flex", gap: "8px", alignItems: "center" })}>
        <span
          aria-hidden="true"
          style={{
            width: "18px",
            height: "18px",
            flexShrink: 0,
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            color: BAND_COLOR[b],
            border: "1px solid " + BAND_COLOR[b],
          }}
        >
          {BAND_MARK[b]}
        </span>
        <span style={{ fontSize: "12px", color: BAND_COLOR[b] }}>
          {BAND_TEXT[b]}
        </span>
      </div>

      <p style={{ ...captionStyle, marginTop: "8px" }}>
        Modelled from satellite and weather data, not measured in your field.
      </p>
    </div>
  );
}
