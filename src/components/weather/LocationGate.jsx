// LOCATION_GATE_R104
// The app used to fall back to Pune (18.5204, 73.8567) whenever geolocation
// was missing or denied, and showed that forecast as if it were the user's own.
// A farmer in Nanded opening the site saw Pune weather with no indication it
// was not theirs, then made spraying decisions from it.
//
// This component asks instead of assuming. No forecast loads until the user
// either grants location or names a place.
//
// R104.1: passes inline to CitySearch. This panel is the whole content of a
// short card, and .card is overflow:hidden !important, so an absolutely
// positioned suggestion list would be clipped right here (KL#37).
//
// R106: the denied/unsupported branch now keeps a retry button. Hiding it was
// wrong - a blocked prompt is not a permanent refusal, and once the user allows
// location in site settings a fresh user-initiated request works. Without a
// button there was nothing left to click.
//
// All prose here is plain ASCII; escapes would render literally in a JSX text
// node (KL#9).

import CitySearch from "./CitySearch";
import PinIcon from "./PinIcon";
import { surfacePanelStyle, eyebrowStyle, captionStyle } from "./panel";

export default function LocationGate({ gps, onUseLocation, onSelectCity, busy }) {
  const denied = gps === "denied";
  const unsupported = gps === "unsupported";

  const intro = denied
    ? "Location access is blocked, so we cannot detect where you are. Allow it in your browser and try again, or search for your city below."
    : unsupported
      ? "This device cannot share its location. Search for your city or the nearest town below."
      : "We need your location to show a forecast you can act on. Nothing is stored on our servers.";

  return (
    <div style={surfacePanelStyle({ marginTop: 0, padding: "18px" })}>
      <div style={eyebrowStyle("accent")}>Where is your farm?</div>

      <p style={{ ...captionStyle, marginBottom: "14px", fontSize: "13px" }}>
        {intro}
      </p>

      {/* Shown unless the device genuinely has no geolocation API at all. */}
      {!unsupported && (
        <button
          type="button"
          className="btn btn-g"
          onClick={onUseLocation}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
            minHeight: "44px",
          }}
        >
          <PinIcon />
          {busy
            ? "Detecting\u2026"
            : denied
              ? "Try location again"
              : "Use my location"}
        </button>
      )}

      {denied && (
        <p
          style={{ ...captionStyle, marginBottom: "14px", fontSize: "11.5px" }}
        >
          {"Blocked? Tap the padlock or (i) icon in the browser address bar, allow Location, then press the button above."}
        </p>
      )}

      <div style={{ marginBottom: "6px", fontSize: "12.5px", fontWeight: 600 }}>
        Or search for a place
      </div>
      <CitySearch onSelect={onSelectCity} disabled={busy} inline />
    </div>
  );
}
