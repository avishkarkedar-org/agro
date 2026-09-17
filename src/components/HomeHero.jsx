import { useState, useEffect, useMemo } from "react";
import {
  ScanLine,
  CloudSun,
  TrendingUp,
  Sprout,
  Sparkles,
  FlaskConical,
  Users,
  ShoppingCart,
  Landmark,
  Calendar,
  TestTube,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";

// R88: bold, dynamic home hero. Replaces the old "Grow smarter with
// AgroIntel" card with a time-aware greeting, an animated aurora
// backdrop and quick-action tiles. Presentational only; buttons
// smooth-scroll to feature sections rendered by FeatureGrid.
//
// R91 BUGFIX: the old chain started with `h < 12`, which is also true for
// h = 0..4 -- so between midnight and 5am it cheerfully said "Good morning".
// Ranges are now explicit and bounded at both ends. The greeting is also
// re-evaluated on a timer: it used to be computed once at mount, so an
// installed PWA left open overnight kept showing whatever it said on load.
//
// R150: headline text simplified from "Your farm, supercharged." - flagged
// as not landing well - to a plainer description of what the app actually
// does. Layout/actions unchanged; see redesign6.css for the calmer glow.
const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* HOMEHERO_DISABLED_FILTER_R103
 * These tiles used to be a hardcoded four. That made the banner lie: when a
 * feature is disabled from the admin panel, FeatureGrid returns null for it,
 * so the #sec-* element the tile scrolls to never enters the DOM. scrollTo
 * then finds nothing and returns silently, so the tile rendered as a normal
 * enabled control and did nothing at all when tapped - the worst kind of
 * broken, because it gives no feedback to explain itself.
 *
 * The pool is deliberately longer than the four slots on display. The owner
 * asked for a disabled feature to be replaced rather than to leave a hole,
 * so the first four ENABLED candidates are shown and the grid stays full.
 *
 * `key` values must match FeatureGrid's FEATURE_MAP_STATIC keys, because
 * that is what settings.disabled_features stores. `to` values must match
 * that map's id field - note fertTracker maps to "sec-fert-tracker", which
 * is the one place the key and the id are not the same string.
 *
 * Icons are restricted to the set already imported elsewhere in this app and
 * therefore known to exist in lucide-react v1 and to pass the CI guard job,
 * which fails the build on brand-name icon imports (KL#19).
 */
const ACTION_POOL = [
  { key: "scan", icon: ScanLine, label: "Scan a crop", to: "sec-scan" },
  { key: "weather", icon: CloudSun, label: "Weather", to: "sec-weather" },
  { key: "mandi", icon: TrendingUp, label: "Mandi prices", to: "sec-mandi" },
  { key: "planner", icon: Sprout, label: "Crop planner", to: "sec-planner" },
  { key: "fert", icon: FlaskConical, label: "Fertilizer", to: "sec-fert" },
  { key: "community", icon: Users, label: "Community", to: "sec-community" },
  { key: "market", icon: ShoppingCart, label: "Market", to: "sec-market" },
  { key: "schemes", icon: Landmark, label: "Schemes", to: "sec-schemes" },
  { key: "calendar", icon: Calendar, label: "Crop calendar", to: "sec-calendar" },
  { key: "soil", icon: TestTube, label: "Soil health", to: "sec-soil" },
];

const VISIBLE_ACTIONS = 4;

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export default function HomeHero() {
  const [greeting, setGreeting] = useState(() =>
    greetingFor(new Date().getHours()),
  );
  const { settings } = useSettings();

  useEffect(() => {
    const id = setInterval(() => {
      setGreeting(greetingFor(new Date().getHours()));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  /* Array.isArray guards the same case FeatureGrid guards: /api/settings can
   * return this key as a string, or omit it entirely on a cold backend, and
   * calling .includes on a non-array would throw inside render and take the
   * whole homepage down with it. */
  const actions = useMemo(() => {
    const disabled = Array.isArray(settings?.disabled_features)
      ? settings.disabled_features
      : [];
    return ACTION_POOL.filter((a) => !disabled.includes(a.key)).slice(
      0,
      VISIBLE_ACTIONS,
    );
  }, [settings]);

  return (
    <section className="home-hero" aria-label="Welcome to AgroIntel">
      <span className="home-hero-orb o1" aria-hidden="true" />
      <span className="home-hero-orb o2" aria-hidden="true" />
      <span className="home-hero-orb o3" aria-hidden="true" />
      <div className="home-hero-inner">
        <span className="home-hero-badge">
          <Sparkles size={14} aria-hidden="true" /> {greeting}, farmer
        </span>
        <h1 className="home-hero-title">
          Everything your farm needs, <span>in one place</span>.
        </h1>
        <p className="home-hero-sub">
          Instant crop-disease diagnosis, live weather &amp; mandi prices, and
          season planning — all in your language, all in one app.
        </p>
        {actions.length > 0 && (
          <div className="home-hero-actions">
            {actions.map((a) => (
              <button
                key={a.key}
                className="home-hero-action"
                onClick={() => scrollTo(a.to)}
              >
                <span className="home-hero-action-icon">
                  <a.icon size={20} aria-hidden="true" />
                </span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
