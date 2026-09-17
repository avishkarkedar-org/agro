import { useState, useEffect, lazy, Suspense } from "react";
import { safeGetLS, safeSetLS, safeRemoveLS } from "./utils/helpers";
import { API, useSettings } from "./context/SettingsContext";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Routes, Route } from "react-router-dom";

// Components
import OfflineBanner from "./components/OfflineBanner";
import ScheduledMaintenanceBanner from "./components/ScheduledMaintenanceBanner";
import LangSwitcher from "./components/LangSwitcher";
import Toast from "./components/Toast";
import SeasonalBanner from "./components/SeasonalBanner";
import DailyTip from "./components/DailyTip";
import FeatureGrid from "./components/FeatureGrid";
import HomeHero from "./components/HomeHero";
import FloatingLoginBtn from "./components/FloatingLoginBtn";
import { usePricesWebSocket } from "./hooks/usePricesWebSocket";
import SidebarDrawer from "./components/SidebarDrawer";
import ConfirmHost from "./components/ConfirmHost";
import ScrollTopButton from "./components/ScrollTopButton";
import CookieConsent from "./components/CookieConsent";
import BottomNav from "./components/BottomNav";
import DesktopNav from "./components/DesktopNav";
import { initOneSignal } from "./utils/onesignal";


// APP_SHELL_SPLIT_R117
// App.jsx was ~900 lines, past the point where it could be rewritten at all.
// These six pieces were extracted so the file - and therefore the header, footer
// and ticker everyone keeps asking about - is editable again. Each is a faithful
// move; see the individual files for the reasoning that travelled with them.
import SplashScreen from "./components/shell/SplashScreen";
import MaintenanceScreen from "./components/shell/MaintenanceScreen";
import AnnouncementModal from "./components/shell/AnnouncementModal";
import UpdatePrompt from "./components/shell/UpdatePrompt";
import InstallPrompt from "./components/shell/InstallPrompt";
import SiteFooter from "./components/shell/SiteFooter";

const AuthModal = lazy(() => import("./components/AuthModal"));
const AccessCodeModal = lazy(() => import("./components/AccessCodeModal"));
const OnboardingTutorial = lazy(() => import("./components/OnboardingTutorial"));
const AIVoiceAssistant = lazy(() => import("./components/AIVoiceAssistant"));

const ProfileModal = lazy(() => import("./components/ProfileModal"));
const SettingsModal = lazy(() => import("./components/SettingsModal"));

const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  usePricesWebSocket();
  const [toast, setToast] = useState("");
  const [premiumKey, setPremiumKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // BOTTOM_NAV_R200: active tab for the bottom navigation bar
  const [activeTab, setActiveTab] = useState("home");
  // PERF_LAZY_VOICE_R200: defer mounting AIVoiceAssistant until the browser is
  // idle. The component is ~19kB and runs mic/speech API setup on mount. Since
  // it's always been mounted on first render even when the user never opens it,
  // it was slowing first-paint and running unnecessary setup. requestIdleCallback
  // (with a 3s deadline fallback) pushes it past the critical rendering path.
  const [voiceReady, setVoiceReady] = useState(false);


  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [accessCodeOpen, setAccessCodeOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [annImage, setAnnImage] = useState("");
  const [annDismissed, setAnnDismissed] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [theme, setTheme] = useState(

    () => safeGetLS("agrointel_theme") || "auto",
  );
  const [newsTicker, setNewsTicker] = useState(() => {
    return safeGetLS("agrointel_cached_news") || "AgroIntel — Smart Farming Intelligence";
  });
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!safeGetLS("agrointel_user"),
  );
  const [showOnboarding, setShowOnboarding] = useState(
    () => !safeGetLS("agrointel_onboarded"),
  );

  const { settings: ctxSettings, loaded: ctxLoaded } = useSettings();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // Install prompt is a one-time, dismissible card that appears shortly after
  // the app opens (only when the browser offers install and the user has not
  // dismissed it before). It is NOT a permanent header button.
  const [installVisible, setInstallVisible] = useState(false);

  /* DEAD_LIVE_PILL_R119
   * There is no `isOnline` state here any more. It existed solely to colour the
   * header's Live/Offline pill, which redesign2.css has hidden since R88 with
   *   .header-right .badge-live { display: none !important; }
   * so two window listeners were re-rendering this component on every
   * connectivity change to update an element with display:none.
   *
   * Offline status is reported by OfflineBanner, which owns its own state and
   * its own online/offline listeners and never read this value. Do not re-add
   * connectivity state here for a header indicator without first deleting that
   * CSS rule, or it will be invisible all over again. */

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered");
      if (r) {
        // Force update check immediately
        r.update();
        // And check every 1 hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(e) {
      console.error("SW Error", e);
    },
  });

  // ANNOUNCEMENT_DISMISS_R117
  // One dismissal path for all three controls (the x, "Acknowledge & Close", and
  // Escape). Previously only the x persisted, so acknowledging an announcement
  // brought it back on the next visit. The `announcement &&` guard keeps an empty
  // string from ever being stored, which would otherwise suppress a later one.
  const dismissAnnouncement = () => {
    setAnnDismissed(true);
    if (announcement) safeSetLS("agrointel_ann_last", announcement);
  };

  useEffect(() => {
    initOneSignal();
    const handler = () => setIsLoggedIn(!!safeGetLS("agrointel_user"));
    window.addEventListener("agrointel-auth-change", handler);
    const openAuth = () => setAuthModalOpen(true);
    window.addEventListener("open-auth-modal", openAuth);
    const openAccessCode = () => setAccessCodeOpen(true);
    window.addEventListener("open-access-code", openAccessCode);
    const showToastHandler = (e) => setToast(typeof e.detail === "string" ? e.detail : e.detail?.msg || "");
    window.addEventListener("show-toast", showToastHandler);

    const promptHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Surface the install card once, a moment after open, unless the user
      // already dismissed it in a previous visit.
      if (safeGetLS("agrointel_install_dismissed") !== "1") {
        setTimeout(() => setInstallVisible(true), 1500);
      }
    };
    window.addEventListener("beforeinstallprompt", promptHandler);

    const installedHandler = () => {
      setInstallVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("agrointel-auth-change", handler);
      window.removeEventListener("open-auth-modal", openAuth);
      window.removeEventListener("open-access-code", openAccessCode);
      window.removeEventListener("show-toast", showToastHandler);
      window.removeEventListener("beforeinstallprompt", promptHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
    setInstallVisible(false);
  };

  const dismissInstall = () => {
    setInstallVisible(false);
    safeSetLS("agrointel_install_dismissed", "1");
  };

  const resolveTheme = (t) => {
    if (t !== "auto") return t;
    const h = new Date().getHours();
    return h >= 6 && h < 18 ? "light" : "dark";
  };

  const cycleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : t === "light" ? "auto" : "dark"));

  useEffect(() => {
    document.documentElement.className = resolveTheme(theme);
    safeSetLS("agrointel_theme", theme);
    if (theme === "auto") {
      const iv = setInterval(() => {
        document.documentElement.className = resolveTheme("auto");
      }, 60000);
      return () => clearInterval(iv);
    }
  }, [theme]);

  useEffect(() => {
    // PERF_LAZY_VOICE_R200: mount the voice assistant during browser idle time
    // so it doesn't compete with first-paint and critical data fetches.
    let id;
    if (typeof requestIdleCallback !== "undefined") {
      id = requestIdleCallback(() => setVoiceReady(true), { timeout: 3000 });
    } else {
      id = setTimeout(() => setVoiceReady(true), 2000);
    }
    return () => {
      if (typeof cancelIdleCallback !== "undefined") cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    let lastNewsFetch = 0;
    const NEWS_DEBOUNCE_MS = 3 * 60 * 1000; // 3 minutes

    const fetchNews = (force = false) => {
      const now = Date.now();
      if (!force && now - lastNewsFetch < NEWS_DEBOUNCE_MS) return;
      lastNewsFetch = now;

      fetch(`${API}/api/news`)
        .then((r) => r.json())
        .then((d) => {
          if (d.news && Array.isArray(d.news) && d.news.length > 0) {
            window._krishiRssNews = d.news;
            const stamp = new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const rss = d.news.join("   |   ");
            const admin = (window._krishiAdminNews || []).join("   |   ");
            const body = admin ? admin + "   |   " + rss : rss;
            const text = "⟳ Updated " + stamp + "   •   " + body;
            setNewsTicker(text);
            safeSetLS("agrointel_cached_news", text);
          }
        })
        .catch(() => {});
    };

    // Non-blocking initial fetch
    fetchNews(true);

    // Non-blocking health check
    fetch(`${API}/health`, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    }).catch(() => {});

    // Defer analytics to browser idle
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => {
        fetch(`${API}/api/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feature: "app_load", status: "success" }),
        }).catch(() => {});
      });
    }

    const onPricesUpdated = () => fetchNews(true);
    const onNewsVisible = () => {
      if (document.visibilityState === "visible") fetchNews(false);
    };

    window.addEventListener("agrointel-live-prices-updated", onPricesUpdated);
    document.addEventListener("visibilitychange", onNewsVisible);
    window.addEventListener("online", () => fetchNews(true));

    return () => {
      window.removeEventListener("agrointel-live-prices-updated", onPricesUpdated);
      document.removeEventListener("visibilitychange", onNewsVisible);
      window.removeEventListener("online", () => fetchNews(true));
    };
  }, []);


  // Consume settings from the shared SettingsContext instead of fetching
  // /api/settings a second time here.
  useEffect(() => {
    if (!ctxLoaded) return undefined;
    const checkMaint = () => {
      const d = ctxSettings || {};
      let isSched = false;
      const sched = d.maintenance_schedule;
      if (sched && sched.start && sched.end) {
        const s = new Date(sched.start).getTime();
        const e = new Date(sched.end).getTime();
        const now = Date.now();
        if (!Number.isNaN(s) && !Number.isNaN(e) && now >= s && now <= e) {
          isSched = true;
        }
      }
      setMaintenance(Boolean(d.maintenance_mode || isSched));
    };

    checkMaint();
    const timer = setInterval(checkMaint, 15000);
    return () => clearInterval(timer);
  }, [ctxLoaded, ctxSettings]);

  useEffect(() => {
    if (!ctxLoaded) return;
    const d = ctxSettings || {};
    if (d.announcement) {
      setAnnouncement(d.announcement);
      if (safeGetLS("agrointel_ann_last") === d.announcement)
        setAnnDismissed(true);
    }
    if (d.ann_image) setAnnImage(d.ann_image);
    if (d.custom_news && d.custom_news.length > 0) {
      const adminNews = d.custom_news
        .map((n) => (typeof n === "string" ? n : n.title || n.text || ""))
        .filter(Boolean);
      window._krishiAdminNews = adminNews;
      const rss = (window._krishiRssNews || []).join("   |   ");
      const admin = adminNews.join("   |   ");
      setNewsTicker(rss ? admin + "   |   " + rss : admin);
    }
    if (d.bulk_message && d.bulk_message.trim()) {
      const lastSeen = safeGetLS("agrointel_bulk_msg_seen");
      if (lastSeen !== d.bulk_message) {
        setTimeout(() => {
          setToast("📣 " + d.bulk_message);
          safeSetLS("agrointel_bulk_msg_seen", d.bulk_message);
        }, 2000);
      }
    }
  }, [ctxLoaded, ctxSettings]);

  const [adminBypass, setAdminBypass] = useState(() => {
    try {
      return localStorage.getItem("agrointel_maint_bypass") === "true";
    } catch {
      return false;
    }
  });

  const exitBypass = () => {
    try {
      localStorage.removeItem("agrointel_maint_bypass");
    } catch {}
    setAdminBypass(false);
  };

  // PULL_TO_REFRESH_R200: native touch-event pull-to-refresh.
  // Uses imperative DOM listeners (passive:false) so we can call preventDefault
  // and stop the browser's native overscroll bounce from competing with ours.
  // Fires 'agrointel-pull-refresh' custom event — Weather and Mandi listen for it.
  useEffect(() => {
    let startY = 0;
    let pulling = false;
    let loading = false;
    const THRESHOLD = 72;

    const getIndicator = () => document.getElementById("ptr-indicator-el");
    const getSpinner = () => document.querySelector("#ptr-indicator-el .ptr-spinner");

    const showIndicator = (progress, spin) => {
      const el = getIndicator();
      if (!el) return;
      const clamped = Math.min(progress, 1);
      el.style.display = "flex";
      el.style.opacity = spin ? "1" : String(clamped);
      el.style.transform = spin ? "translateY(0)" : `translateY(${Math.min(clamped * 48, 48) - 56}px)`;
      const sp = getSpinner();
      if (sp) sp.className = spin ? "ptr-spinner ptr-spin" : "ptr-spinner";
    };
    const hideIndicator = () => {
      const el = getIndicator();
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(-56px)";
      setTimeout(() => { if (el) el.style.display = "none"; }, 300);
    };

    const onTouchStart = (e) => {
      if (loading) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY <= 2) {
        startY = e.touches[0].clientY;
        pulling = true;
      } else {
        pulling = false;
      }
    };
    const onTouchMove = (e) => {
      if (!pulling || loading) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY > 2) {
        pulling = false;
        hideIndicator();
        return;
      }
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        pulling = false;
        hideIndicator();
        return;
      }
      const progress = dy / THRESHOLD;
      showIndicator(progress, false);
      if (dy > 12) e.preventDefault();
    };
    const onTouchEnd = async () => {
      if (!pulling) return;
      pulling = false;
      const el = getIndicator();
      const progress = el ? parseFloat(el.style.opacity || "0") : 0;
      if (progress >= 1 && !loading) {
        loading = true;
        showIndicator(1, true);
        window.dispatchEvent(new CustomEvent("agrointel-pull-refresh"));
        await new Promise(r => setTimeout(r, 1200));
        loading = false;
        hideIndicator();
      } else {
        hideIndicator();
      }
      startY = 0;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  if (maintenance && !adminBypass) {
    return <MaintenanceScreen onBypass={() => setAdminBypass(true)} />;
  }


  return (
    <div style={{ minHeight: "100vh" }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {maintenance && adminBypass && (
        <div
          role="status"
          style={{
            position: "relative",
            zIndex: 101,
            background: "rgba(239, 68, 68, 0.92)",
            color: "#ffffff",
            padding: "8px 16px",
            fontSize: "12.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            fontWeight: 500,
          }}
        >
          <span>⚡ <strong>Maintenance Mode Active</strong> (Viewing in Admin Bypass Mode)</span>
          <button
            type="button"
            onClick={exitBypass}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Lock Screen
          </button>
        </div>
      )}
      <OfflineBanner />
      <ScheduledMaintenanceBanner />

      {/* PWA Update Prompt */}
      {needRefresh && (
        <UpdatePrompt
          onLater={() => setNeedRefresh(false)}
          onUpdate={() => {
            updateServiceWorker(true);
            setTimeout(() => window.location.reload(), 150);
          }}
        />
      )}

      {/* Announcement modal */}
      {announcement && !annDismissed && (
        <AnnouncementModal
          announcement={announcement}
          annImage={annImage}
          onDismiss={dismissAnnouncement}
        />
      )}

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{
                background: "var(--s1)",
                border: "var(--glass-border)",
                color: "var(--text)",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--glass-shadow)"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/>
                <line x1="4" x2="20" y1="6" y2="6"/>
                <line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
            </button>
            <div
              className="logo notranslate"
              role="banner"
              aria-label="AgroIntel Home"
              onClick={() => {
                setActiveTab("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ cursor: "pointer" }}
            >
              <div
                className="logo-icon"
                style={{
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  padding: 0
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2L2 10V22L16 30L30 22V10L16 2Z" fill="url(#paint0_linear)" />
                  <path d="M16 8L8 12.5V19.5L16 24L24 19.5V12.5L16 8Z" fill="#ffffff" />
                  <defs>
                    <linearGradient id="paint0_linear" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="var(--ds-accent-2)" />
                      <stop offset="1" stopColor="var(--ds-accent)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div style={{ marginLeft: "2px" }}>
                <div className="logo-name" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>AgroIntel</div>
                <div className="logo-sub" style={{ opacity: 0.8, letterSpacing: "0.02em" }}>Smart Farming Intelligence</div>
              </div>
            </div>
          </div>

          {/* Desktop primary navigation bar */}
          <DesktopNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            isLoggedIn={isLoggedIn}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />

          <div className="header-right">
            <LangSwitcher />
          </div>
        </div>
      </header>

      {/* News ticker */}
      <div
        style={{
          background: "var(--b1)",
          padding: "6px 10px 6px 0",
          fontSize: "12px",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflow: "hidden",
          borderBottom: "1px solid var(--b2)",
        }}
      >
        <span
          style={{
            background: "var(--red)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "1px",
            flexShrink: 0,
          }}
        >
          LIVE
        </span>
        <div className="ticker-wrap" style={{ flex: 1, minWidth: 0 }}>
          {/* TICKER_LOOP_R120
              The headline list is rendered TWICE on purpose. redesign5.css
              section 10 translates this track by exactly -50%, so when the
              first copy scrolls out the second is already sitting where it
              started and the loop has no gap. That -50% is only seamless
              while the two segments are IDENTICAL in width - same string,
              same spacing, both taking their padding from .ticker-seg. Do
              not add spacing to only one of them, and do not render
              different content in the second, or the strip will jump once
              per cycle. The copy is decorative, hence aria-hidden, so a
              screen reader does not read every headline twice. */}
          <div className="ticker-content">
            <span className="ticker-seg">{newsTicker}</span>
            <span className="ticker-seg" aria-hidden="true">{newsTicker}</span>
          </div>
        </div>
      </div>

      {/* Tab transition animation styles */}
      <style>{`
        @keyframes tab-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .tab-content-enter {
          animation: tab-fade-in 0.22s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        /* Pull-to-refresh indicator */
        .ptr-indicator {
          display: none;
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          justify-content: center;
          align-items: center;
          height: 48px;
          pointer-events: none;
          transform: translateY(-56px);
          transition: opacity 0.15s, transform 0.15s;
        }
        .ptr-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(52,211,153,0.25);
          border-top-color: var(--green, #34d399);
          border-radius: 50%;
        }
        .main-responsive-shell {
          padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
        }
        @media (min-width: 900px) {
          .main-responsive-shell {
            padding-bottom: 32px !important;
          }
        }
      `}</style>

      {/* Main content — padded bottom so nothing hides behind BottomNav */}
      <div
        className="main main-responsive-shell"
        id="main-content"
      >
        {/* Pull-to-refresh indicator — positioned at top, animated by touch events */}
        <div className="ptr-indicator" id="ptr-indicator-el" aria-hidden="true">
          <div className="ptr-spinner" />
        </div>
        <Routes key={premiumKey}>
          <Route path="/" element={
            <div className="tab-content-enter" key={activeTab}>
              {/* HomeHero only shown on the Home tab */}
              {activeTab === "home" && <HomeHero />}
              {activeTab === "home" && <SeasonalBanner />}
              {activeTab === "home" && <DailyTip />}
              <FeatureGrid activeTab={activeTab} />
              {/* Footer only on home tab */}
              {activeTab === "home" && <SiteFooter />}
            </div>
          } />
          <Route path="/privacy" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading Privacy Policy...</div>}><Privacy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading Terms &amp; Conditions...</div>}><Terms /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading About...</div>}><About /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading Contact...</div>}><Contact /></Suspense>} />
          <Route path="/faq" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading FAQ...</div>}><FAQ /></Suspense>} />
          <Route path="/changelog" element={<Suspense fallback={<div className="container" style={{padding: "40px 20px"}}>Loading Changelog...</div>}><Changelog /></Suspense>} />
          <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
        </Routes>
      </div>

      {/* Bottom navigation bar (mobile) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "profile") {
            // Profile tab → open profile modal (or login if not logged in)
            if (isLoggedIn) {
              setProfileModalOpen(true);
            } else {
              setAuthModalOpen(true);
            }
            // Don't change activeTab — keep the user on whatever tab they were on
            return;
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      />

      {/* Dismissible install prompt (auto-shows once shortly after open) */}
      {installVisible && deferredPrompt && (
        <InstallPrompt onInstall={installApp} onDismiss={dismissInstall} />
      )}


      <SidebarDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isLoggedIn={isLoggedIn}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        theme={theme}
        onToggleTheme={cycleTheme}
        onLoginClick={() => setAuthModalOpen(true)}
      />
      <Suspense fallback={null}>
        {authModalOpen && !isLoggedIn && (
          <AuthModal
            onClose={() => setAuthModalOpen(false)}
            onSuccess={() => {
              setToast("✅ Logged in successfully!");
            }}
          />
        )}
        {accessCodeOpen && (
          <AccessCodeModal
            onClose={(success) => {
              setAccessCodeOpen(false);
              if (success) {
                setToast("✅ Premium features unlocked!");
                setPremiumKey((k) => k + 1);
              }
            }}
            userEmail={safeGetLS("agrointel_user") || ""}
          />
        )}
        {profileModalOpen && (
          <ProfileModal
            onClose={() => setProfileModalOpen(false)}
            onLogout={() => {
              safeRemoveLS("agrointel_user");
              safeRemoveLS("agrointel_token");
              setProfileModalOpen(false);
              window.dispatchEvent(new Event("agrointel-auth-change"));
              setToast("Logged out successfully");
            }}
          />
        )}
        {settingsModalOpen && (
          <SettingsModal
            onClose={() => setSettingsModalOpen(false)}
            onLogout={() => {
              safeRemoveLS("agrointel_user");
              safeRemoveLS("agrointel_token");
              setSettingsModalOpen(false);
              window.dispatchEvent(new Event("agrointel-auth-change"));
            }}
          />
        )}
        {showOnboarding && (
          <OnboardingTutorial onClose={() => setShowOnboarding(false)} />
        )}
        {/* PERF_LAZY_VOICE_R200: only mount after browser idle - improves first-paint */}
        {voiceReady && <AIVoiceAssistant />}
      </Suspense>
      <ConfirmHost />
      <ScrollTopButton />
      <CookieConsent />
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
  );
}
