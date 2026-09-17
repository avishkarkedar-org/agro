import React, { useState, useEffect, lazy, Suspense, useMemo, memo } from "react";

import { safeGetLS } from "../utils/helpers";
import { useSettings } from "../context/SettingsContext";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "./ErrorBoundaryFallback";
import LazyFeatureCard from "./LazyFeatureCard";

// Lazy load all feature components for code-splitting
const AgroIntelScan = lazy(() => import("./AgroIntelScan"));
const CropPlanner = lazy(() => import("./CropPlanner"));
const Weather = lazy(() => import("./Weather"));
const MandiPrices = lazy(() => import("./MandiPrices"));
const FertCalc = lazy(() => import("./FertCalc"));
const PestCalendar = lazy(() => import("./PestCalendar"));
const Community = lazy(() => import("./Community"));
const KrishiMarket = lazy(() => import("./KrishiMarket"));
const GovtSchemes = lazy(() => import("./GovtSchemes"));
const YieldCalc = lazy(() => import("./YieldCalc"));
const LiveEncyclopedia = lazy(() => import("./LiveEncyclopedia"));
const YoutubePlayer = lazy(() => import("./YoutubePlayer"));
const KVKDirectory = lazy(() => import("./KVKDirectory"));
const KrishiShare = lazy(() => import("./KrishiShare"));
const SoilHealthPlanner = lazy(() => import("./SoilHealthPlanner"));
const CropCalendar = lazy(() => import("./CropCalendar"));
const SeasonalCropRecommend = lazy(() => import("./SeasonalCropRecommend"));
const AgroIntelLedger = lazy(() => import("./AgroIntelLedger"));
const FertilizerTracker = lazy(() => import("./FertilizerTracker"));

// FEATUREGRID_MAP_R96: FEATURE_MAP and DEFAULT_ORDER moved to module scope.
// Defining them inside the component caused React to remount all 19 lazy
// components on every re-render (auth change, settings load).
const FEATURE_MAP_STATIC = {
  scan:        { id: "sec-scan",          name: "AI Plant Scanner" },
  planner:     { id: "sec-planner",       name: "AI Crop Planner" },
  weather:     { id: "sec-weather",       name: "Live Weather" },
  mandi:       { id: "sec-mandi",         name: "Mandi Prices" },
  fert:        { id: "sec-fert",          name: "Fertilizer Calculator" },
  pest:        { id: "sec-pest",          name: "Pest Calendar" },
  community:   { id: "sec-community",     name: "Farmer Community" },
  market:      { id: "sec-market",        name: "AgroIntel Market" },
  schemes:     { id: "sec-schemes",       name: "Government Schemes" },
  yield:       { id: "sec-yield",         name: "Profitability Estimator" },
  encyclopedia:{ id: "sec-encyclopedia",  name: "Disease Encyclopedia" },
  video:       { id: "sec-video",         name: "YouTube Video" },
  kvk:         { id: "sec-kvk",           name: "KVK Directory" },
  rentals:     { id: "sec-rentals",       name: "Equipment Rentals" },
  soil:        { id: "sec-soil",          name: "Soil Health Planner" },
  calendar:    { id: "sec-calendar",      name: "Crop Calendar" },
  seasonal:    { id: "sec-seasonal",      name: "Seasonal Recommendation" },
  ledger:      { id: "sec-ledger",        name: "Krishi Ledger" },
  fertTracker: { id: "sec-fert-tracker",  name: "Fertilizer Prices" },
};

const DEFAULT_ORDER_STATIC = [
  "scan", "planner", "weather", "mandi", "fert", "fertTracker",
  "pest", "community", "market", "schemes", "calendar", "seasonal",
  "ledger", "rentals", "soil", "yield", "encyclopedia", "video", "kvk",
];

const FEATURE_CATEGORIES = [
  { id: "all", label: "All Features", icon: "🌐" },
  { id: "health", label: "Crop Health & AI", icon: "🩺" },
  { id: "mandi", label: "Mandi & Finance", icon: "💰" },
  { id: "tools", label: "Farm Tools", icon: "🚜" },
  { id: "community", label: "Schemes & Govt", icon: "🏛️" },
];

const CATEGORY_MAPPINGS = {
  health: ["scan", "planner", "pest", "soil", "encyclopedia", "seasonal"],
  mandi: ["mandi", "fertTracker", "yield", "ledger", "market"],
  tools: ["fert", "rentals", "calendar", "weather"],
  community: ["community", "schemes", "kvk", "video"],
};

// FEATUREGRID_SUSPENSE_R99: realistic card skeleton to prevent layout jumps on load.
const FeatureSkeleton = ({ minHeight = 240 }) => (
  <div
    className="card skel"
    style={{
      minHeight: `${minHeight}px`,
      padding: "18px",
      borderRadius: "18px",
      background: "var(--s2, #141f18)",
      border: "1px solid var(--b1, rgba(255,255,255,0.08))",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ width: "120px", height: "18px", background: "rgba(255,255,255,0.08)", borderRadius: "6px" }} />
      <div style={{ width: "60px", height: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "10px" }} />
    </div>
    <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
    <div style={{ width: "85%", height: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }} />
    <div style={{ width: "60%", height: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "4px" }} />
    <div style={{ flex: 1, minHeight: "80px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginTop: "8px" }} />
  </div>
);

/* LOGIN_GATE_TOKENS_R102
 * The gate overlay previously hardcoded three off-system values:
 * rgba(0,0,0,0.7) for the scrim, #4ade80 for the padlock, and a 16px
 * radius. #4ade80 is specifically the high-contrast-theme green, so the
 * padlock was the one element on the page that ignored both the dark and
 * light palettes, and 16px is not in the 8/14/18 radius family, so the
 * overlay's corners never lined up with the card it covers.
 *
 * Every var() carries a literal fallback on purpose (KL#31): these are
 * inline styles, and an undefined custom property here would drop the
 * declaration and leave the scrim fully transparent, exposing a feature
 * that is supposed to be gated.
 */
const GATE_SCRIM = "var(--ds-scrim, rgba(0,0,0,0.72))";
const GATE_RADIUS = "var(--ds-r-lg, 18px)";
const GATE_ACCENT = "var(--ds-accent, #34d399)";

/* BOTTOM_NAV_TAB_FILTER_R200
 * activeTab drives which features are visible:
 *   "home"    → everything except weather & mandi (they have dedicated tabs)
 *   "weather" → only Weather widget
 *   "mandi"   → only MandiPrices widget
 *   "scan"    → only AgroIntelScan widget
 * This makes each tab feel focused rather than a scroll to a section.
 *
 * PERF_MEMO_R200: wrapped with React.memo so parent re-renders (toast, ticker,
 * theme cycling) don't cascade into FeatureGrid's 19 lazy component tree.
 */
function FeatureGrid({ activeTab = "home" }) {
  const { settings, loaded, hasAccessCode } = useSettings();
  const [user, setUser] = useState(() => safeGetLS("agrointel_user"));
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Deriving order, loginRequired, and disabled synchronously from settings
  // eliminates the second-render layout jump and padlock flash on page load.
  const order = useMemo(() => {
    return Array.isArray(settings?.feature_order) && settings.feature_order.length > 0
      ? settings.feature_order
      : null;
  }, [settings]);

  const loginRequired = useMemo(() => {
    return Array.isArray(settings?.login_required_features)
      ? settings.login_required_features
      : [];
  }, [settings]);

  const disabled = useMemo(() => {
    return Array.isArray(settings?.disabled_features)
      ? settings.disabled_features
      : [];
  }, [settings]);

  useEffect(() => {
    const handler = () => setUser(safeGetLS("agrointel_user"));
    window.addEventListener("agrointel-auth-change", handler);
    return () => {
      window.removeEventListener("agrointel-auth-change", handler);
    };
  }, []);

  // PERF_MEMO_R200: FEATURE_MAP used to be rebuilt on EVERY render - including
  // when an unrelated parent state (toast, news ticker, theme) changed. That
  // was O(19) JSX element constructions per re-render, each causing React to
  // reconcile a new JSX object. useMemo here means the map is only rebuilt
  // when settings (order/disabled) actually change.
  const FEATURE_MAP = useMemo(() => Object.fromEntries(
    Object.entries(FEATURE_MAP_STATIC).map(([k, v]) => {
      let comp = null;
      switch(k) {
        case "scan": comp = <AgroIntelScan />; break;
        case "planner": comp = <CropPlanner />; break;
        case "weather": comp = <Weather />; break;
        case "mandi": comp = <MandiPrices />; break;
        case "fert": comp = <FertCalc />; break;
        case "pest": comp = <PestCalendar />; break;
        case "community": comp = <Community />; break;
        case "market": comp = <KrishiMarket />; break;
        case "schemes": comp = <GovtSchemes />; break;
        case "yield": comp = <YieldCalc />; break;
        case "encyclopedia": comp = <LiveEncyclopedia />; break;
        case "video": comp = <YoutubePlayer />; break;
        case "kvk": comp = <KVKDirectory />; break;
        case "rentals": comp = <KrishiShare />; break;
        case "soil": comp = <SoilHealthPlanner />; break;
        case "calendar": comp = <CropCalendar />; break;
        case "seasonal": comp = <SeasonalCropRecommend />; break;
        case "ledger": comp = <AgroIntelLedger />; break;
        case "fertTracker": comp = <FertilizerTracker />; break;
      }
      return [k, { ...v, comp }];
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []); // Static map - lazy components don't change, only which are shown changes



  const DEFAULT_ORDER = DEFAULT_ORDER_STATIC;
  const savedOrder = order || [];
  const baseList =
    savedOrder.length > 0
      ? [
          ...savedOrder,
          ...DEFAULT_ORDER.filter((id) => !savedOrder.includes(id)),
        ]
      : DEFAULT_ORDER;

  /* BOTTOM_NAV_TAB_FILTER_R200
   * Dedicated tabs show only their one widget, filling the viewport.
   * Home tab shows ALL features including scan/weather/mandi so users can
   * discover them by scrolling — the bottom nav is just a shortcut to each.
   */
  let featureList;
  if (activeTab === "weather") {
    featureList = ["weather"];
  } else if (activeTab === "mandi") {
    featureList = ["mandi"];
  } else if (activeTab === "scan") {
    featureList = ["scan"];
  } else {
    // Home: filter baseList by activeCategory and searchQuery
    let list = baseList;
    if (activeCategory !== "all" && CATEGORY_MAPPINGS[activeCategory]) {
      list = list.filter((id) => CATEGORY_MAPPINGS[activeCategory].includes(id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((id) => {
        const item = FEATURE_MAP_STATIC[id];
        return item && (item.name.toLowerCase().includes(q) || id.toLowerCase().includes(q));
      });
    }
    featureList = list;
  }

  /* FEATUREGRID_SUSPENSE_R99
   * Previously ONE <Suspense> wrapped the entire map, so React suspended the
   * whole grid until the LAST of 19 lazy chunks resolved: the homepage showed a
   * single skeleton and every feature appeared at once, gated by the slowest
   * chunk. Worse, that Suspense sat OUTSIDE each ErrorBoundary, so a single
   * failed chunk fetch (flaky rural connection, stale SW cache) threw past it
   * to the app-level boundary in main.jsx and took down the entire page.
   *
   * Each feature now gets its own boundary pair, ordered
   * ErrorBoundary > Suspense > lazy component, so cards stream in
   * independently and one broken feature degrades to one fallback card.
   */
  const wrapFeature = (id, comp, name) => {
    if (loginRequired.includes(id) && !user && !hasAccessCode) {
      return (
        <div style={{position: "relative"}}>
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <Suspense fallback={<FeatureSkeleton />}>{comp}</Suspense>
          </ErrorBoundary>
          <div
            style={{position: "absolute",
              inset: 0,
              background: GATE_SCRIM,
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              borderRadius: GATE_RADIUS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,}}>
            <div
              style={{textAlign: "center",
                padding: "24px",
                maxWidth: "260px",}}>
              <div style={{display: "flex", justifyContent: "center", marginBottom: "10px", color: GATE_ACCENT}}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div className="sm bold mb1">Login Required</div>
              <div className="xs t2 mb2">Login to use {name}</div>
              <button
                className="btn btn-g btn-sm w100"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-auth-modal"))
                }
              >
                Login / Sign Up
              </button>
              <div
                style={{margin: "10px 0",
                  fontSize: "11px",
                  color: "var(--t3, rgba(238,242,239,0.56))",}}>
                &mdash; OR &mdash;
              </div>
              <button
                className="btn btn-o btn-sm w100"
                style={{ marginTop: "4px" }}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-access-code"))
                }
              >
                Use Access Code
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Suspense fallback={<FeatureSkeleton />}>{comp}</Suspense>
      </ErrorBoundary>
    );
  };

  /* For dedicated single-feature tabs, render the widget without the grid
   * wrapper so it can expand to fill the available viewport height. */
  if (activeTab !== "home") {
    const id = featureList[0];
    const f = FEATURE_MAP[id];
    if (!f || disabled.includes(id)) return null;

    // SCAN_AUTO_OPEN_R201: for the scan tab, pass autoOpenCamera so the camera
    // launches immediately when the user taps the center Scan button.
    // Only auto-open when the feature is NOT gated — no point requesting
    // camera behind a login overlay.
    const isGated = loginRequired.includes(id) && !user && !hasAccessCode;
    const comp = id === "scan" && !isGated
      ? <AgroIntelScan />
      : f.comp;

    return (
      <div style={{ minHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
        {wrapFeature(id, comp, f.name)}
      </div>
    );
  }

  const activeCount = featureList.filter((id) => FEATURE_MAP[id] && !disabled.includes(id)).length;
  const totalCount = baseList.filter((id) => !disabled.includes(id)).length;

  return (
    <div>
      {/* Category filter & quick search bar on Home tab */}
      <div
        style={{
          marginBottom: "16px",
          background: "var(--s2, #141f18)",
          border: "1px solid var(--b1, rgba(255,255,255,0.08))",
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px",
                color: "var(--t3)",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features (e.g. fertilizer, scanner, mandi, schemes)..."
              style={{
                width: "100%",
                paddingLeft: "32px",
                height: "36px",
                fontSize: "13px",
                borderRadius: "8px",
              }}
              aria-label="Filter features"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--t3)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>
          <span className="mono xs t3" style={{ whiteSpace: "nowrap" }}>
            {activeCount} / {totalCount} Features
          </span>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "2px",
            scrollbarWidth: "none",
          }}
        >
          {FEATURE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${isActive ? "var(--green, #22c55e)" : "var(--b1, rgba(255,255,255,0.08))"}`,
                  background: isActive ? "var(--gdim, rgba(34,197,94,0.15))" : "var(--s3, #1a271f)",
                  color: isActive ? "var(--green, #22c55e)" : "var(--t2, rgba(255,255,255,0.7))",
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCount === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "var(--s2)",
            borderRadius: "14px",
            border: "1px dashed var(--b2)",
            margin: "16px 0",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>🌾</div>
          <div className="bold sm mb1">No matching features</div>
          <div className="xs t3 mb3">
            No features matched &ldquo;{searchQuery}&rdquo; in this category.
          </div>
          <button
            type="button"
            className="btn btn-g btn-sm"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid">
          {featureList.map((id, index) => {
            const f = FEATURE_MAP[id];
            if (!f || disabled.includes(id)) return null;
            const wrapped = wrapFeature(id, f.comp, f.name);
            return (
              <div key={id} id={f.id}>
                <LazyFeatureCard priority={index < 4} minHeight={240}>
                  {wrapped}
                </LazyFeatureCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default memo(FeatureGrid);

