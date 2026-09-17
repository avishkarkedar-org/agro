import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

/* ── R97 ROLLBACK - STYLESHEET ORDER ─────────────────────────
 *
 * WHAT WENT WRONG (R95, fixed here)
 * R95 removed redesign.css / redesign2.css / redesign3.css /
 * redesign4.css from this file, on the theory that the new design
 * system (ds-tokens + ds-components) fully replaced them.
 *
 * It did not. Those four files were not only overrides - they were
 * the ONLY place some components were styled at all. Any component
 * whose class names appeared nowhere else lost 100% of its styling
 * and rendered bare. `.home-hero` is a confirmed example:
 * HomeHero.jsx still renders it, but it was styled only in
 * redesign2.css / redesign3.css. The app never crashed and the
 * build stayed green - it just fell apart visually, which is why
 * CI could not catch it.
 *
 * THE LESSON
 * Unloading a stylesheet is only safe if every selector in it is
 * also covered elsewhere. Verifying the custom PROPERTIES it
 * declared (R96.1/R96.2 did that for --border-soft and --r-sm) is
 * not sufficient - whole SELECTORS were orphaned too.
 *
 * CURRENT ORDER
 * The design system loads first and provides the token scale and
 * the component baseline. The four legacy sheets load after it, so
 * they win where they overlap and, critically, they restore the
 * selectors the design system does not cover yet. The result is
 * the last known-good appearance with nothing unstyled.
 *
 * MIGRATING OFF THESE FILES (the correct way, next session)
 * Do it one file at a time, and for EACH file first enumerate
 * every selector it defines and confirm ds-components.css covers
 * it. Port missing selectors BEFORE removing the import, and
 * re-check the live site after each removal. Do not remove more
 * than one per deploy.
 * ──────────────────────────────────────────────────── */
import "./styles/global.css";
import "./styles/ds-tokens.css";
import "./styles/ds-components.css";
import "./styles/redesign.css";
import "./styles/redesign2.css";
import "./styles/redesign3.css";
import "./styles/redesign4.css";

/* R108: redesign5.css - element size consistency.
 * R102 created this file as a comment-only stub and never imported it,
 * so it sat inert (KL#39: a file can exist, be correct, and be wired to
 * nothing). R108 filled it with the unified control-size scale and wires
 * it here. It MUST load last: it deliberately avoids !important on
 * heights so components can still override with inline styles, which
 * only works if it wins on source order (KL#30). */
import "./styles/redesign5.css";

/* R150: redesign6.css - final convergence pass. Loads after redesign5.css
 * on purpose: it is the one place that resolves the remaining
 * contradictions between the four legacy redesign*.css files (glass vs
 * flat, several competing color palettes, mismatched radii/shadows) so
 * the last-loaded rule set is coherent instead of just "whatever won
 * the cascade". See the file itself for the full rationale. */
import "./styles/redesign6.css";

/* R201: comprehensive UI polish — fixes content hidden behind nav bar,
 * 2-col mobile grid, better cards, compact hero, header slim. Loads LAST
 * so it wins cascade on all equal-specificity rules. */
import "./styles/redesign7.css";


/* R99: side-effect import. src/pwaUpdate.js existed since R78 but was
 * referenced by NOTHING (CONTEXT.md outstanding issue 7), so the service-worker
 * update polling and the one-shot reload-on-new-build never ran. An installed
 * PWA could stay on a stale bundle until the user cleared site data - which is
 * exactly the "hard-refresh to see my fix" loop this project keeps hitting.
 * It is an IIFE with no exports, so importing it for effect is the whole wiring.
 * It self-guards on `serviceWorker` support and only reloads when a NEW worker
 * claims an already-controlled page, so there is no first-install reload loop. */
import "./pwaUpdate.js";

import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <SettingsProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SettingsProvider>
  </ErrorBoundary>,
);
