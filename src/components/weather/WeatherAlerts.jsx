// WEATHER_ALERTS_R104
// Frost and heatwave alerts. Three changes from the inline version in
// Weather.jsx:
//   - borders were hardcoded #1e3a5f / #7f1d1d and did not flip with the theme
//   - neither alert had a TTS button, so the two most urgent messages in the
//     app were the two a low-literacy user could not hear (audit item 18)
//   - role="alert" so assistive tech announces them
//
// NOTE: every symbol below is composed inside a JS expression. A \uXXXX escape
// placed directly in a JSX text node renders literally (KL#9).

import TTSButton from "../TTSButton";
import { panelStyle, eyebrowStyle } from "./panel";
import { dayFull } from "./weatherMaps";

const DASH = "\u2014";
const DEG = "\u00B0";

const bodyStyle = {
  fontSize: "12.5px",
  lineHeight: 1.55,
  marginTop: "6px",
  color: "var(--ds-text-2, rgba(238,242,239,0.74))",
};

export default function WeatherAlerts({ daily, lang }) {
  if (!daily || !daily.temperature_2m_min || !daily.temperature_2m_max)
    return null;

  const mins = daily.temperature_2m_min.slice(0, 3);
  const maxs = daily.temperature_2m_max.slice(0, 3);
  const frostDay = mins.findIndex((t) => Number(t) < 4);
  const heatDay = maxs.findIndex((t) => Number(t) > 42);

  const when = (i) => (i === 0 ? "today" : dayFull(daily.time[i], lang));

  if (frostDay >= 0) {
    const temp = Math.round(mins[frostDay]);
    const spoken =
      "Frost alert for " +
      when(frostDay) +
      ". Temperature dropping to " +
      temp +
      " degrees Celsius. Cover sensitive crops with mulch or plastic sheets. Irrigate the evening before, because wet soil holds heat.";
    return (
      <div style={panelStyle("info")} role="alert">
        <div className="flex jcb aic">
          <div style={eyebrowStyle("info", { marginBottom: 0 })}>
            {"Frost alert " + DASH + " " + when(frostDay)}
          </div>
          <TTSButton text={spoken} label="Listen to frost alert" />
        </div>
        <p style={bodyStyle}>
          {"Temperature dropping to " +
            temp +
            DEG +
            "C. Cover sensitive crops with mulch or plastic sheets. Irrigate the evening before frost " +
            DASH +
            " wet soil retains heat."}
        </p>
      </div>
    );
  }

  if (heatDay >= 0) {
    const temp = Math.round(maxs[heatDay]);
    const spoken =
      "Heatwave alert for " +
      when(heatDay) +
      ". Temperature reaching " +
      temp +
      " degrees Celsius. Irrigate early morning. Use shade nets for vegetables. Avoid field work between 11 a.m. and 4 p.m.";
    return (
      <div style={panelStyle("danger")} role="alert">
        <div className="flex jcb aic">
          <div style={eyebrowStyle("danger", { marginBottom: 0 })}>
            {"Heatwave alert " + DASH + " " + when(heatDay)}
          </div>
          <TTSButton text={spoken} label="Listen to heatwave alert" />
        </div>
        <p style={bodyStyle}>
          {"Temperature reaching " +
            temp +
            DEG +
            "C. Irrigate early morning. Use shade nets for vegetables. Avoid field work 11am to 4pm."}
        </p>
      </div>
    );
  }

  return null;
}
