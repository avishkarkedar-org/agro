import { useState, useEffect } from "react";
import { safeGetLS } from "../utils/helpers";

// R150: was pinned to the bottom-right corner (bottom:20/right:20), which
// collided with the mobile quick-nav bar and sat awkwardly next to the
// voice-assistant FAB. Recentered to bottom-middle-ish per the owner's
// request, at the same clearance the FAB uses above the mobile quick-nav
// bar/safe-area so it never overlaps them.

// R160: this card used to only disappear on login/logout (`agrointel-auth-
// change`). Activating an access code in AccessCodeModal never sets
// `agrointel_user` - it only writes `agrointel_premium` and fires
// `agrointel-premium-change` - so the auth listener never ran for that path
// and the "Login to unlock premium" card kept floating on screen for
// visitors who had just unlocked premium with a code. It now also tracks
// premium/access-code state and hides for that case too.
function hasActivePremium() {
  try {
    const p = JSON.parse(safeGetLS("agrointel_premium") || "null");
    if (!p) return false;
    if (p.session_expires && Date.now() > p.session_expires) return false;
    if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

export default function FloatingLoginBtn({ onLogin, onAccessCode }) {
  const [dismissed, setDismissed] = useState(false);
  const [user, setUser] = useState(() => safeGetLS("agrointel_user"));
  const [premium, setPremium] = useState(() => hasActivePremium());

  // Listen for login/logout events
  useEffect(() => {
    const handler = () => setUser(safeGetLS("agrointel_user"));
    window.addEventListener("agrointel-auth-change", handler);
    return () => window.removeEventListener("agrointel-auth-change", handler);
  }, []);

  // Listen for access-code activation so the card vanishes the moment a
  // valid code is entered, same as it already does for login.
  useEffect(() => {
    const handler = () => setPremium(hasActivePremium());
    window.addEventListener("agrointel-premium-change", handler);
    return () =>
      window.removeEventListener("agrointel-premium-change", handler);
  }, []);

  // Completely hidden when logged in or already premium
  if (user || premium) return null;

  if (dismissed) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        // BOTTOM_NAV_CLEAR_R201: raised from 96px to 155px so this card
        // doesn't overlap the scan button which protrudes ~22px above the
        // 64px nav bar. Also keeps it away from the AI voice FAB at right:18px.
        bottom: "calc(152px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 150,
        animation: "slide-up 0.4s ease",
        width: "min(280px, calc(100vw - 48px))",
        // Hide on very small screens — too much clutter
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--g3)",
          borderRadius: "14px",
          padding: "14px 18px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          maxWidth: "280px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "none",
            border: "none",
            color: "var(--t3)",
            cursor: "pointer",
            fontSize: "14px",
            padding: "4px",
          }}
        >
          ✕
        </button>
        <div style={{ marginBottom: "10px" }}>
          <div
            className="mono xs tg"
            style={{ letterSpacing: ".06em", marginBottom: "4px" }}
          >
            UNLOCK PREMIUM
          </div>
          <div className="sm" style={{ color: "var(--text)", lineHeight: 1.4 }}>
            Login to access AI Crop Planner, Profitability tools & more
          </div>
        </div>
        <button className="btn btn-g btn-sm w100" onClick={onLogin}>
          Login / Sign Up
        </button>
        <div style={{ marginTop: "8px", textAlign: "center" }}>
          <button
            onClick={onAccessCode || onLogin}
            style={{
              background: "none",
              border: "none",
              color: "var(--amber)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              letterSpacing: ".03em",
              textDecoration: "underline",
            }}
          >
            Have an access code? Tap here
          </button>
        </div>
      </div>
    </div>
  );
}
