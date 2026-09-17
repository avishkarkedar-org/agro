import { useFocusTrap } from "../../hooks/useFocusTrap";

// APP_SHELL_SPLIT_R117 / ANNOUNCEMENT_DISMISS_R117
// Extracted from App.jsx.
//
// Shows the announcement an admin sets in the admin panel (settings.announcement,
// with an optional settings.ann_image). Reaches live visitors through
// SettingsContext, so it needs no deploy.
//
// ANNOUNCEMENT_DISMISS_R117 - all three close paths now call the SAME onDismiss.
// Previously the corner "x" persisted agrointel_ann_last while the primary
// "Acknowledge & Close" button and the Escape key did not, so the two routes a
// user is most likely to take left the announcement to reappear on every future
// visit. The dialog closed correctly in all three cases, which is why it looked
// fine - the defect only showed up on the NEXT load.
//
// R150 IMAGE_FIT: the image used object-fit:cover with a fixed 200px cap, which
// crops whatever does not fit that box - tall images lost their top/bottom,
// wide images lost their sides, so admins adding a link never actually saw the
// full picture they set. Switched to object-fit:contain with a generous
// viewport-relative max-height so the complete image is always visible at its
// real aspect ratio; the neutral background fills any letterboxed space instead
// of leaving it blank/transparent.
//
// Props:
//   announcement  the announcement text (non-empty; App guards on it)
//   annImage      optional image URL shown above the text
//   onDismiss     called by the x button, the Acknowledge button, and Escape.
//                 App's handler both closes the dialog and remembers this exact
//                 announcement string, so it is not shown again.
export default function AnnouncementModal({ announcement, annImage, onDismiss }) {
  // Constant `true` is correct here: this component is mounted only while the
  // dialog is open, so mount/unmount already expresses "active".
  const ref = useFocusTrap(true, onDismiss);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Official announcement"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--s1)",
          border: "var(--glass-border)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "450px",
          boxShadow: "var(--glass-shadow), var(--glass-inner)",
          animation: "pop-in .35s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "var(--glass-border)",
            background: "linear-gradient(90deg,var(--s2),rgba(146,64,14,0.15))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--amber)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ fontSize: "16px" }}>📢</span> Official Announcement
          </div>
          <button
            onClick={onDismiss}
            aria-label="Close announcement"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--t2)",
              fontSize: "18px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "24px 20px" }}>
          {annImage && (
            <img
              src={annImage}
              alt="Announcement"
              style={{
                display: "block",
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                background: "var(--s2)",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            />
          )}
          <p
            style={{
              fontSize: "15px",
              color: "var(--text)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {announcement}
          </p>
        </div>
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--b1)",
            textAlign: "right",
          }}
        >
          <button
            className="btn btn-o"
            style={{
              borderColor: "var(--amber)",
              color: "var(--amber)",
              padding: "10px 20px",
            }}
            onClick={onDismiss}
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
