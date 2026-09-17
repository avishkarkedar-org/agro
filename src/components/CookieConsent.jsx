import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { safeGetLS, safeSetLS } from "../utils/helpers";

// COOKIE_CONSENT_R151
// AgroIntel does not run ads or tracking cookies, but it does set a few
// functional ones (theme, language, the googtrans cookie from LangSwitcher's
// Google Translate integration) plus whatever Cloudflare Turnstile needs for
// its challenge. A short, dismiss-once notice is the honest, low-friction way
// to disclose that without pretending this is a full ad-tech consent stack.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (safeGetLS("agrointel_cookie_consent") !== "1") {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    safeSetLS("agrointel_cookie_consent", "1");
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fade-in cookie-consent-bar"
      style={{
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        zIndex: 650,
        maxWidth: "560px",
        margin: "0 auto",
        background: "var(--s1)",
        border: "1px solid var(--b1)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,.4))",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <p className="sm t2" style={{ lineHeight: 1.5, margin: 0 }}>
        We use essential cookies to run AgroIntel (theme, language, sign-in) and,
        if you translate the page, Google Translate's own cookie. We don't use
        advertising or tracking cookies.{" "}
        <Link to="/privacy" style={{ color: "var(--green)" }}>
          Learn more
        </Link>
        .
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-g btn-sm" onClick={accept}>
          Got it
        </button>
      </div>
    </div>
  );
}
