import React, { useState, useEffect } from "react";
import { API } from "../context/SettingsContext";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import { Settings, X, Globe, Bell, Trash2, AlertTriangle } from "lucide-react";

/* R98 STRUCTURE FIX
 * This dialog previously rendered <div className="modal"> as its box.
 * `.modal` is NOT a dialog class - global.css defines it as a fullscreen
 * overlay: position:fixed; inset:0; display:flex; align-items:center;
 * justify-content:center. Consequences, both of which were visible:
 *   1. display:flex with the default row direction turned the close
 *      button, the <h2> and the cards wrapper into SIBLINGS IN A ROW,
 *      so "Settings" collided with the X.
 *   2. position:fixed + inset:0 with an inline maxWidth:400 pinned the
 *      box to the left viewport edge at full height, so the three cards
 *      appeared to float loose over the page rather than forming a dialog.
 * The correct class for the box is `.modal-content` (width:100%;
 * max-width:440px; position:relative; overflow:hidden), which the design
 * system styles with surface, border, radius and shadow. Switching to it
 * also makes the <=600px bottom-sheet rules apply for the first time -
 * they target `.modal-content`, so they never matched before.
 */
export default function SettingsModal({ onClose, onLogout }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(
    () => safeGetLS("agrointel_notifications") !== "0",
  );

  // Escape to dismiss. Cheap, expected of any dialog, and it was missing.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDeleteAccount = async () => {
    // Use the real Supabase access token (stored at login), NOT the email.
    const token = safeGetLS("agrointel_token");
    if (!token) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Please log in again." }));
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/user/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: "Account deleted successfully." }));
        onLogout();
      } else {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: data.detail || "Error deleting account" }));
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Network error" }));
    }
    setDeleting(false);
  };

  const openLanguageMenu = () => {
    onClose();
    // Defer so the Settings overlay unmounts before we trigger the header
    // language dropdown button (class .lang-dropdown-btn in LangSwitcher).
    setTimeout(() => {
      const btn = document.querySelector(".lang-dropdown-btn");
      if (btn) btn.click();
    }, 80);
  };

  const toggleNotifications = (e) => {
    const on = e.target.checked;
    setNotifEnabled(on);
    safeSetLS("agrointel_notifications", on ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: on ? "Notifications enabled" : "Notifications disabled",
      }),
    );
  };

  return (
    <div className="modal-overlay open">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        style={{ maxWidth: 400, padding: 24, textAlign: "left" }}
      >
        {/* .modal-content is position:relative, so the close button can be
            absolutely positioned out of the flow instead of competing with
            the heading for space. */}
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close settings"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
        >
          <X size={20} />
        </button>
        <h2
          id="settings-modal-title"
          style={{ marginBottom: 20, paddingRight: 44, display: "flex", alignItems: "center", gap: 10, color: "var(--green)" }}
        >
          <Settings size={24} /> Settings
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ padding: 16, background: "var(--clay-surface-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontWeight: "bold" }}>
              <Globe size={18} color="var(--green)" /> Language Preferences
            </div>
            <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>Change your display language.</p>
            <button style={{ padding: "8px 16px", background: "rgba(74,222,128,0.15)", color: "var(--green)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, cursor: "pointer" }}
                    onClick={openLanguageMenu}>
              Change Language
            </button>
          </div>

          <div style={{ padding: 16, background: "var(--clay-surface-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontWeight: "bold" }}>
              <Bell size={18} color="var(--green)" /> Notification Preferences
            </div>
            <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>Manage push notifications and alerts.</p>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: 0, cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>Push Notifications</span>
              <input type="checkbox" checked={notifEnabled} onChange={toggleNotifications} style={{ accentColor: "var(--green)", width: 18, height: 18, cursor: "pointer" }} />
            </label>
          </div>

          <div style={{ padding: 16, background: "rgba(239,68,68,0.05)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontWeight: "bold", color: "var(--red)" }}>
              <Trash2 size={18} /> Danger Zone
            </div>
            <p style={{ fontSize: 13, color: "var(--red)", opacity: 0.8, marginBottom: 12 }}>
              Permanently delete your account and all associated data.
            </p>
            {!confirmDelete ? (
              <button 
                onClick={() => setConfirmDelete(true)}
                style={{ padding: "8px 16px", background: "transparent", color: "var(--red)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, cursor: "pointer", width: "100%" }}
              >
                Delete Account
              </button>
            ) : (
              <div style={{ background: "rgba(239,68,68,0.1)", padding: 12, borderRadius: 8 }}>
                <p style={{ fontSize: 13, marginBottom: 10, display: "flex", gap: 6, color: "var(--red)" }}>
                  <AlertTriangle size={16} /> Are you absolutely sure?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 8, background: "var(--clay-surface-2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1, padding: 8, background: "var(--red)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
