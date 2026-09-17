export default function DailyTip() {
  const TIPS = [
    "🌱 January: Prepare nursery beds for Rabi vegetables. Apply FYM to fields before plowing.",
    "🌾 February: Monitor wheat for rust. Apply propiconazole (Tilt 25EC) at first sign.",
    "💧 March: Start summer plowing to kill hibernating pests. Plan drip irrigation setup.",
    "☀️ April: Sow summer moong/groundnut. Mulch fruit trees to conserve soil moisture.",
    "🌧️ May: Prepare Kharif seeds. Treat seeds with Thiram/Carbendazim before monsoon sowing.",
    "🌱 June: Sow Kharif crops with first good rain. Apply basal fertilizer at sowing time.",
    "🐛 July: Scout for stem borers in rice. Install pheromone traps in cotton fields.",
    "💚 August: Top-dress nitrogen in cereals. Watch for fungal diseases in humid weather.",
    "🌾 September: Harvest early Kharif pulses. Prepare fields for Rabi season ahead.",
    "🌿 October: Sow Rabi wheat/gram/mustard. Apply pre-emergence herbicides within 3 days.",
    "❄️ November: Irrigate wheat at crown root stage (21 days). Protect nurseries from frost.",
    "📦 December: Harvest sugarcane. Store grains in airtight bins with neem leaves.",
  ];
  const month = new Date().getMonth();
  return (
    <div style={{ margin: "0 auto", maxWidth: "100%", padding: "0 8px" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#065f46,#047857,#059669)",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "12px",
          border: "1px solid rgba(74,222,128,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 4px 12px rgba(5,150,105,0.2)",
        }}
      >
        <span style={{ flexShrink: 0, display: "flex" }} aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/>
            <path d="M9 18h6"/>
            <path d="M10 22h4"/>
          </svg>
        </span>
        <div>
          <div
            className="mono"
            style={{
              fontSize: "9px",
              color: "rgba(255,255,255,0.7)",
              letterSpacing: ".08em",
              marginBottom: "3px",
            }}
          >
            DAILY FARMING TIP
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "13px",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {TIPS[month]}
          </div>
        </div>
      </div>
    </div>
  );
}
