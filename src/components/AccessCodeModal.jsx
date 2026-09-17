import { useState } from "react";
import { safeSetLS } from "../utils/helpers";
import { API } from "../context/SettingsContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function AccessCodeModal({ onClose, userEmail }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [touchY, setTouchY] = useState(null);
  const trapRef = useFocusTrap(true, () => onClose(false));

  const handleTouchStart = (e) => setTouchY(e.touches[0].clientY);
  const handleTouchEnd = (e) => {
    if (touchY === null) return;
    if (e.changedTouches[0].clientY - touchY > 80) onClose(false);
    setTouchY(null);
  };

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const r = await fetch(`${API}/api/auth/validate-access-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email: userEmail || "" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Invalid code");
      safeSetLS(
        "agrointel_premium",
        JSON.stringify({
          tier: d.tier,
          expires_at: d.expires_at,
          activated: Date.now(),
          session_expires: Date.now() + 30 * 60 * 1000,
        }),
      );
      setMsg(d.msg || "Access code activated!");
      window.dispatchEvent(new CustomEvent("agrointel-premium-change"));
      setTimeout(() => onClose(true), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* R99 CLOSE-BUTTON FIX
        * The X was previously rendered inside the inner flex column with
        * style={{ position:"absolute", top:"-10px", right:"-10px" }}. Those
        * negative offsets push it outside the box, and ds-components.css sets
        * `.card { overflow: hidden !important }` - so the button was CLIPPED
        * AWAY completely. The only way to dismiss this dialog was clicking the
        * backdrop or swiping down, neither of which is discoverable.
        *
        * It is now a direct child of the box with positive offsets, and the box
        * declares position:relative explicitly rather than relying on .card
        * doing so. Per the modal contract in CONTEXT.md section 2,
        * `.modal-close` carries no positioning of its own - the dialog must
        * position it - and the heading reserves padding so it cannot run under
        * the button.
        */}
      <div
        ref={trapRef}
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-code-title"
        style={{
          width: "90%",
          maxWidth: "380px",
          padding: "24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          className="modal-close"
          style={{ position: "absolute", top: "12px", right: "12px" }}
          onClick={() => onClose(false)}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="flex jcc aic mb3" style={{ flexDirection: "column", gap: "10px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "linear-gradient(135deg, var(--green), #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
            color: "white"
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 id="access-code-title" style={{ fontSize: "18px", fontWeight: 900, padding: "0 28px" }}>
            Unlock Premium Access
          </h3>
        </div>
        <p className="xs t2 mb3" style={{ lineHeight: 1.5 }}>
          Enter the access code provided by your KVK, FPO, or admin to unlock
          premium features.
        </p>
        <input
          className="input mb2"
          placeholder="e.g. KRISHI2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={20}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && code.trim()) submit();
          }}
          style={{
            textAlign: "center",
            fontSize: "16px",
            letterSpacing: "2px",
            fontWeight: 700,
          }}
        />
        {err && (
          <div
            className="xs tr mb2"
            role="alert"
            style={{
              padding: "8px",
              background: "var(--rdim)",
              borderRadius: "6px",
            }}
          >
            {err}
          </div>
        )}
        {msg && (
          <div
            className="xs tg mb2"
            role="status"
            style={{
              padding: "8px",
              background: "var(--gdim)",
              borderRadius: "6px",
            }}
          >
            {msg}
          </div>
        )}
        <button
          className="btn btn-g w100"
          onClick={submit}
          disabled={loading || !code.trim()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {loading ? (
            "Validating..."
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Activate Code
            </>
          )}
        </button>
        <div className="xs t3 tc mt2">
          Codes are case-insensitive. Contact your local KVK for codes.
        </div>
      </div>
    </div>
  );
}
