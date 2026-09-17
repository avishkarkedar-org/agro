import { Link } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Info,
  Shield,
  FileText,
  HelpCircle,
  FileClock,
} from "lucide-react";

// BRAND_ICON_R90
// lucide-react REMOVED every brand/logo icon (Instagram, Twitter, Youtube,
// Facebook, Github, ...) from its icon set. Importing one is not a soft warning
// -- the bundler fails the whole build with
// [MISSING_EXPORT] "Instagram" is not exported by lucide-react.
// This local component draws the same glyph inline using lucide's own geometry
// (24x24 viewBox, currentColor stroke, width 2) and accepts the same `size`
// prop, so it is a drop-in replacement. NEVER import a brand icon from lucide.
function InstagramIcon({ size = 13, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// External/mail links render as <a>; internal routes render as <Link> so they do
// not reload the SPA.
const FOOTER_LINKS = [
  { icon: Mail, to: "mailto:admin@avishkark.in", label: "Email" },
  {
    icon: MessageCircle,
    to: "https://wa.me/918432884424",
    label: "WhatsApp",
    external: true,
  },
  {
    icon: InstagramIcon,
    to: "https://instagram.com/agrointel.ai",
    label: "Instagram",
    external: true,
  },
  { icon: Info, to: "/about", label: "About" },
  { icon: Shield, to: "/privacy", label: "Privacy" },
  { icon: FileText, to: "/terms", label: "Terms" },
  { icon: HelpCircle, to: "/faq", label: "FAQ" },
  { icon: FileClock, to: "/changelog", label: "Changelog" },
];

// APP_SHELL_SPLIT_R117 / FOOTER_ALIGN_R118
// Layout comes from .ks-footer / .ks-social / .ks-social-row, defined across
// global.css, ds-components.css, redesign2.css and redesign3.css, with the
// current alignment set in section 9 of redesign5.css (which loads last).
//
// FOOTER_ALIGN_R118 changed two things here:
//
//  1. The wrapper no longer carries className="tc". That centred the copyright
//     line while R91's `.ks-social { align-items: flex-start !important }` held
//     the links hard left - so the two halves of the same footer disagreed. The
//     copyright now has its own class and is aligned in CSS alongside the links,
//     so they can never drift apart again.
//
//  2. The wrapper no longer draws its own borderTop. ds-components.css already
//     forces `.ks-footer { border-top: 1px solid var(--ds-line) !important }`,
//     so there were two hairlines about 6px apart in slightly different colours.
//
// KNOWN DEAD DECLARATION, deliberately left alone: the `padding: "0"` below has
// no effect, because redesign2.css R91 sets `padding: 20px 22px 14px !important`
// on .ks-footer and !important outranks inline styles (KL#29). It is kept so
// that removing it is a separate, attributable change rather than a spacing
// shift smuggled in with a layout fix.
export default function SiteFooter() {
  return (
    <div style={{ paddingBottom: "4px", marginTop: "10px" }}>
      <footer className="ks-footer" style={{ padding: "0" }}>
        <div className="ks-social">
          {FOOTER_LINKS.map((item, idx) => {
            const inner = (
              <span className="ks-social-row">
                <item.icon size={14} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            );
            return item.external || item.to.startsWith("mailto") ? (
              <a
                key={idx}
                href={item.to}
                title={item.label}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
              >
                {inner}
              </a>
            ) : (
              <Link key={idx} to={item.to} title={item.label}>
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="ks-footer-copy mono t3">
          © {new Date().getFullYear()} AgroIntel — Smart Farming
        </div>
      </footer>
    </div>
  );
}
