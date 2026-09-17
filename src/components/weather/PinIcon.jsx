// PIN_ICON_R106
// Extracted so LocationGate and the Weather card's search row render the same
// glyph. Previously the gate owned it privately; duplicating it into Weather
// would have let the two drift.
//
// Inline SVG rather than a lucide-react import: the CI guard greps lucide
// imports for brand names and lucide v1 has no brand icons anyway (KL#19/#22).

export default function PinIcon({ size = 18 }) {
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
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
