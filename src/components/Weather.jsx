// Weather.jsx - R104, updated R157
// Slimmed from ~1300 lines by extracting into ./weather/*. See the R104 commit
// message for the full list of audit items addressed here.
//
// Two rules this file now follows and previously broke:
//   1. It never invents a location AND PASSES IT OFF AS THE USER'S OWN.
//      No silent Pune fallback.
//   2. It never invents a reading. If the API fails, it says so.
//
// R157: the owner asked for a default location when access is refused, so a
// refusal (or a device with no geolocation API) now loads Ravet, Pune - but
// ONLY behind loadDefaultLocation(), which also sets usingDefault=true. The
// UI then shows a warning banner ("this is not your location") for as long
// as usingDefault stays true, and a GPS success or a city search immediately
// flips it back to false. This is deliberately different from the original
// R104 bug: that bug showed Pune weather with NOTHING telling the user it
// was not theirs. Do not set coords/city to DEFAULT_LOCATION anywhere
// without also calling setUsingDefault(true), or the honesty fix is gone.
//
// This component deliberately does NOT set id="sec-weather". FeatureGrid wraps
// every feature in <div id={f.id}>, and duplicating it there broke uniqueness
// (R104.2).
//
// Escapes appear only inside JS expressions (KL#9).

import { useState, useEffect, useCallback } from "react";
import { API } from "../context/SettingsContext";
import { safeGetLS } from "../utils/helpers";
import { useFocusTrap } from "../hooks/useFocusTrap";
import TTSButton from "./TTSButton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import LocationGate from "./weather/LocationGate";
import CitySearch from "./weather/CitySearch";
import PinIcon from "./weather/PinIcon";
import WeatherAlerts from "./weather/WeatherAlerts";
import HourlyRain from "./weather/HourlyRain";
import SoilMoisture from "./weather/SoilMoisture";
import CropHealthIndex from "./weather/CropHealthIndex";
import SprayWindow from "./weather/SprayWindow";
import {
  smartIcon,
  effectiveCode,
  condLabel,
  dayShort,
  dayFull,
  fmtTime,
} from "./weather/weatherMaps";
import {
  surfacePanelStyle,
  eyebrowStyle,
  captionStyle,
  panelStyle,
  RADIUS,
} from "./weather/panel";

const DEG = "\u00B0";
const ARROW = "\u2192";
const REFRESH_MS = 10 * 60 * 1000;

// R157: shown only when the user has not granted location and has not
// searched a city - see loadDefaultLocation and the usingDefault banner.
const DEFAULT_LOCATION = { lat: 18.6462, lon: 73.7524, cityLabel: "Ravet, Pune (default)" };

function currentLang() {
  const v = safeGetLS("krishi_scan_lang");
  return v === "hi" || v === "mr" ? v : "en";
}

const REPORT_OPTIONS = [
  "Raining here",
  "Sunny and hot",
  "Cloudy",
  "Strong wind",
  "Frost",
  "Hail",
];

function toast(msg) {
  window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));
}

// Token-styled placeholder. Was className="skel", a class I never confirmed
// exists (R104.2).
const skelStyle = (h) => ({
  height: h,
  borderRadius: RADIUS.sm,
  background: "var(--ds-surface-3, #1e2823)",
});

export default function Weather() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState(null);
  const [gps, setGps] = useState("idle");
  // R157: true only while the forecast shown is the Ravet, Pune default,
  // not a location the user granted or chose. Drives the warning banner.
  const [usingDefault, setUsingDefault] = useState(false);
  const [selDay, setSelDay] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [chartColor, setChartColor] = useState({
    max: "#fb7185",
    min: "#60a5fa",
  });

  const lang = currentLang();
  const reportRef = useFocusTrap(showReport, () => setShowReport(false));

  useEffect(() => {
    try {
      const cs = getComputedStyle(document.documentElement);
      const max = cs.getPropertyValue("--ds-danger").trim();
      const min = cs.getPropertyValue("--ds-info").trim();
      if (max || min)
        setChartColor({ max: max || "#fb7185", min: min || "#60a5fa" });
    } catch (e) {
      /* keep the fallbacks */
    }
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const load = useCallback(async (lat, lon) => {
    setLoading(true);
    setErr("");
    try {
      const base =
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&timezone=auto&forecast_days=15";
      const main =
        base +
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index,precipitation,is_day,cloud_cover" +
        "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset" +
        "&hourly=precipitation_probability";
      const soilUrl =
        base + "&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm";

      const [res, soilRes] = await Promise.all([
        fetch(main).catch(() => ({ ok: false })),
        fetch(soilUrl).catch(() => null),
      ]);

      let json;
      if (!res.ok) {
        // Fallback to best_match model if gfs_seamless is 503
        const fallbackUrl =
          "https://api.open-meteo.com/v1/forecast?latitude=" +
          lat +
          "&longitude=" +
          lon +
          "&timezone=auto&forecast_days=15" +
          "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index,precipitation,is_day,cloud_cover" +
          "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset" +
          "&hourly=precipitation_probability";
        const fbRes = await fetch(fallbackUrl);
        if (!fbRes.ok) throw new Error("Weather service returned " + fbRes.status);
        json = await fbRes.json();
      } else {
        json = await res.json();
      }

      if (soilRes && soilRes.ok) {
        try {
          const sj = await soilRes.json();
          const hour = new Date().getHours();
          json._soilMoisture = {
            surface: sj.hourly?.soil_moisture_0_to_7cm?.[hour],
            deep: sj.hourly?.soil_moisture_7_to_28cm?.[hour],
          };
        } catch (e) {
          /* soil is optional */
        }
      }

      setData(json);
      setSelDay(0);
      setUpdatedAt(new Date());

      // WEATHER_CACHE_R98 - short summary other features read.
      try {
        const c = json.current;
        if (c) {
          const code = Number(c.weathercode);
          const desc = code >= 61 ? "rainy" : code >= 3 ? "cloudy" : "clear";
          localStorage.setItem(
            "ks_weather_summary",
            JSON.stringify({
              summary:
                Math.round(c.temperature_2m) +
                "C, " +
                desc +
                ", humidity " +
                Math.round(c.relative_humidity_2m) +
                "%",
              ts: Date.now(),
            }),
          );
        }
      } catch (e) {
        /* localStorage may be unavailable */
      }
    } catch (e) {
      setData(null);
      setErr(e.message || "Could not load the forecast");
    } finally {
      setLoading(false);
    }
  }, []);

  // R157: the ONLY place DEFAULT_LOCATION is used. Always pairs the
  // coordinates with usingDefault(true) so the UI can say "this is not your
  // location" - see the file-header comment before changing this.
  const loadDefaultLocation = useCallback(() => {
    setUsingDefault(true);
    setCoords({ lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon });
    setCity(DEFAULT_LOCATION.cityLabel);
    load(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
  }, [load]);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps("unsupported");
      return;
    }
    setGps("asking");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGps("ok");
        setUsingDefault(false);
        setCoords({ lat: latitude, lon: longitude });
        setCity("Your location");
        load(latitude, longitude);
        try {
          const r = await fetch(
            "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
              latitude +
              "&longitude=" +
              longitude +
              "&localityLanguage=en",
          );
          if (r.ok) {
            const j = await r.json();
            const name =
              j.city || j.locality || j.principalSubdivision || "";
            if (name) {
              setCity(
                [name, j.principalSubdivision].filter(Boolean).join(", "),
              );
            }
          }
        } catch (e) {
          /* the forecast does not depend on the place name */
        }
      },
      () => {
        setGps("denied");
        loadDefaultLocation();
      },
      { timeout: 8000 },
    );
  }, [load, loadDefaultLocation]);

  // Ask once on mount. A refusal or an unsupported device now loads the
  // clearly labeled Ravet, Pune default (R157) instead of nothing.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps("unsupported");
      loadDefaultLocation();
      return;
    }
    requestLocation();
  }, [requestLocation, loadDefaultLocation]);

  const selectCity = useCallback(
    async (name) => {
      setLoading(true);
      setErr("");
      try {
        const r = await fetch(
          "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
            encodeURIComponent(name),
        );
        const j = await r.json();
        const hit = j.results && j.results[0];
        if (!hit) {
          setLoading(false);
          setErr('Could not find "' + name + '". Try a nearby larger town.');
          return;
        }
        setCoords({ lat: hit.latitude, lon: hit.longitude });
        setCity(
          [hit.name, hit.admin1, hit.country].filter(Boolean).join(", "),
        );
        setGps("ok");
        setUsingDefault(false);
        load(hit.latitude, hit.longitude);
      } catch (e) {
        setLoading(false);
        setErr("Could not look up that place. Check your connection.");
      }
    },
    [load],
  );

  // Auto-refresh: the card used to load once and sit there all day (item 11).
  useEffect(() => {
    if (!coords) return undefined;
    const tick = () => load(coords.lat, coords.lon);
    const id = setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    // PULL_TO_REFRESH_R200: re-fetch when user pulls down on the Weather tab
    const onPullRefresh = () => tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("agrointel-pull-refresh", onPullRefresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("agrointel-pull-refresh", onPullRefresh);
    };
  }, [coords, load]);


  const retry = () => {
    // Keeps the chosen location instead of snapping back to Pune (item 12).
    if (coords) load(coords.lat, coords.lon);
    else requestLocation();
  };

  const submitReport = useCallback((label) => {
    // This POSTs nowhere - there is no endpoint for it - so the copy no longer
    // claims it helps other farmers (audit item 22).
    try {
      const key = "ks_microclimate_reports";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.unshift({ label, city, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)));
    } catch (e) {
      /* ignore */
    }
    setShowReport(false);
    toast("Noted on this device: " + label);
  }, [city]);

  const current = data?.current;
  const daily = data?.daily;
  const needsLocation = !coords && !loading;

  const chartData =
    daily && daily.time
      ? daily.time.slice(0, 7).map((t, i) => ({
          day: dayShort(t, lang),
          max: Math.round(daily.temperature_2m_max[i]),
          min: Math.round(daily.temperature_2m_min[i]),
        }))
      : [];

  const hourly24 = data?.hourly?.precipitation_probability
    ? data.hourly.precipitation_probability.slice(0, 24)
    : [];

  const advisory = (() => {
    if (!current || !daily) return null;
    const rainToday = Number(daily.precipitation_sum?.[0]) || 0;
    const temp = Number(current.temperature_2m);
    const wind = Number(current.wind_speed_10m);
    const hum = Number(current.relative_humidity_2m);
    // Rain first: it changes today's plan more than any other signal (item 16).
    if (rainToday > 10)
      return {
        tone: "info",
        text:
          "Heavy rain expected today (" +
          rainToday.toFixed(0) +
          "mm). Postpone spraying and fertiliser application, and check field drainage.",
      };
    if (temp > 38)
      return {
        tone: "danger",
        text: "Extreme heat. Irrigate early morning or after sunset and avoid field work at midday.",
      };
    if (wind > 25)
      return {
        tone: "warn",
        text: "Strong wind. Do not spray - drift will waste product and can damage neighbouring crops.",
      };
    if (hum > 80)
      return {
        tone: "warn",
        text: "High humidity raises fungal disease risk. Scout for leaf spot and blight, and improve air flow where you can.",
      };
    return {
      tone: "accent",
      text: "Good conditions for most field work today.",
    };
  })();

  // R106.1: the control 6098671e promised but never passed in.
  const useLocationButton = (
    <button
      type="button"
      className="btn btn-o btn-sm"
      onClick={requestLocation}
      disabled={loading || gps === "asking"}
      title="Use my current location"
      aria-label="Use my current location"
      style={{
        minHeight: "44px",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PinIcon size={16} />
    </button>
  );

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">Live Weather</span>
        <div className="flex aic gap2">
          {city && (
            <span
              className="chip cx"
              style={{
                fontSize: "11px",
                maxWidth: "170px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={city}
            >
              {city}
            </span>
          )}
          {data && (
            <>
              <TTSButton
                text={
                  data.current
                    ? `Current weather for ${city || "your location"}: ${Math.round(data.current.temperature_2m)} degrees Celsius, ${condLabel(effectiveCode(data.current.weathercode))}, humidity ${Math.round(data.current.relative_humidity_2m)} percent.`
                    : "Weather forecast loaded."
                }
              />
              <button
                type="button"
                className="btn btn-o btn-sm"
                style={{ fontSize: "11px" }}
                onClick={() => setShowReport(true)}
              >
                Report
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🌦️ AgroIntel Weather Alert for ${city || "My Location"}:\n• Temperature: ${Math.round(data.current.temperature_2m)}°C (${condLabel(effectiveCode(data.current.weathercode))})\n• Humidity: ${Math.round(data.current.relative_humidity_2m)}%\n• Wind Speed: ${Math.round(data.current.wind_speed_10m || 0)} km/h\nShared via AgroIntel`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{
                  fontSize: "11px",
                  background: "#25D366",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "none",
                }}
                title="Share Weather on WhatsApp"
              >
                💬 Share
              </a>
            </>
          )}
        </div>
      </div>

      <div className="card-body">
        {/* Announce state changes to screen readers (audit item 30). */}
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          {loading
            ? "Loading forecast"
            : err
              ? "Forecast failed to load"
              : data
                ? "Forecast updated for " + (city || "your location")
                : ""}
        </div>

        {offline && (
          <div style={panelStyle("warn", { marginTop: 0 })}>
            <div style={{ fontSize: "12.5px" }}>
              You are offline. Any reading below was loaded earlier and may be
              out of date.
            </div>
          </div>
        )}

        {/* R157: visible only while showing the Ravet, Pune default so the
            user always knows this forecast is not their own location. */}
        {usingDefault && coords && !err && (
          <div style={panelStyle("warn", { marginTop: 0 })}>
            <div style={{ fontSize: "12.5px" }}>
              Location access was not given, so this shows the default
              forecast for Ravet, Pune - not your location. Tap the pin
              button below or search your city for an accurate forecast.
            </div>
          </div>
        )}

        {/* The location gate. This is what replaced the silent Pune default. */}
        {needsLocation && !err && (
          <LocationGate
            gps={gps}
            busy={gps === "asking"}
            onUseLocation={requestLocation}
            onSelectCity={selectCity}
          />
        )}

        {/* Once a place is chosen, keep search AND a way back to real GPS. */}
        {coords && (
          <div style={{ marginBottom: "12px" }}>
            <CitySearch
              onSelect={selectCity}
              disabled={loading}
              trailing={useLocationButton}
            />
          </div>
        )}

        {loading && (
          <div style={surfacePanelStyle({ marginTop: 0 })}>
            <div style={{ ...skelStyle("64px"), marginBottom: "8px" }} />
            <div style={skelStyle("90px")} />
          </div>
        )}

        {err && !loading && (
          <div style={panelStyle("danger", { marginTop: 0 })}>
            <div style={eyebrowStyle("danger")}>Could not load the forecast</div>
            <p style={{ ...captionStyle, marginBottom: "10px" }}>{err}</p>
            <button type="button" className="btn btn-o btn-sm" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {current && daily && !loading && (
          <>
            <div
              className="flex aic gap3"
              style={{ marginBottom: "14px", flexWrap: "wrap" }}
            >
              <span
                role="img"
                aria-label={condLabel(Number(current.weathercode), lang)}
                style={{ fontSize: "48px", lineHeight: 1 }}
              >
                {smartIcon(
                  Number(current.weathercode),
                  current.is_day,
                  current.precipitation,
                )}
              </span>
              <div>
                <div className="big-temp">
                  {Math.round(current.temperature_2m) + DEG + "C"}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--ds-text-2, rgba(238,242,239,0.74))",
                  }}
                >
                  {condLabel(Number(current.weathercode), lang) +
                    "  " +
                    ARROW +
                    "  feels like " +
                    Math.round(current.apparent_temperature) +
                    DEG +
                    "C"}
                </div>
              </div>
            </div>

            {advisory && (
              <div style={panelStyle(advisory.tone, { marginTop: 0 })}>
                <div className="flex jcb aic">
                  <div style={eyebrowStyle(advisory.tone, { marginBottom: 0 })}>
                    Today
                  </div>
                  <TTSButton text={advisory.text} label="Listen to today's advisory" />
                </div>
                <p
                  style={{
                    fontSize: "12.5px",
                    lineHeight: 1.55,
                    marginTop: "6px",
                    color: "var(--ds-text-2, rgba(238,242,239,0.74))",
                  }}
                >
                  {advisory.text}
                </p>
              </div>
            )}

            <WeatherAlerts daily={daily} lang={lang} />

            {/* 15-day strip. The chart below shows 7, so both are labelled. */}
            <div style={{ marginTop: "12px" }}>
              <div className="flex jcb aic" style={{ marginBottom: "6px" }}>
                <div style={eyebrowStyle("neutral", { marginBottom: 0 })}>
                  Next 15 days
                </div>
                <span style={captionStyle}>Scroll for more</span>
              </div>
              <div
                className="forecast-scroll"
                style={{ display: "flex", gap: "6px", overflowX: "auto" }}
              >
                {daily.time.map((t, i) => {
                  const code = effectiveCode(
                    Number(daily.weathercode[i]),
                    daily.precipitation_sum[i],
                    daily.temperature_2m_max[i],
                  );
                  const sel = i === selDay;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSelDay(i)}
                      aria-pressed={sel}
                      aria-label={
                        dayFull(t, lang) +
                        ", " +
                        condLabel(code, lang) +
                        ", high " +
                        Math.round(daily.temperature_2m_max[i]) +
                        ", low " +
                        Math.round(daily.temperature_2m_min[i])
                      }
                      style={{
                        flexShrink: 0,
                        width: "62px",
                        padding: "8px 4px",
                        borderRadius: RADIUS.sm,
                        cursor: "pointer",
                        textAlign: "center",
                        background: sel
                          ? "var(--ds-accent-soft, rgba(52,211,153,0.12))"
                          : "var(--ds-surface-2, #182019)",
                        border:
                          "1px solid " +
                          (sel
                            ? "var(--ds-accent-line, rgba(52,211,153,0.26))"
                            : "var(--ds-line, rgba(255,255,255,0.08))"),
                        color: "var(--ds-text, #eef2ef)",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 600 }}>
                        {i === 0 ? "Today" : dayShort(t, lang)}
                      </div>
                      <div style={{ fontSize: "20px", lineHeight: 1.3 }}>
                        {smartIcon(code, 1, daily.precipitation_sum[i])}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {Math.round(daily.temperature_2m_max[i]) +
                          "/" +
                          Math.round(daily.temperature_2m_min[i])}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected-day detail. The eight icon:"" slots are gone (item 17). */}
            <div style={surfacePanelStyle()}>
              <div style={eyebrowStyle("neutral")}>
                {selDay === 0 ? "Today" : dayFull(daily.time[selDay], lang)}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
                  gap: "8px",
                }}
              >
                {[
                  [
                    "High / Low",
                    Math.round(daily.temperature_2m_max[selDay]) +
                      DEG +
                      " / " +
                      Math.round(daily.temperature_2m_min[selDay]) +
                      DEG,
                  ],
                  [
                    "Rain chance",
                    (daily.precipitation_probability_max?.[selDay] ?? 0) + "%",
                  ],
                  [
                    "Rainfall",
                    (Number(daily.precipitation_sum[selDay]) || 0).toFixed(1) +
                      "mm",
                  ],
                  [
                    "Max wind",
                    Math.round(daily.wind_speed_10m_max?.[selDay] || 0) +
                      " km/h",
                  ],
                  [
                    "UV index",
                    Math.round(daily.uv_index_max?.[selDay] || 0),
                  ],
                  [
                    "Humidity",
                    selDay === 0
                      ? Math.round(current.relative_humidity_2m) + "%"
                      : "--",
                  ],
                  ["Sunrise", fmtTime(daily.sunrise?.[selDay])],
                  ["Sunset", fmtTime(daily.sunset?.[selDay])],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--ds-surface, #121815)",
                      border:
                        "1px solid var(--ds-line, rgba(255,255,255,0.08))",
                      borderRadius: RADIUS.sm,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ ...captionStyle, marginBottom: "2px" }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        fontFamily: "var(--mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <HourlyRain hours={hourly24} />

            {chartData.length > 0 && (
              <div style={surfacePanelStyle()}>
                <div style={eyebrowStyle("neutral")}>
                  Temperature trend - next 7 days
                </div>
                <div style={{ width: "100%", height: 170 }}>
                  <ResponsiveContainer width="100%" height={170} minWidth={0} minHeight={170} debounce={50}>
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        stroke="currentColor"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        stroke="currentColor"
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--ds-surface-2, #182019)",
                          border:
                            "1px solid var(--ds-line-2, rgba(255,255,255,0.14))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        // Was var(--t1), a token that does not exist (item 3).
                        itemStyle={{ color: "var(--ds-text, #eef2ef)" }}
                        labelStyle={{ color: "var(--ds-text, #eef2ef)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="max"
                        name="High"
                        stroke={chartColor.max}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="min"
                        name="Low"
                        stroke={chartColor.min}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <SprayWindow daily={daily} lang={lang} />
            <SoilMoisture soil={data._soilMoisture} />
            <CropHealthIndex current={current} daily={daily} />

            {updatedAt && (
              <p style={{ ...captionStyle, marginTop: "10px" }}>
                {"Forecast from Open-Meteo, loaded " +
                  updatedAt.toLocaleTimeString() +
                  ". Refreshes every 10 minutes while this page is open."}
              </p>
            )}
          </>
        )}

        {showReport && (
          <div
            className="modal-overlay fade-in"
            onClick={() => setShowReport(false)}
          >
            <div
              ref={reportRef}
              className="card p3"
              role="dialog"
              aria-modal="true"
              aria-labelledby="wx-report-title"
              style={{ maxWidth: "400px", width: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex jcb aic" style={{ marginBottom: "4px" }}>
                <h3
                  id="wx-report-title"
                  style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}
                >
                  What is it like where you are?
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={() => setShowReport(false)}
                >
                  {"\u00D7"}
                </button>
              </div>
              <p style={{ ...captionStyle, marginBottom: "12px" }}>
                Saved on this device only, so you can compare it with the
                forecast later. It is not sent anywhere yet.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {REPORT_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="btn btn-o"
                    style={{ fontSize: "12.5px", minHeight: "44px" }}
                    onClick={() => submitReport(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
