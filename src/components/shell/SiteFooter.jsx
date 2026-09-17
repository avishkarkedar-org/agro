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
