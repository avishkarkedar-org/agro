import { useState } from "react";
import { safeSetLS } from "../utils/helpers";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";

export default function OnboardingTutorial({ onClose }) {
  const [step, setStep] = useState(0);
  // Persist the "seen" flag no matter how the tutorial is dismissed
  // (finish button, skip, backdrop click, or Escape) so it never reappears.
  const finish = () => {
    safeSetLS("agrointel_onboarded", "1");
    onClose();
  };
  const dialogRef = useFocusTrap(true, finish);
  const steps = [
    {
      emoji: "\ud83c\udf3e",
      title: "Welcome to AgroIntel!",
      desc: "Your AI-powered farming assistant. Let us show you around.",
    },
    {
      emoji: "\ud83d\udd2c",
      title: "Scan Plant Diseases",
      desc: "Take a photo of any sick plant leaf. Our AI identifies the disease and gives treatment in seconds.",
    },
    {
      emoji: "\ud83c\udf24",
      title: "Live Weather & Spray Window",
      desc: "15-day forecast with smart spray timing. Know exactly when to spray and when to wait.",
    },
    {
      emoji: "\ud83d\udcca",
      title: "Mandi Prices & Profitability",
      desc: "Live market prices with buy/sell signals. Calculate your expected profit before planting.",
    },
    {
      emoji: "\ud83c\udf3e",
      title: "Community & More",
      desc: "Ask questions, share knowledge, check government schemes, and plan your entire season.",
    },
  ];
  const s = steps[step];
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tutorial"
      className="modal-overlay fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        className="card"
        style={{
          width: "90%",
          maxWidth: "370px",
          padding: "0",
          textAlign: "center",
          borderRadius: "28px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "34px 24px 26px",
            background:
              "radial-gradient(circle at 50% 0%, rgba(34,197,94,0.22), transparent 70%)",
          }}
        >
          <div
            style={{
              width: "86px",
              height: "86px",
              margin: "0 auto 18px",
              borderRadius: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "44px",
              background:
                "linear-gradient(145deg, var(--green), var(--g3, #15803d))",
              boxShadow: "0 14px 34px rgba(34,197,94,0.4)",
              animation: "bounce 2s infinite",
            }}
          >
            {s.emoji}
          </div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 800,
              marginBottom: "10px",
              color: "var(--text)",
            }}
          >
            {s.title}
          </h3>
          <p
            className="sm t2"
            style={{
              lineHeight: 1.55,
              fontSize: "14px",
              margin: "0 auto",
              maxWidth: "280px",
            }}
          >
            {s.desc}
          </p>
        </div>
        <div style={{ padding: "0 24px 26px" }}>
          <div className="flex gap1 jcc mb4">
            {steps.map((_, i) => (
              <div
                key={i}
                role="presentation"
                style={{
                  width: i === step ? "22px" : "6px",
                  height: "6px",
                  borderRadius: "999px",
                  background: i === step ? "var(--green)" : "var(--b2)",
                  transition: "all .25s",
                }}
                aria-current={i === step ? "step" : undefined}
              />
            ))}
          </div>
          <div className="flex gap2 jcc">
            {step > 0 && (
              <button
                className="btn btn-o btn-sm"
                onClick={() => setStep(step - 1)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                className="btn btn-g btn-sm"
                onClick={() => setStep(step + 1)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                Next <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="btn btn-g btn-sm"
                onClick={finish}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Rocket size={15} /> Start Farming!
              </button>
            )}
          </div>
          <button
            onClick={finish}
            style={{
              background: "none",
              border: "none",
              color: "var(--t3)",
              fontSize: "11px",
              cursor: "pointer",
              marginTop: "14px",
            }}
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
