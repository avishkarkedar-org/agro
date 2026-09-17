import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * BACK_BUTTON_R92
 *
 * Shared back control for the static footer pages (About, Contact, FAQ,
 * Changelog, Privacy, Terms).
 *
 * WHY NOT window.location.href = "/" (the old Terms/Privacy behaviour):
 * that is a FULL page reload. It tears down the SPA, replays the splash
 * loader, refetches settings from Render (which can cold-start for 30-60s),
 * drops the service worker cache advantage, and always lands the user at the
 * top of home rather than where they actually were.
 *
 * navigate(-1) keeps the SPA alive and lets the browser restore the previous
 * scroll offset, so the user returns exactly where they left off.
 *
 * EDGE CASE - deep links. location.key is "default" only for the very first
 * history entry, i.e. the user arrived straight at /terms via a shared link,
 * a PWA shortcut, or a refresh. There is no in-app history to pop, so
 * navigate(-1) would push them out of the app entirely (back to Google, or a
 * blank tab). Those cases fall back to home.
 *
 * SCROLL RESET - React Router does not reset scroll on PUSH navigation, so
 * tapping "Terms" from the footer (already scrolled to the bottom of home)
 * previously landed the user mid-document. This component mounts exactly once
 * at the top of each static page, so resetting here reliably fixes that
 * without needing a router-level scroll manager.
 *
 * INLINE_ARROW_R92_1 - the arrow is drawn inline rather than imported from
 * lucide-react. Per KL#19, a missing lucide export is a hard MISSING_EXPORT
 * build failure that the dev server never surfaces (lazy resolution) and that
 * only appears at bundle time in CI. The CI guard job screens brand icons but
 * cannot catch a missing core icon. An inline path removes the dependency
 * entirely and renders identically.
 */
function ArrowLeftIcon({ size = 16, ...props }) {
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
      {...props}
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default function BackButton({ label = "Back" }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goBack = () => {
    if (location.key && location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      type="button"
      className="btn btn-o btn-sm"
      onClick={goBack}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        marginBottom: "18px",
      }}
    >
      <ArrowLeftIcon size={16} />
      {label}
    </button>
  );
}
