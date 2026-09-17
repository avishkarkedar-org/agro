import { useFocusTrap } from "../../hooks/useFocusTrap";

// APP_SHELL_SPLIT_R117
// Extracted from App.jsx.
//
// Shown when the service worker reports a new build is waiting (needRefresh from
// useRegisterSW). "Update Now" activates the waiting worker and reloads; the
// short delay before reload gives skipWaiting a moment to take effect.
//
// Props:
//   onLater   dismiss without updating; also the Escape handler
//   onUpdate  activate the new service worker and reload
export default function UpdatePrompt({ onLater, onUpdate }) {
  // Mounted only while an update is pending, so a constant `true` is correct.
  const ref = useFocusTrap(true, onLater);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="App update available"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "ksvFade 0.3s ease forwards",
      }}
    >
      <div
        style={{
          background: "var(--s1)",
          border: "var(--glass-border)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "400px",
          padding: "28px 24px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5), var(--glass-inner)",
          animation: "ksvPop 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        <div
          style={{
            fontSize: "52px",
            marginBottom: "16px",
            animation: "ksvDot 2s infinite",
          }}
        >
          ✨
        </div>
        <h2
          style={{
            color: "var(--green)",
            marginBottom: "12px",
            fontSize: "24px",
            fontWeight: "800",
          }}
        >
          Update Available!
        </h2>
        <p className="t2" style={{ marginBottom: "28px", lineHeight: 1.6 }}>
          A new version of AgroIntel is ready. Update now to access the latest
          features and UI improvements!
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            className="btn btn-o"
            onClick={onLater}
            style={{ flex: 1, padding: "12px" }}
          >
            Later
          </button>
          <button
            className="btn btn-g"
            onClick={onUpdate}
            style={{ flex: 1, padding: "12px" }}
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}
