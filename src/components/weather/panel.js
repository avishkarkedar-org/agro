// WEATHER_PANEL_TOKENS_R104
// Shared panel styling for the weather feature.
//
// Why this file exists: Weather.jsx declared the same panel shape inline seven
// times, each with a slightly different radius (6/7/8/9/10/12px) and, worse,
// hardcoded border hexes (#1e3a5f navy, #92400e brown, #7f1d1d maroon) that do
// not flip with the theme. In light mode those dark edges sat on pale tints.
//
// Rules honoured here:
//   - Every colour is a ds-* token with a fallback (KL#31).
//   - Radii come from the 8/14/18 scale only (audit item 8).
//   - Eyebrow labels are sans, 11.5px, NOT uppercase: IBM Plex Mono has no
//     Devanagari coverage and text-transform:uppercase is a no-op for it, so
//     uppercase mono eyebrows broke Hindi/Marathi (audit items 33, 34).

export const RADIUS = { sm: "8px", md: "14px", lg: "18px" };

// Tone -> fill / border / text. The *-line tokens were added in R102.1; the
// fallbacks here match those values so this file is safe even if a stylesheet
// fails to load.
export const TONES = {
  neutral: {
    fill: "var(--ds-surface-2, #182019)",
    line: "var(--ds-line, rgba(255,255,255,0.08))",
    text: "var(--ds-text-2, rgba(238,242,239,0.74))",
  },
  accent: {
    fill: "var(--ds-accent-soft, rgba(52,211,153,0.12))",
    line: "var(--ds-accent-line, rgba(52,211,153,0.26))",
    text: "var(--ds-accent, #34d399)",
  },
  warn: {
    fill: "var(--ds-warn-soft, rgba(251,191,36,0.12))",
    line: "var(--ds-warn-line, rgba(251,191,36,0.26))",
    text: "var(--ds-warn, #fbbf24)",
  },
  danger: {
    fill: "var(--ds-danger-soft, rgba(251,113,133,0.12))",
    line: "var(--ds-danger-line, rgba(251,113,133,0.26))",
    text: "var(--ds-danger, #fb7185)",
  },
  info: {
    fill: "var(--ds-info-soft, rgba(96,165,250,0.12))",
    line: "var(--ds-info-line, rgba(96,165,250,0.26))",
    text: "var(--ds-info, #60a5fa)",
  },
};

export function tone(name) {
  return TONES[name] || TONES.neutral;
}

// A standard nested panel inside the weather card.
export function panelStyle(toneName = "neutral", extra) {
  const t = tone(toneName);
  return {
    marginTop: "10px",
    padding: "12px",
    background: t.fill,
    border: "1px solid " + t.line,
    borderRadius: RADIUS.md,
    ...(extra || {}),
  };
}

// A panel that should read as recessed rather than tinted.
export function surfacePanelStyle(extra) {
  return {
    marginTop: "10px",
    padding: "12px",
    background: "var(--ds-surface-2, #182019)",
    border: "1px solid var(--ds-line, rgba(255,255,255,0.08))",
    borderRadius: RADIUS.md,
    ...(extra || {}),
  };
}

// An inset strip inside a panel (one step deeper than surfacePanelStyle).
export function insetStyle(toneName = "neutral", extra) {
  const t = tone(toneName);
  return {
    padding: "8px 10px",
    background: t.fill,
    border: "1px solid " + t.line,
    borderRadius: RADIUS.sm,
    ...(extra || {}),
  };
}

// Section label. Deliberately sans and mixed-case - see the note above.
export function eyebrowStyle(toneName = "neutral", extra) {
  const t = tone(toneName);
  return {
    fontSize: "11.5px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: t.text,
    marginBottom: "8px",
    ...(extra || {}),
  };
}

// Smallest permitted informational size. Nothing a farmer must read should go
// below this; Weather.jsx had eleven instances of 8-9px text (audit item 34).
export const MIN_TEXT = "11px";

export const captionStyle = {
  fontSize: MIN_TEXT,
  color: "var(--ds-text-3, rgba(238,242,239,0.56))",
  lineHeight: 1.5,
};
