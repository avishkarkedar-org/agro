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

    const host = window.location.hostname;
    const parts = host.split(".");
    const domains = [];
    if (parts.length === 1 || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      domains.push(host);
    } else {
      for (let i = 0; i < parts.length - 1; i++) {
        const d = parts.slice(i).join(".");
        domains.push(d);
        domains.push(`.${d}`);
      }
    }

    if (langCode === "en") {
      domains.forEach((d) => {
        document.cookie = `googtrans=; path=/; domain=${d}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      });
      // eslint-disable-next-line react-hooks/immutability
      document.cookie =
        "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    } else {
      domains.forEach((d) => {
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${d}`;
      });
      // eslint-disable-next-line react-hooks/immutability
      document.cookie = `googtrans=/en/${langCode}; path=/`;
    }

    // Force a hard reload to ensure Google Translate script reads the new cookie
    window.location.reload();
  }

  useEffect(() => {
    const saved = safeGetLS("agrointel_lang", "en");

    // Sync the cookie state on load with whatever is in localStorage
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
    };

    const currentCookie = getCookie("googtrans");
    const expectedCookie = saved === "en" ? "" : `/en/${saved}`;

    if (saved && saved !== "en" && currentCookie !== expectedCookie) {
      const host = window.location.hostname;
      const parts = host.split(".");
      const domains = [];
      if (parts.length === 1 || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        domains.push(host);
      } else {
        for (let i = 0; i < parts.length - 1; i++) {
          const d = parts.slice(i).join(".");
          domains.push(d);
          domains.push(`.${d}`);
        }
      }
      domains.forEach((d) => {
        document.cookie = `googtrans=/en/${saved}; path=/; domain=${d}`;
      });
      document.cookie = `googtrans=/en/${saved}; path=/`;
    } else if (saved === "en" && currentCookie) {
      const host = window.location.hostname;
      const parts = host.split(".");
      const domains = [];
      if (parts.length === 1 || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        domains.push(host);
      } else {
        for (let i = 0; i < parts.length - 1; i++) {
          const d = parts.slice(i).join(".");
          domains.push(d);
          domains.push(`.${d}`);
        }
      }
      domains.forEach((d) => {
        document.cookie = `googtrans=; path=/; domain=${d}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      });
      document.cookie =
        "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
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
      setTimeout(trySwitch, 1000);
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
