// CROP_HEALTH_R104
// The previous panel rendered a precise 0-100 dial from:
//   min(100, rainfall7day*2 + humidity/2 + (30 - |temp-25|))
// That formula is not grounded in anything - 50mm of weekly rain alone pins it
// at 100, and a monsoon week always reads "Healthy" regardless of temperature.
// Showing an exact number implied a measurement the app does not have.
//
// This version keeps the useful part (a coarse at-a-glance reading) and drops
// the false precision: three bands, the three inputs named, and an explicit
// statement of what it cannot see (audit item 23).

import { surfacePanelStyle, eyebrowStyle, captionStyle } from "./panel";

const BANDS = {
  stressed: {
    label: "Likely stressed",
    color: "var(--ds-danger, #fb7185)",
    advice:
      "Conditions are hard on most crops right now. Check irrigation and look for wilting or leaf scorch.",
    fill: 1,
  },
  mixed: {
    label: "Mixed",
    color: "var(--ds-warn, #fbbf24)",
    advice:
      "Nothing extreme, but worth watching. Keep to your normal irrigation schedule and scout for pests.",
    fill: 2,
  },
  favourable: {
    label: "Favourable",
    color: "var(--ds-accent, #34d399)",
    advice:
      "Temperature, humidity and recent rain are all in a comfortable range for most crops.",
    fill: 3,
  },
};

// Deliberately simple and explainable: count how many of the three signals sit
// outside a comfortable range.
function assess(temp, humidity, rain7) {
  let bad = 0;
  const notes = [];

  if (temp > 38) {
    bad++;
    notes.push("heat above 38C");
  } else if (temp < 10) {
    bad++;
    notes.push("cold below 10C");
  }

  if (humidity > 85) {
    bad++;
    notes.push("humidity above 85%, disease risk");
  } else if (humidity < 25) {
    bad++;
    notes.push("very dry air");
  }

  if (rain7 < 5) {
    bad++;
    notes.push("under 5mm rain in 7 days");
  } else if (rain7 > 150) {
    bad++;
    notes.push("over 150mm rain in 7 days, waterlogging risk");
  }

  const key = bad >= 2 ? "stressed" : bad === 1 ? "mixed" : "favourable";
  return { key, notes };
}

export default function CropHealthIndex({ current, daily }) {
  if (!current || !daily || !daily.precipitation_sum) return null;

  const temp = Number(current.temperature_2m);
  const humidity = Number(current.relative_humidity_2m);
  const rain7 = daily.precipitation_sum
    .slice(0, 7)
    .reduce((a, b) => a + (Number(b) || 0), 0);

  if (!Number.isFinite(temp) || !Number.isFinite(humidity)) return null;

  const { key, notes } = assess(temp, humidity, rain7);
  const band = BANDS[key];

  return (
    <div style={surfacePanelStyle()}>
      <div style={eyebrowStyle("accent")}>Growing conditions</div>

      <div className="flex aic gap3">
        {/* Three segments, not a percentage - the data does not support one. */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}
          role="img"
          aria-label={"Growing conditions: " + band.label}
        >
          {[3, 2, 1].map((level) => (
            <span
              key={level}
              style={{
                display: "block",
                width: "26px",
                height: "9px",
                borderRadius: "3px",
                background:
                  level <= band.fill
                    ? band.color
                    : "var(--ds-surface-3, #1e2823)",
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: band.color,
              marginBottom: "4px",
            }}
          >
            {band.label}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              lineHeight: 1.5,
              color: "var(--ds-text-2, rgba(238,242,239,0.74))",
            }}
          >
            {band.advice}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <p style={{ ...captionStyle, marginTop: "8px" }}>
          {"Flagged: " + notes.join("; ") + "."}
        </p>
      )}

      <p style={{ ...captionStyle, marginTop: "8px" }}>
        {"Based only on temperature (" +
          Math.round(temp) +
          "C), humidity (" +
          Math.round(humidity) +
          "%) and rain over 7 days (" +
          rain7.toFixed(0) +
          "mm). It does not know your crop, soil, sowing date or pest pressure."}
      </p>
    </div>
  );
}
