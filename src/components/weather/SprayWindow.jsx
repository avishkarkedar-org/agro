// SPRAY_WINDOW_R104
// Extracted from Weather.jsx. The old version encoded safety mainly in red vs
// green and printed a bare "Rain" / "Wind" fragment built by string
// concatenation that produced a stray space when only one applied.

import { surfacePanelStyle, eyebrowStyle, insetStyle, captionStyle } from "./panel";
import { dayShort } from "./weatherMaps";

const RAIN_LIMIT = 1; // mm
const WIND_LIMIT = 15; // km/h

export default function SprayWindow({ daily, lang }) {
  if (!daily || !daily.time) return null;

  const days = daily.time.slice(0, 3);

  return (
    <div style={surfacePanelStyle()}>
      <div style={eyebrowStyle("accent")}>Spray window - next 3 days</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {days.map((d, i) => {
          const rain = Number(daily.precipitation_sum?.[i]) || 0;
          const wind = Number(daily.wind_speed_10m_max?.[i]) || 0;
          const rainOk = rain < RAIN_LIMIT;
          const windOk = wind < WIND_LIMIT;
          const safe = rainOk && windOk;

          let reason;
          if (safe) reason = "Rain and wind both low";
          else if (!rainOk && !windOk)
            reason = rain.toFixed(1) + "mm rain, wind " + Math.round(wind) + "km/h";
          else if (!rainOk) reason = rain.toFixed(1) + "mm rain expected";
          else reason = "Wind " + Math.round(wind) + "km/h";

          return (
            <div
              key={d}
              style={insetStyle(safe ? "accent" : "danger", {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              })}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, minWidth: "48px" }}>
                {i === 0 ? "Today" : dayShort(d, lang)}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: safe
                    ? "var(--ds-accent, #34d399)"
                    : "var(--ds-danger, #fb7185)",
                }}
              >
                {safe ? "Safe to spray" : "Do not spray"}
              </span>
              <span style={{ ...captionStyle, flex: "1 1 100%" }}>{reason}</span>
            </div>
          );
        })}
      </div>

      <p style={{ ...captionStyle, marginTop: "8px" }}>
        {"Safe means under " +
          RAIN_LIMIT +
          "mm forecast rain and under " +
          WIND_LIMIT +
          "km/h maximum wind. Always check the label on your product too."}
      </p>
    </div>
  );
}
