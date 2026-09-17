export default function ConfRing({ pct, sev }) {
  const sevColor = (s) =>
    s === "None"
      ? "#4ade80"
      : s === "Severe"
        ? "#f87171"
        : s === "High"
          ? "#fbbf24"
          : "#4ade80";
  const r = 32,
    c = 2 * Math.PI * r,
    dash = (pct / 100) * c;
  const col = sevColor(sev);
  return (
    <div className="conf-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--b2)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .7s ease" }}
        />
      </svg>
      <div className="conf-center">
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "14px",
            fontWeight: 600,
            color: col,
          }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontSize: "8px",
            color: "var(--t3)",
            letterSpacing: ".05em",
            textTransform: "uppercase",
            marginTop: "1px",
          }}
        >
          conf
        </span>
      </div>
    </div>
  );
}
