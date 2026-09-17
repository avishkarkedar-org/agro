// Simple toast helper used by multiple components.
// Emits the same event App.jsx already listens to.
export function notify(msg) {
  try {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));
  } catch (e) {
    // fallback
    try { alert(msg); } catch {}
  }
}
