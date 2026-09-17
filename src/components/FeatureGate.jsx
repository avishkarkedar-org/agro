import { useState, useEffect } from "react";
import { safeGetLS } from "../utils/helpers";

export default function FeatureGate({
  children,
  tier = "standard",
  featureName = "",
}) {
  const getValidPremium = () => {
    try {
      const p = JSON.parse(safeGetLS("agrointel_premium") || "null");
      if (!p) return null;
      // Check 30-min session expiry for access code users
      if (p.session_expires && Date.now() > p.session_expires) {
        if (typeof window !== "undefined") window.localStorage.removeItem("agrointel_premium");
        return null;
      }
      // Check code expiry date
      const expires = new Date(p.expires_at);
      if (expires < new Date()) {
        if (typeof window !== "undefined") window.localStorage.removeItem("agrointel_premium");
        return null;
      }
      return p;
    } catch {
      return null;
    }
  };

  const [premium, setPremium] = useState(getValidPremium);

  useEffect(() => {
    const handlePremiumChange = () => setPremium(getValidPremium());
    window.addEventListener("agrointel-premium-change", handlePremiumChange);
    return () => window.removeEventListener("agrointel-premium-change", handlePremiumChange);
  }, []);

  const hasAccess =
    premium &&
    (tier === "standard" || (tier === "premium" && premium.tier === "premium"));
  if (hasAccess) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(3px)", opacity: 0.4, pointerEvents: "none" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
          borderRadius: "14px",
          backdropFilter: "blur(2px)",
        }}
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔒</div>
          <div className="sm bold mb1">Premium Feature</div>
          <div className="xs t2 mb2">
            {featureName || "This feature"} requires an access code
          </div>
          <button
            className="btn btn-g btn-sm"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-access-code"))
            }
          >
            Unlock with Access Code
          </button>
        </div>
      </div>
    </div>
  );
}
