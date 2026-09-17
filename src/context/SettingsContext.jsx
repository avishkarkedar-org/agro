import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";

const API = import.meta.env.VITE_API_URL || "https://agrointel-backend-ucic.onrender.com";
const SettingsContext = createContext({});

// SETTINGS_RESILIENCE_R89
// Why this file is defensive:
// The backend runs on Render's free tier, which spins down after ~15 minutes of
// inactivity and then cold-starts for 30-60 seconds. The previous implementation
// did a single plain fetch and, on ANY failure, called setSettings({}).
// An empty settings object has no `disabled_features`, so FeatureGrid and
// SidebarDrawer happily rendered every feature -- which looked exactly like
// "admin panel feature toggles are not reflecting on the website".
//
// Fixes applied here:
//   1. Hydrate synchronously from the last known-good settings in localStorage.
//   2. Long timeout + one retry so a cold backend still succeeds.
//   3. NEVER overwrite good settings with an empty object on failure.
//   4. Normalize list-shaped settings to real arrays (the settings table
//      declares disabled_features with a JSONB '{}' default, so a brand new row
//      hands the client an object instead of a list).
//   5. Poll periodically so admin changes land without a manual reload.
const SETTINGS_CACHE_KEY = "agrointel_settings_cache";
const POLL_MS = 60000;
const FETCH_TIMEOUT_MS = 25000;
const RETRY_DELAY_MS = 3000;
const FOCUS_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

// Settings the UI always treats as lists. Anything else (null, undefined, or the
// JSONB '{}' default) is coerced to an empty array so callers can rely on
// .includes / .length / .indexOf without guarding every single access.
const ARRAY_KEYS = [
  "disabled_features",
  "feature_order",
  "login_required_features",
  "custom_news",
  "rentals",
  "mandi_prices",
  "verified_experts",
];

function normalizeSettings(raw) {
  const d = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
  for (let i = 0; i < ARRAY_KEYS.length; i++) {
    const k = ARRAY_KEYS[i];
    if (!Array.isArray(d[k])) d[k] = [];
  }
  return d;
}

function readCachedSettings() {
  try {
    const raw = safeGetLS(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeSettings(parsed);
  } catch (e) {
    return null;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => readCachedSettings() || {});
  const [loaded, setLoaded] = useState(false);
  const [hasAccessCode, setHasAccessCode] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  // PERF_SETTINGS_DEBOUNCE_R200: track when we last successfully fetched so
  // focus/visibilitychange events don't hammer /api/settings on every tab switch.
  // 5 minutes minimum between reactive fetches; the scheduled poll still runs
  // every 60 s independently (it already guards document.visibilityState).
  const lastFetch = useRef(0);

  const checkPremium = () => {
    try {
      const p = JSON.parse(safeGetLS("agrointel_premium") || "null");
      if (!p) return setHasAccessCode(false);
      if (p.session_expires && Date.now() > p.session_expires) return setHasAccessCode(false);
      const expires = new Date(p.expires_at);
      if (expires < new Date()) return setHasAccessCode(false);
      setHasAccessCode(true);
    } catch {
      setHasAccessCode(false);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // One attempt, with an abort-based timeout. No ?t= cachebust: a unique URL
    // per request means the browser/service worker can never reuse anything, and
    // `cache: "no-store"` already guarantees we bypass the HTTP cache.
    const fetchOnce = async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const r = await fetch(`${API}/api/settings`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(timer);
      }
    };

    const loadSettings = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        let data;
        try {
          data = await fetchOnce();
        } catch (first) {
          // Most likely a Render cold start. Wait, then try once more.
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
          data = await fetchOnce();
        }
        if (!mounted.current) return;
        const next = normalizeSettings(data);
        setSettings(next);
        safeSetLS(SETTINGS_CACHE_KEY, JSON.stringify(next));
        lastFetch.current = Date.now();
      } catch (e) {
        // Deliberately keep whatever settings we already have (cached or live).
        // Falling back to {} here is what silently re-enabled disabled features.
        console.warn("Settings refresh failed, keeping last known values:", e);
      } finally {
        inFlight.current = false;
        if (mounted.current) setLoaded(true);
      }
    };

    loadSettings();

    // Re-pull settings when the user re-opens the tab / PWA, but debounce
    // reactive triggers so rapid tab-switching doesn't spam /api/settings.
    // The 60s scheduled poll is independent and unaffected.
    const debouncedLoad = () => {
      if (Date.now() - lastFetch.current > FOCUS_DEBOUNCE_MS) loadSettings();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") debouncedLoad();
    };
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") loadSettings();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", debouncedLoad);

    // Check premium initially and on custom event
    checkPremium();
    window.addEventListener("agrointel-premium-change", checkPremium);

    return () => {
      mounted.current = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", debouncedLoad);
      window.removeEventListener("agrointel-premium-change", checkPremium);
    };
  }, []);


  return (
    <SettingsContext.Provider value={{ settings, loaded, hasAccessCode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export { API };
