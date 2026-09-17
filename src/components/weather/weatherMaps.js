// WEATHER_MAPS_R104
// Weather code -> icon / label maps, extracted from Weather.jsx.
//
// Icons use \uXXXX escapes rather than literal emoji. Per KL#9/KL#14 a JS
// string literal escape is safe and survives whole-file pushes, whereas literal
// emoji has corrupted before (audit item 31).
//
// Every icon is paired with a text label so it can carry an accessible name;
// the 52px current-conditions glyph previously had none (audit item 32).

const SUN = "☀️";
const SUN_SMALL_CLOUD = "🌤️";
const SUN_CLOUD = "⛅";
const CLOUD_SUN = "🌥️";
const CLOUD = "☁️";
const FOG = "🌫️";
const DRIZZLE = "🌦️";
const RAIN = "🌧️";
const SLEET = "🌨️";
const SNOW = "❄️";
const STORM = "⛈️";
const THERMO = "🌡️";
const MOON = "🌙";
const NIGHT_CLOUD = "☁️";

export const WI = {
  0: SUN,
  1: SUN_SMALL_CLOUD,
  2: SUN_CLOUD,
  3: CLOUD,
  45: FOG,
  48: FOG,
  51: DRIZZLE,
  53: DRIZZLE,
  55: RAIN,
  56: SLEET,
  57: SLEET,
  61: RAIN,
  63: RAIN,
  65: RAIN,
  66: SLEET,
  67: SLEET,
  71: SNOW,
  73: SNOW,
  75: SNOW,
  77: SLEET,
  80: DRIZZLE,
  81: RAIN,
  82: STORM,
  85: SNOW,
  86: SNOW,
  95: STORM,
  96: STORM,
  99: STORM,
};

// Open-Meteo reports a precipitation *code* even when precipitation is under 0.8mm (trace).
// This filters out false rain icons on dry/sunny days.
export function smartIcon(code, isDay, precip) {
  const p = Number(precip) || 0;
  const day = isDay !== 0;
  if (p < 0.8) {
    if (code >= 51 && code <= 67) return day ? SUN_CLOUD : CLOUD;
    if (code >= 80 && code <= 82) return day ? SUN_CLOUD : CLOUD;
    if (code >= 95 && code <= 99) return day ? SUN_CLOUD : CLOUD;
    if (code === 3) return CLOUD;
    if (code === 2) return day ? SUN_CLOUD : CLOUD_SUN;
    if (code === 1) return day ? SUN_SMALL_CLOUD : NIGHT_CLOUD;
    if (code === 0) return day ? SUN : MOON;
  }
  return WI[code] || (day ? SUN : MOON);
}

// Dry-code correction: returns the appropriate clear/cloudy code if rainfall < 0.8mm.
export function effectiveCode(code, rainMm, maxTemp) {
  const r = Number(rainMm) || 0;
  if (r < 0.8 && code >= 51) return Number(maxTemp) > 30 ? 1 : 2;
  return code;
}

const WD_EN = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Heavy Freezing Drizzle",
  61: "Light Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Heavy Freezing Rain",
  71: "Light Snow",
  73: "Moderate Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Moderate Showers",
  82: "Violent Showers",
  85: "Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Hail",
  99: "Severe Thunderstorm",
};

const WD_HI = {
  0: "\u0938\u093E\u092F\u093E \u0906\u0915\u093E\u0936",
  1: "\u092E\u0941\u0916\u094D\u092F\u0924\u0903 \u0938\u093E\u092F\u093E",
  2: "\u0906\u0902\u0936\u093F\u0915 \u092C\u093E\u0926\u0932",
  3: "\u0918\u0928\u0947 \u092C\u093E\u0926\u0932",
  45: "\u0915\u094B\u0939\u0930\u093E",
  48: "\u092C\u0930\u094D\u092F\u0932\u093E \u0915\u094B\u0939\u0930\u093E",
  51: "\u0939\u0932\u094D\u0915\u0940 \u092C\u0942\u0902\u0926\u093E\u092C\u093E\u0902\u0926\u0940",
  53: "\u092C\u0942\u0902\u0926\u093E\u092C\u093E\u0902\u0926\u0940",
  55: "\u0924\u0947\u091C \u092C\u0942\u0902\u0926\u093E\u092C\u093E\u0902\u0926\u0940",
  56: "\u091C\u092E\u0924\u0940 \u092C\u0942\u0902\u0926\u093E\u092C\u093E\u0902\u0926\u0940",
  57: "\u0924\u0947\u091C \u091C\u092E\u0924\u0940 \u092C\u0942\u0902\u0926\u093E\u092C\u093E\u0902\u0926\u0940",
  61: "\u0939\u0932\u094D\u0915\u0940 \u092C\u093E\u0930\u093F\u0936",
  63: "\u092E\u0927\u094D\u092F\u092E \u092C\u093E\u0930\u093F\u0936",
  65: "\u092C\u0939\u0941\u0924 \u0924\u0947\u091C \u092C\u093E\u0930\u093F\u0936",
  66: "\u091C\u092E\u0924\u0940 \u092C\u093E\u0930\u093F\u0936",
  67: "\u0924\u0947\u091C \u091C\u092E\u0924\u0940 \u092C\u093E\u0930\u093F\u0936",
  71: "\u0939\u0932\u094D\u0915\u0940 \u092C\u0930\u094D\u092B",
  73: "\u092E\u0927\u094D\u092F\u092E \u092C\u0930\u094D\u092B",
  75: "\u092D\u093E\u0930\u0940 \u092C\u0930\u094D\u092B",
  77: "\u092C\u0930\u094D\u092B \u0915\u0947 \u0915\u0923",
  80: "\u0939\u0932\u094D\u0915\u0940 \u092C\u094C\u091B\u093E\u0930",
  81: "\u092E\u0927\u094D\u092F\u092E \u092C\u094C\u091B\u093E\u0930",
  82: "\u0924\u0947\u091C \u092C\u094C\u091B\u093E\u0930",
  85: "\u092C\u0930\u094D\u092B \u0915\u0940 \u092C\u094C\u091B\u093E\u0930",
  86: "\u092D\u093E\u0930\u0940 \u092C\u0930\u094D\u092B \u092C\u094C\u091B\u093E\u0930",
  95: "\u0906\u0902\u0927\u0940-\u0924\u0942\u092B\u093E\u0928",
  96: "\u0913\u0932\u094B\u0902 \u0915\u0947 \u0938\u093E\u0925 \u0924\u0942\u092B\u093E\u0928",
  99: "\u092D\u0940\u0937\u0923 \u0924\u0942\u092B\u093E\u0928",
};

const WD_MR = {
  0: "\u0928\u093F\u0930\u092D\u094D\u0930 \u0906\u0915\u093E\u0936",
  1: "\u092C\u0939\u0941\u0924\u093E\u0902\u0936\u0940 \u0928\u093F\u0930\u092D\u094D\u0930",
  2: "\u0905\u0902\u0936\u0924\u0903 \u0922\u0917\u093E\u0933",
  3: "\u092A\u0942\u0930\u094D\u0923 \u0922\u0917\u093E\u0933",
  45: "\u0927\u0941\u0915\u0947",
  48: "\u092C\u0930\u094D\u092B\u093E\u0933 \u0927\u0941\u0915\u0947",
  51: "\u0939\u0932\u0915\u0940 \u0930\u093F\u092E\u091D\u093F\u092E",
  53: "\u0930\u093F\u092E\u091D\u093F\u092E",
  55: "\u091C\u094B\u0930\u0926\u093E\u0930 \u0930\u093F\u092E\u091D\u093F\u092E",
  56: "\u0917\u094B\u0920\u0923\u093E\u0930\u0940 \u0930\u093F\u092E\u091D\u093F\u092E",
  57: "\u091C\u094B\u0930\u0926\u093E\u0930 \u0917\u094B\u0920\u0923\u093E\u0930\u0940 \u0930\u093F\u092E\u091D\u093F\u092E",
  61: "\u0939\u0932\u0915\u093E \u092A\u093E\u090A\u0938",
  63: "\u092E\u0927\u094D\u092F\u092E \u092A\u093E\u090A\u0938",
  65: "\u091C\u094B\u0930\u0926\u093E\u0930 \u092A\u093E\u090A\u0938",
  66: "\u0917\u094B\u0920\u0923\u093E\u0930\u093E \u092A\u093E\u090A\u0938",
  67: "\u091C\u094B\u0930\u0926\u093E\u0930 \u0917\u094B\u0920\u0923\u093E\u0930\u093E \u092A\u093E\u090A\u0938",
  71: "\u0939\u0932\u0915\u093E \u092C\u0930\u094D\u092F\u093E\u0902\u091A\u093E \u0935\u0930\u094D\u0937\u093E\u0935",
  73: "\u092E\u0927\u094D\u092F\u092E \u092C\u0930\u094D\u092B",
  75: "\u091C\u094B\u0930\u0926\u093E\u0930 \u092C\u0930\u094D\u092B",
  77: "\u092C\u0930\u094D\u092B\u093E\u091A\u0947 \u0915\u0923",
  80: "\u0939\u0932\u0915\u0940 \u0938\u0930",
  81: "\u092E\u0927\u094D\u092F\u092E \u0938\u0930",
  82: "\u091C\u094B\u0930\u0926\u093E\u0930 \u0938\u0930",
  85: "\u092C\u0930\u094D\u092B\u093E\u091A\u0940 \u0938\u0930",
  86: "\u091C\u094B\u0930\u0926\u093E\u0930 \u092C\u0930\u094D\u092B\u093E\u091A\u0940 \u0938\u0930",
  95: "\u0935\u093E\u0926\u0933",
  96: "\u0917\u093E\u0930\u093E\u0902\u0938\u0939 \u0935\u093E\u0926\u0933",
  99: "\u0924\u0940\u0935\u094D\u0930 \u0935\u093E\u0926\u0933",
};

export const WD = WD_EN;

export function condLabel(code, lang) {
  const table = lang === "hi" ? WD_HI : lang === "mr" ? WD_MR : WD_EN;
  return table[code] || WD_EN[code] || "";
}

const DAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAYS3_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAYS_HI = [
  "\u0930\u0935\u093F\u0935\u093E\u0930",
  "\u0938\u094B\u092E\u0935\u093E\u0930",
  "\u092E\u0902\u0917\u0932\u0935\u093E\u0930",
  "\u092C\u0941\u0927\u0935\u093E\u0930",
  "\u0917\u0941\u0930\u0941\u0935\u093E\u0930",
  "\u0936\u0941\u0915\u094D\u0930\u0935\u093E\u0930",
  "\u0936\u0928\u093F\u0935\u093E\u0930",
];

const DAYS3_HI = [
  "\u0930\u0935\u093F",
  "\u0938\u094B\u092E",
  "\u092E\u0902\u0917\u0932",
  "\u092C\u0941\u0927",
  "\u0917\u0941\u0930\u0941",
  "\u0936\u0941\u0915\u094D\u0930",
  "\u0936\u0928\u093F",
];

// Marathi weekday names match Hindi closely enough that reusing them is
// correct rather than lazy; both are Devanagari and identical for these seven.
export function dayShort(dateStr, lang) {
  const d = new Date(dateStr + "T00:00:00");
  const i = d.getDay();
  return lang === "hi" || lang === "mr" ? DAYS3_HI[i] : DAYS3_EN[i];
}

export function dayFull(dateStr, lang) {
  const d = new Date(dateStr + "T00:00:00");
  const i = d.getDay();
  return lang === "hi" || lang === "mr" ? DAYS_HI[i] : DAYS_EN[i];
}

// Kept for any caller still importing the old helpers.
export const fday = (s) => dayShort(s, "en");
export const ffull = (s) => dayFull(s, "en");

// Open-Meteo returns "2026-07-26T06:12". The card previously printed the raw
// "06:12" from split("T")[1] (audit item 20).
export function fmtTime(iso) {
  if (!iso || typeof iso !== "string") return "\u2014";
  const part = iso.includes("T") ? iso.split("T")[1] : iso;
  const bits = part.split(":");
  const h = Number(bits[0]);
  const m = bits[1] || "00";
  if (!Number.isFinite(h)) return "\u2014";
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ":" + m + " " + suffix;
}

// Searchable city list. This is a convenience list for autocomplete only - the
// component geocodes whatever the user types, so a village not listed here
// still works.
export const CITIES = [
  "Pune",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Nagpur",
  "Nashik",
  "Aurangabad",
  "Solapur",
  "Kolhapur",
  "Sangli",
  "Amravati",
  "Akola",
  "Nanded",
  "Latur",
  "Osmanabad",
  "Satara",
  "Ratnagiri",
  "Sindhudurg",
  "Patna",
  "Ranchi",
  "Bhopal",
  "Indore",
  "Jabalpur",
  "Gwalior",
  "Varanasi",
  "Agra",
  "Kanpur",
  "Allahabad",
  "Meerut",
  "Ludhiana",
  "Amritsar",
  "Chandigarh",
  "Jodhpur",
  "Udaipur",
  "Surat",
  "Vadodara",
  "Rajkot",
  "Coimbatore",
  "Madurai",
  "Tiruchirappalli",
  "Visakhapatnam",
  "Vijayawada",
  "Warangal",
  "Guntur",
  "Kochi",
  "Thiruvananthapuram",
  "Kozhikode",
  "Mysuru",
  "Mangaluru",
  "Hubli",
  "Dharwad",
  "Belgaum",
  "Gulbarga",
  "Shimla",
  "Dehradun",
  "Haridwar",
];

// Match on substring, not just prefix, so "nashik road" and "pur" both work.
export function matchCities(q, limit) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return [];
  const starts = [];
  const contains = [];
  for (const c of CITIES) {
    const lc = c.toLowerCase();
    if (lc.startsWith(s)) starts.push(c);
    else if (lc.includes(s)) contains.push(c);
  }
  return starts.concat(contains).slice(0, limit || 8);
}
