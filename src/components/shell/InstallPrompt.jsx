// APP_SHELL_SPLIT_R117
// Extracted from App.jsx.
//
// A one-time, dismissible card offering to install the PWA. It is NOT a
// permanent header button - App shows it ~1.5s after `beforeinstallprompt`
// fires, and only when the user has not dismissed it on a previous visit
// (localStorage agrointel_install_dismissed).
//
// Props:
//   onInstall  trigger the browser's install prompt, then hide this card
//   onDismiss  hide the card and remember the dismissal
export default function InstallPrompt({ onInstall, onDismiss }) {
  return (
    <div
      role="dialog"
      aria-label="Install AgroIntel app"
      className="install-prompt"
      style={{
        position: "fixed",
        left: "16px",
        bottom: "calc(96px + env(safe-area-inset-bottom))",
        zIndex: 620,
        width: "calc(100% - 32px)",
        maxWidth: "360px",
        background: "var(--clay-surface, var(--s1))",
        border: "1px solid var(--line)",
        borderRadius: "16px",
        boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
        padding: "14px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        animation: "pop-in .3s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "12px",
          flexShrink: 0,
          background: "linear-gradient(135deg,var(--g3),var(--g2))",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "14px",
            color: "var(--text)",
            marginBottom: "2px",
          }}
        >
          Install AgroIntel
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--t2)",
            lineHeight: 1.45,
            marginBottom: "10px",
          }}
        >
          Add the app to your home screen for faster access and offline use.
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-g btn-sm"
            onClick={onInstall}
            style={{ padding: "7px 16px" }}
          >
            Install
          </button>
          <button
            className="btn btn-o btn-sm"
            onClick={onDismiss}
            style={{ padding: "7px 14px" }}
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--t3)",
          padding: "2px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}
