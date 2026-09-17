// R78: Robust PWA auto-update. Pairs with vite-plugin-pwa registerType:'autoUpdate'
// (skipWaiting + clientsClaim). Installed PWAs rarely fully close, so the browser
// may not notice a new build for a long time. This module:
//   1) Actively asks the browser to re-check for a new service worker on load,
//      every 60s, and whenever the app regains focus/visibility/connectivity.
//   2) When a NEW service worker takes control of an already-open page, shows a
//      small toast and reloads ONCE so users always get the latest build with no
//      manual cache clear. First install (no prior controller) is skipped to
//      avoid a reload loop.
//
// R99: this file was imported NOWHERE (CONTEXT.md outstanding issue 7), so none
// of the above ever ran - PWA update checking was silently dead and an installed
// app could sit on a stale build indefinitely. src/main.jsx now imports it for
// its side effects.
//
// The toast was also moved off the hardcoded claymorphic double box-shadow and
// IBM Plex Sans (both deleted from the design system in R96) onto ds tokens.
// Every var() here carries a literal fallback on purpose: this module can run
// before the stylesheets resolve, and per KL#31 a var(--x) with no fallback
// drops the entire declaration when --x is undefined.
(function () {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  var hadController = !!navigator.serviceWorker.controller;
  var reloading = false;

  function showUpdateToast() {
    try {
      if (document.getElementById("pwa-update-toast")) return;
      var t = document.createElement("div");
      t.id = "pwa-update-toast";
      t.setAttribute("role", "status");
      t.textContent = "Updating to the latest version\u2026";
      t.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:calc(20px + env(safe-area-inset-bottom))",
        "transform:translateX(-50%)",
        "z-index:99999",
        "background:var(--ds-surface-2,#182019)",
        "color:var(--ds-text,#eef2ef)",
        "border:1px solid var(--ds-line,rgba(255,255,255,.14))",
        "border-left:3px solid var(--ds-accent,#34d399)",
        "border-radius:var(--ds-r,14px)",
        "box-shadow:var(--ds-sh-3,0 18px 40px rgba(0,0,0,.45))",
        "font:600 13px/1.4 var(--sans,system-ui,-apple-system,sans-serif)",
        "padding:12px 18px",
        "max-width:88vw",
        "text-align:center"
      ].join(";");
      document.body.appendChild(t);
    } catch (e) {}
  }

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController || reloading) return;
    reloading = true;
    showUpdateToast();
    setTimeout(function () { window.location.reload(); }, 1200);
  });

  function checkForUpdate() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistration) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && typeof reg.update === "function") {
        reg.update().catch(function () {});
      }
    }).catch(function () {});
  }

  if (document.readyState === "complete") {
    checkForUpdate();
  } else {
    window.addEventListener("load", checkForUpdate);
  }
  setInterval(checkForUpdate, 60000);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("focus", checkForUpdate);
  window.addEventListener("online", checkForUpdate);
})();
