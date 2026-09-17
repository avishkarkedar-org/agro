import React, { useState, useEffect } from "react";
import { API } from "../context/SettingsContext";
import { safeGetLS } from "../utils/helpers";
import { User, MapPin, LogOut, Save, X } from "lucide-react";

/* R98.1 STRUCTURE FIX - same defect as SettingsModal (R98).
 * This dialog rendered <div className="modal pf-modal">. `.modal` is a
 * FULLSCREEN OVERLAY in global.css (position:fixed; inset:0; display:flex;
 * align-items:center; justify-content:center), not a dialog box.
 * The injected `.pf-modal` rule below only ever set max-width, padding and
 * text-align - it did NOT override position, inset or display - so all of
 * `.modal`'s layout still applied. Result: the close button, eyebrow,
 * title and the fields column were laid out as SIBLINGS IN A ROW inside a
 * viewport-height box pinned to the left edge.
 * `.modal-content` is the correct box class (width:100%; max-width:440px;
 * position:relative). `.pf-modal` still narrows it to 420px, because an
 * injected <style> lands after imported CSS and wins at equal specificity.
 * This also enables the <=600px bottom-sheet rules, which target
 * `.modal-content` and therefore never matched here before.
 */
export default function ProfileModal({ onClose, onLogout }) {
  const [profile, setProfile] = useState({ name: "", village: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Use the real Supabase access token (stored at login), NOT the email.
    const token = safeGetLS("agrointel_token");
    if (!token) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Please log in again to view your profile." }));
      setLoading(false);
      onClose();
      return;
    }
    fetch(`${API}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setProfile({ name: data.name || "", village: data.village || "", email: data.email || "" });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [onClose]);

  // Escape to dismiss, matching SettingsModal.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    const token = safeGetLS("agrointel_token");
    if (!token) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Please log in again." }));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: profile.name, village: profile.village })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: "Profile saved successfully!" }));
        onClose();
      } else {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: data.detail || "Error saving profile" }));
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Network error" }));
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay open">
      <style>{`
        .pf-modal { max-width: 420px; padding: 26px 24px; text-align: left; }
        .pf-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--green); margin-bottom: 6px; padding-right: 40px; }
        .pf-title { font-family: var(--serif); font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 20px; padding-right: 40px; }
        .pf-label { font-size: 11px; color: var(--t3); text-transform: uppercase; letter-spacing: .08em; display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
        .pf-readonly { padding: 11px 14px; background: var(--clay-surface-2); border: 1px solid var(--line); border-radius: var(--r-sm, 8px); color: var(--t2); font-size: 14px; }
      `}</style>
      <div
        className="modal-content pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* .modal-content is position:relative, so the close button leaves
            the flow instead of competing with the heading. */}
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close profile"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
        >
          <X size={20} />
        </button>
        <div className="pf-eyebrow">AgroIntel Account</div>
        <h2 className="pf-title" id="profile-modal-title">My Profile</h2>

        {loading ? (
          <p className="t3" style={{ fontSize: 14 }}>Loading your profile...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="pf-label">Email</label>
              <div className="pf-readonly">{profile.email || "\u2014"}</div>
            </div>
            <div>
              <label className="pf-label"><User size={13} /> Full Name</label>
              <input
                className="input"
                type="text"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                placeholder="Enter your name"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="pf-label"><MapPin size={13} /> Village / Location</label>
              <input
                className="input"
                type="text"
                value={profile.village}
                onChange={e => setProfile({...profile, village: e.target.value})}
                placeholder="Enter your village name"
                style={{ width: "100%" }}
              />
            </div>

            <button
              className="btn btn-g w100"
              onClick={handleSave}
              disabled={saving}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 }}
            >
              <Save size={17} /> {saving ? "Saving..." : "Save Changes"}
            </button>

            <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "6px 0" }} />

            <button
              onClick={onLogout}
              className="btn w100"
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "var(--rdim)", color: "var(--red)", border: "1px solid var(--red)" }}
            >
              <LogOut size={17} /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
