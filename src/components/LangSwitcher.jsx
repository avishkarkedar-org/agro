import { useState, useEffect, useRef } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";

export default function LangSwitcher() {
  const LANGS = [
    { code: "en", label: "English", short: "EN" },
    { code: "hi", label: "हिंदी", short: "HI" },
    { code: "mr", label: "मराठी", short: "MR" },
  ];
  const [active, setActive] = useState(() =>
    safeGetLS("agrointel_lang", "en"),
  );
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  function switchLang(langCode) {
    setActive(langCode);
    setOpen(false);
    safeSetLS("agrointel_lang", langCode);
    safeSetLS("krishi_scan_lang", langCode);
    safeSetLS("ks_voice_lang", langCode === "hi" ? "hi-IN" : langCode === "mr" ? "mr-IN" : "en-IN");

    // Broadcast language change to active components
    window.dispatchEvent(new CustomEvent("agrointel-lang-change", { detail: langCode }));

    const host = window.location.hostname;
    if (langCode === "en") {
      document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      if (host && host !== "localhost") {
        document.cookie = `googtrans=; path=/; domain=${host}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      }
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/`;
      if (host && host !== "localhost") {
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${host}`;
      }
    }

    // If Google Translate combo already exists, trigger it immediately
    const combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = langCode;
      combo.dispatchEvent(new Event("change"));
    }

    // Reload to ensure DOM and scripts apply language switch cleanly
    window.location.reload();
  }

  useEffect(() => {
    const saved = safeGetLS("agrointel_lang", "en");

    // Sync other language keys if missing
    if (saved && !safeGetLS("krishi_scan_lang")) {
      safeSetLS("krishi_scan_lang", saved);
    }
    if (saved && !safeGetLS("ks_voice_lang")) {
      safeSetLS("ks_voice_lang", saved === "hi" ? "hi-IN" : saved === "mr" ? "mr-IN" : "en-IN");
    }

    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
    };

    const currentCookie = getCookie("googtrans");
    const expectedCookie = saved === "en" ? "" : `/en/${saved}`;

    if (saved && saved !== "en" && currentCookie !== expectedCookie) {
      document.cookie = `googtrans=/en/${saved}; path=/`;
    } else if (saved === "en" && currentCookie) {
      document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    }

    if (saved && saved !== "en") {
      const trySwitch = () => {
        const combo = document.querySelector(".goog-te-combo");
        if (combo) {
          if (combo.value !== saved) {
            combo.value = saved;
            combo.dispatchEvent(new Event("change"));
          }
        } else {
          setTimeout(trySwitch, 500);
        }
      };
      setTimeout(trySwitch, 800);
    }
  }, []);

  const currentLang = LANGS.find((l) => l.code === active) || LANGS[0];

  return (
    <div
      className="lang-dropdown-container"
      ref={menuRef}
      style={{ position: "relative" }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch language"
        aria-expanded={open}
        className="lang-dropdown-btn notranslate"
      >
        <span>🌐</span> {currentLang.short} ▾
      </button>

      {open && (
        <div className="lang-menu fade-in">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`lang-option ${active === l.code ? "active" : ""}`}
              onClick={() => switchLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
