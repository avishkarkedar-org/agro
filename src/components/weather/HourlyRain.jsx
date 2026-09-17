// HOURLY_RAIN_R104
// The previous version rendered 24 bare divs whose only affordance was a
// title attribute: no text alternative, no keyboard target, and five evenly
// spaced axis captions under 24 bars that did not line up with them.
// It also animated height on every render with no reduced-motion escape.

import { surfacePanelStyle, eyebrowStyle, captionStyle } from "./panel";

const LABEL_HOURS = [0, 6, 12, 18];

function hourLabel(h) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? h + "am" : h - 12 + "pm";
}

export default function HourlyRain({ hours }) {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  if (hours.every((h) => !h)) return null;

  const peak = hours.reduce(
    (best, p, i) => (Number(p) > Number(hours[best]) ? i : best),
    0,
  );
  const peakVal = Math.round(Number(hours[peak]) || 0);

  // A single sentence carries the whole chart for anyone who cannot see it.
  const summary =
    "Highest chance of rain is " +
    peakVal +
    " percent around " +
    hourLabel(peak) +
    ".";

  return (
    <div style={surfacePanelStyle()}>
      <div style={eyebrowStyle("info")}>Hourly chance of rain</div>

      <p style={{ ...captionStyle, marginBottom: "10px" }}>{summary}</p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "2px",
          height: "44px",
        }}
        role="img"
        aria-label={
          "Bar chart of hourly rain probability. " + summary
        }
      >
        {hours.map((p, i) => {
          const v = Math.max(0, Math.min(100, Number(p) || 0));
          return (
            <div
              key={i}
              title={hourLabel(i) + " \u2014 " + Math.round(v) + "%"}
              style={{
                flex: 1,
                minWidth: 0,
                height: Math.max(v, 3) + "%",
                borderRadius: "2px 2px 0 0",
                background:
                  v > 60
                    ? "var(--ds-info, #60a5fa)"
                    : v > 30
                      ? "var(--ds-info-line, rgba(96,165,250,0.26))"
                      : "var(--ds-info-soft, rgba(96,165,250,0.12))",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        {LABEL_HOURS.map((h) => (
          <span key={h} style={{ ...captionStyle, fontSize: "11px" }}>
            {hourLabel(h)}
          </span>
        ))}
        <span style={{ ...captionStyle, fontSize: "11px" }}>11pm</span>
      </div>

      {/* Screen-reader table: the numbers, without the graphics. */}
      <table
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        <caption>Hourly rain probability</caption>
        <tbody>
          {hours.map((p, i) => (
            <tr key={i}>
              <th scope="row">{hourLabel(i)}</th>
              <td>{Math.round(Number(p) || 0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
