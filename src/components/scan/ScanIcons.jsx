/* SCAN_SPLIT_R110 - inline SVG glyphs for the scan card.
 *
 * Inline SVG rather than lucide imports: lucide v1 ships no brand icons and the
 * CI guard greps lucide usage for brand names, so hand-rolled paths keep the
 * build green (KL#22). Every icon inherits currentColor and takes a size prop,
 * so redesign5.css's 16px in-control icon rule stays in charge of sizing rather
 * than a hardcoded viewBox.
 *
 * NOTE: no \u escapes anywhere in here - they render literally in JSX (KL#9). */

function Svg({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function CameraIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function FolderIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function HistoryIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </Svg>
  );
}

export function SpeakerIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </Svg>
  );
}

export function StopIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Svg>
  );
}

export function CloseIcon({ size = 16 }) {
  return (
    <Svg size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}
