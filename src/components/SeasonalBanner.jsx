export default function SeasonalBanner() {
  const month = new Date().getMonth() + 1;
  let season, info, gradient, emoji;
  if (month >= 6 && month <= 10) {
    season = "Kharif";
    emoji = "🌧️";
    info =
      "Kharif Season — Focus: Rice, Cotton, Soybean, Maize. Key: Monitor monsoon, pest alerts active.";
    gradient =
      "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(96,165,250,0.08))";
  } else if (month >= 11 || month <= 2) {
    season = "Rabi";
    emoji = "❄️";
    info =
      "Rabi Season — Focus: Wheat, Gram, Mustard. Key: Irrigation critical, frost watch.";
    gradient =
      "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(192,132,252,0.08))";
  } else {
    season = "Zaid";
    emoji = "☀️";
    info =
      "Summer/Zaid — Focus: Watermelon, Cucumber, Moong. Key: Heat management, water conservation.";
    gradient =
      "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(248,113,113,0.08))";
  }
  return (
    <div
      style={{
        background: gradient,
        border: "1px solid var(--b1)",
        borderRadius: "12px",
        padding: "10px 12px",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: "22px", flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="mono xs tg"
          style={{ letterSpacing: ".08em", marginBottom: "2px" }}
        >
          {season.toUpperCase()} SEASON
        </div>
        <div className="xs t2" style={{ lineHeight: 1.4 }}>
          {info}
        </div>
      </div>
    </div>
  );
}
