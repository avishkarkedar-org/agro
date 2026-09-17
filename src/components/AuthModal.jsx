import { useState, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { safeSetLS } from "../utils/helpers";
import { API } from "../context/SettingsContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

/*
  AUTH_A11Y_R130 - accessibility of the login / signup dialog.

  This file used to hand-roll its own focus trap: a useEffect that queried
  'input, button, select, textarea, [tabindex]' once per mode and cycled Tab
  itself. hooks/useFocusTrap.js already existed and does it properly, so the
  local copy was both duplication and a downgrade:

    - it omitted a[href], leaving the Terms / Privacy links in the consent
      box unreachable by keyboard;
    - it cached the focusable list, which goes stale every time a button
      flips disabled (loading, turnstileToken);
    - it listened on the modal node, so Escape was dead whenever focus had
      already left the dialog.

  The box also had no role="dialog" / aria-modal, so a screen reader
  announced a plain <div>.

  One deliberate subtlety: the hook is passed `mode`, not `true`. Its effect
  keys on that argument, so passing the mode reproduces the old [mode]
  dependency - switching login -> signup re-focuses the top of the new form
  instead of stranding focus on a control that just unmounted. Every mode
  string is truthy, so the trap is always active while mounted.
*/

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'otp' | 'forgot' | 'reset'
  const [identifier, setIdentifier] = useState(""); // username or email for login
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [otp, setOtp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  useEffect(() => setTurnstileToken(""), [mode]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [touchY, setTouchY] = useState(null);

  // AUTH_A11Y_R130: shared focus trap + Escape handling. See header note for
  // why the argument is `mode` rather than `true`.
  const modalRef = useFocusTrap(mode, onClose);

  const handleTouchStart = (e) => setTouchY(e.touches[0].clientY);
  const handleTouchEnd = (e) => {
    if (touchY === null) return;
    if (e.changedTouches[0].clientY - touchY > 80) onClose();
    setTouchY(null);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErr("Please fill all fields.");
      return;
    }
    if (!acceptedTerms) {
      setErr("You must accept the Terms and Privacy Policy.");
      return;
    }
    if (!turnstileToken) {
      setErr("Please complete the CAPTCHA.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim(),
          turnstile_token: turnstileToken,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Login failed");
      // Save user info. IMPORTANT: store the real Supabase access token
      // (returned under `token`) so authenticated requests can send it as a
      // Bearer token. Never use the email as a credential.
      safeSetLS("agrointel_user", d.user);
      safeSetLS("agrointel_username", d.username || d.user.split("@")[0]);
      if (d.token) {
        safeSetLS("agrointel_token", d.token);
      }
      window.dispatchEvent(new CustomEvent("agrointel-auth-change"));
      if (onSuccess) onSuccess(d.user);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setErr("Please fill all fields.");
      return;
    }
    if (password !== confirmPass) {
      setErr("Passwords do not match.");
      return;
    }
    if (username.trim().length < 3) {
      setErr("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setErr("Username: only letters, numbers, underscores.");
      return;
    }
    const e = email.trim().toLowerCase();
    const basicEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!basicEmailOk) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: e,
          turnstile_token: turnstileToken,
          password: password.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Signup failed");
      setMsg("OTP sent to your email!");
      setMode("otp");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setErr("Please enter the OTP.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          otp: otp.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Verification failed");
      setMsg("Account created! You can now login.");
      setTimeout(() => {
        setMode("login");
        setMsg("");
        setErr("");
      }, 2000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(
        `${API}/api/auth/resend-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`,
        { method: "POST" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Resend failed");
      setMsg("New OTP sent!");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const forgotEmail = (identifier.trim() || email.trim()).toLowerCase();
    if (!forgotEmail) {
      setErr("Enter your email first.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const r = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, turnstile_token: turnstileToken }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not send reset code.");
      setEmail(forgotEmail);
      setOtp("");
      setPassword("");
      setConfirmPass("");
      setMsg(d.msg || "If that email is registered, a reset code has been sent.");
      setMode("reset");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.trim().length !== 6) {
      setErr("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPass) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: (email.trim() || identifier.trim()).toLowerCase(),
          otp: otp.trim(),
          new_password: password.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Reset failed.");
      setMsg("Password reset! You can now login.");
      setTimeout(() => {
        setMode("login");
        setMsg("");
        setErr("");
        setOtp("");
        setPassword("");
        setConfirmPass("");
      }, 1800);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const HEAD = {
    login: ["Welcome back", "Log in to access your saved tools and premium features."],
    signup: ["Create your account", "Join AgroIntel to unlock AI planning & profitability tools."],
    otp: ["Verify your email", "Enter the 6-digit code we just emailed you."],
    forgot: ["Reset your password", "We'll email you a 6-digit reset code."],
    reset: ["Set a new password", "Enter your reset code and choose a new password."],
  };
  const [headTitle, headSub] = HEAD[mode] || HEAD.login;

  return (
    <div
      className="modal-overlay fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .auth-card { text-align: left; }
        .auth-head-eyebrow {
          font-family: var(--sans);
          font-size: 11px; font-weight: 700;
          letter-spacing: .14em; text-transform: uppercase;
          color: var(--green); margin-bottom: 6px;
        }
        .auth-head-title {
          font-family: var(--serif); font-size: 21px; font-weight: 700;
          line-height: 1.15; color: var(--text); margin: 0;
        }
        .auth-head-sub {
          font-size: 13px; color: var(--t2); margin-top: 6px; line-height: 1.5;
        }
        .auth-field-label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--t2); margin: 0 0 6px; letter-spacing: .01em;
        }
        .auth-card .input { width: 100%; }
        .auth-terms {
          display: flex; align-items: flex-start; gap: 10px;
          background: var(--clay-surface-2); border: 1px solid var(--line);
          border-radius: var(--r-sm, 12px); padding: 12px 14px; text-align: left;
        }
        .auth-terms label { margin: 0; font-size: 12.5px; color: var(--t2); cursor: pointer; line-height: 1.45; }
        .auth-terms input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--green); cursor: pointer; flex-shrink: 0; margin-top: 1px; }
        .auth-divider { height: 1px; background: var(--line); margin: 2px 0 16px; border: 0; }
        .auth-link { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--green); padding: 4px 2px; }
        .auth-link.muted { color: var(--t2); font-weight: 500; }
        .auth-link.amber { color: var(--amber); font-family: var(--mono); font-size: 11px; }
        .auth-link:hover { text-decoration: underline; }
      `}</style>
      <div
        ref={modalRef}
        className="card auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-sub"
        style={{
          width: "90%",
          maxWidth: "420px",
          padding: "24px",
          animation: "modal-in 0.22s ease",
        }}
      >
        <div className="flex jcb" style={{ alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div className="auth-head-eyebrow">AgroIntel Account</div>
            <h3 className="auth-head-title" id="auth-modal-title">{headTitle}</h3>
            <div className="auth-head-sub" id="auth-modal-sub">{headSub}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close login modal">
            ✕
          </button>
        </div>

        {err && (
          <div
            className="xs mb2"
            role="alert"
            style={{
              padding: "8px 12px",
              background: "var(--rdim)",
              border: "1px solid #7f1d1d",
              borderRadius: "8px",
              color: "var(--red)",
            }}
          >
            {err}
          </div>
        )}
        {msg && (
          <div
            className="xs mb2"
            role="status"
            style={{
              padding: "8px 12px",
              background: "var(--gdim)",
              border: "1px solid var(--g3)",
              borderRadius: "8px",
              color: "var(--green)",
            }}
          >
            {msg}
          </div>
        )}

        {mode === "login" && (
          <div>
            <label className="auth-field-label">Username or Email</label>
            <input
              className="input mb2"
              placeholder="e.g. farmer123 or you@gmail.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />
            <label className="auth-field-label">Password</label>
            <input
              className="input mb2"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />

            <div className="auth-terms mb2">
              <input
                type="checkbox"
                id="termsCheck"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="termsCheck">
                I agree to the <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>Terms</a> & <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>Privacy Policy</a>.
              </label>
            </div>

            <div className="mb2" style={{ display: "flex", justifyContent: "center" }}>
              <Turnstile 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                onSuccess={(token) => setTurnstileToken(token)} 
                options={{ theme: "auto" }}
              />
            </div>

            <button
              className="btn btn-g w100 mb2"
              onClick={handleLogin}
              disabled={loading || !acceptedTerms || !turnstileToken}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <hr className="auth-divider" />
            <div className="flex jcb aic">
              <button
                className="auth-link amber"
                onClick={() => {
                  setMode("forgot");
                  setErr("");
                  setMsg("");
                }}
              >
                Forgot password?
              </button>
              <button
                className="auth-link"
                onClick={() => {
                  setMode("signup");
                  setErr("");
                  setMsg("");
                }}
              >
                Create account →
              </button>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label className="auth-field-label">Username</label>
            <input
              className="input mb2"
              placeholder="e.g. farmer_raj (letters, numbers, _)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />
            <label className="auth-field-label">Email</label>
            <input
              className="input mb2"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="auth-field-label">Password</label>
            <input
              className="input mb2"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="auth-field-label">Confirm Password</label>
            <input
              className="input mb2"
              type="password"
              placeholder="Re-enter password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSignup();
              }}
            />
            <div className="auth-terms mb2">
              <input
                type="checkbox"
                id="termsCheckSignup"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="termsCheckSignup">
                I agree to the <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>Terms</a> & <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "none" }}>Privacy Policy</a>.
              </label>
            </div>

            <div className="mb2" style={{ display: "flex", justifyContent: "center" }}>
              <Turnstile 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                onSuccess={(token) => setTurnstileToken(token)} 
                options={{ theme: "auto" }}
              />
            </div>

            <button
              className="btn btn-g w100 mb2"
              onClick={handleSignup}
              disabled={loading || !acceptedTerms || !turnstileToken}
            >
              {loading ? "Sending OTP..." : "Sign Up & Verify"}
            </button>
            <hr className="auth-divider" />
            <div className="tc">
              <button
                className="auth-link"
                onClick={() => {
                  setMode("login");
                  setErr("");
                  setMsg("");
                }}
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        )}

        {mode === "otp" && (
          <div>
            <label className="auth-field-label">Enter OTP</label>
            <input
              className="input mb2"
              placeholder="123456"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              style={{
                textAlign: "center",
                fontSize: "20px",
                letterSpacing: "6px",
                fontWeight: 700,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifyOTP();
              }}
            />
            <button
              className="btn btn-g w100 mb2"
              onClick={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <hr className="auth-divider" />
            <div className="flex jcb aic">
              <button
                className="auth-link amber"
                onClick={handleResendOTP}
                disabled={loading}
              >
                Resend OTP
              </button>
              <button
                className="auth-link muted"
                onClick={() => {
                  setMode("signup");
                  setErr("");
                  setMsg("");
                }}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {mode === "forgot" && (
          <div>
            <label className="auth-field-label">Email</label>
            <input
              className="input mb2"
              type="email"
              placeholder="you@gmail.com"
              value={identifier || email}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <div className="mb2" style={{ display: "flex", justifyContent: "center" }}>
              <Turnstile 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                onSuccess={(token) => setTurnstileToken(token)} 
                options={{ theme: "auto" }}
              />
            </div>

            <button
              className="btn btn-g w100 mb2"
              onClick={handleForgotPassword}
              disabled={loading || !turnstileToken}
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
            <hr className="auth-divider" />
            <div className="tc">
              <button
                className="auth-link"
                onClick={() => {
                  setMode("login");
                  setErr("");
                  setMsg("");
                }}
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}

        {mode === "reset" && (
          <div>
            <label className="auth-field-label">Reset Code</label>
            <input
              className="input mb2"
              placeholder="123456"
              value={otp}
              maxLength={6}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <label className="auth-field-label">New Password</label>
            <input
              className="input mb2"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="auth-field-label">Confirm New Password</label>
            <input
              className="input mb2"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResetPassword();
              }}
            />
            <button
              className="btn btn-g w100 mb2"
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <hr className="auth-divider" />
            <div className="tc">
              <button
                className="auth-link"
                onClick={() => {
                  setMode("login");
                  setErr("");
                  setMsg("");
                }}
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
