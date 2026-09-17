import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";

/* SCHEDULED_MAINTENANCE_BANNER_R152
 * MaintenanceScheduler.jsx (admin panel) lets an admin set a future
 * maintenance window with a message. Until now nothing on the website ever
 * showed it in advance - visitors only found out once maintenance_mode
 * flipped true and the whole app was replaced by MaintenanceScreen. This
 * gives a heads-up so a scan or purchase is not interrupted without warning.
 * Shown only for a window starting within the next 48 hours (or already in
 * progress, in case check_maintenance_mode has not yet flipped
 * maintenance_mode itself), and only until dismissed for that window. */
const DISMISS_KEY_PREFIX = "agrointel_maint_notice_dismissed_";
const ADVANCE_WINDOW_MS = 48 * 60 * 60 * 1000;

export default function ScheduledMaintenanceBanner() {
  const { settings, loaded } = useSettings();
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const sched = settings?.maintenance_schedule;
  const start = sched?.start ? new Date(sched.start) : null;
  const end = sched?.end ? new Date(sched.end) : null;
  const dismissKey = start && !Number.isNaN(start.getTime()) ? DISMISS_KEY_PREFIX + start.getTime() : null;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {}
  }, [dismissKey]);

  if (!loaded || settings?.maintenance_mode) return null;
  if (!start || !end || dismissed) return null;

  const startMs = start.getTime();
  const endMs = end.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

  if (now >= startMs || now > endMs) return null;
  if (now < startMs - ADVANCE_WINDOW_MS) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      if (dismissKey) localStorage.setItem(dismissKey, "1");
    } catch {}
  };

  const label = `Upcoming maintenance (${start.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}): `;

  return (
    <div
      role="status"
      style={{
        background: "var(--adim)",
        borderBottom: "1px solid var(--amber)",
        color: "var(--amber)",
        padding: "8px 14px",
        fontSize: "12.5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        textAlign: "center",
        flexWrap: "wrap",
      }}
    >
      <span>
        <strong>{label}</strong>
        {sched.message || "AgroIntel will be briefly unavailable."}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss maintenance notice"
        style={{
          background: "none",
          border: "1px solid var(--amber)",
          color: "var(--amber)",
          borderRadius: "6px",
          padding: "2px 8px",
          fontSize: "11px",
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
