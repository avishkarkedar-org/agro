// APP_SHELL_SPLIT_R117
// Extracted verbatim from App.jsx, which was ~900 lines and therefore could not
// be rewritten at all (KL#15 - pushes truncate silently around 720-760 lines).
//
// Shown while `loadingBackend` is true: the /health and /api/news calls are in
// flight, with an 8 second ceiling so a sleeping Render backend cannot strand
// the user here.
//
// The <style> block below deliberately stays in this component rather than
// moving to redesign5.css:
//   * al-orb / al-ring / al-progress / loader-text / text-shimmer appear nowhere
//     else in the codebase, so there is nothing to deduplicate.
//   * A component-injected <style> lands AFTER the imported stylesheets and so
//     wins at equal specificity (KL#32). Moving these rules into a sheet would
//     change which declarations win.
//   * These rules matter for the first few seconds of a cold load only. Keeping
//     them here keeps them out of every other page's paint path.
export default function SplashScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 18% 20%, rgba(34,197,94,0.20), transparent 55%), radial-gradient(circle at 82% 82%, rgba(234,179,8,0.14), transparent 55%), var(--bg)",
      }}
    >
      <style>
        {`
          @keyframes al-float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.06); }
          }
          @keyframes al-ring {
            0% { transform: scale(0.55); opacity: 0.7; }
            100% { transform: scale(2.3); opacity: 0; }
          }
          @keyframes text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes al-bar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(360%); }
          }
          .al-orb-wrap {
            position: relative;
            width: 150px;
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 26px;
          }
          .al-ring {
            position: absolute;
            inset: 12px;
            border-radius: 50%;
            border: 2px solid rgba(34,197,94,0.5);
            animation: al-ring 2.8s ease-out infinite;
          }
          .al-ring.d2 { animation-delay: 0.95s; }
          .al-ring.d3 { animation-delay: 1.9s; }
          .al-orb {
            width: 108px;
            height: 108px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 54px;
            background: radial-gradient(circle at 32% 28%, rgba(74,222,128,0.4), rgba(21,128,61,0.22));
            border: 1px solid rgba(74,222,128,0.45);
            box-shadow: 0 14px 44px rgba(34,197,94,0.4), inset 0 2px 12px rgba(255,255,255,0.18);
            animation: al-float 2.4s ease-in-out infinite;
          }
          .loader-text {
            margin: 0;
            font-family: var(--serif);
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(90deg, var(--green) 0%, #eab308 50%, var(--green) 100%);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: text-shimmer 3s linear infinite;
            letter-spacing: 0.5px;
          }
          .al-progress {
            margin-top: 24px;
            width: 190px;
            height: 4px;
            border-radius: 999px;
            background: rgba(148,163,184,0.22);
            overflow: hidden;
            position: relative;
          }
          .al-progress::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 38%;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--green), #eab308);
            animation: al-bar 1.5s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .al-orb, .al-ring { animation: none; }
            .loader-text { animation: none; }
            .al-progress::before { animation: none; width: 100%; }
          }
        `}
      </style>
      <div className="al-orb-wrap">
        <div className="al-ring"></div>
        <div className="al-ring d2"></div>
        <div className="al-ring d3"></div>
        <div className="al-orb">🌱</div>
      </div>
      <h2 className="loader-text">Cultivating AgroIntel...</h2>
      <p
        className="t3 mt2 sm tc"
        style={{ maxWidth: "300px", lineHeight: 1.5, marginTop: "10px" }}
      >
        Preparing your smart farming assistant
      </p>
      <div className="al-progress" aria-hidden="true"></div>
    </div>
  );
}
