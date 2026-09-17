// Global toast + confirm system for the admin panel.
// Replaces native alert() and window.confirm() with styled in-app UI.
// Usage:
//   import { notify, confirmDialog } from "../utils/notify";
//   notify("Saved!");
//   if (!(await confirmDialog("Delete this?"))) return;

export function notify(message, type) {
  const msg = message == null ? "" : String(message);
  let resolved = type;
  if (!resolved) {
    if (/^\s*✅/.test(msg) || /success|saved|created|updated|restored|unblocked|enabled|disabled/i.test(msg)) {
      resolved = "success";
    } else if (/fail|error|⚠️|could not|invalid|required|wrong/i.test(msg)) {
      resolved = "error";
    } else {
      resolved = "info";
    }
  }
  window.dispatchEvent(
    new CustomEvent("admin-toast", {
      detail: { message: msg, type: resolved },
    })
  );
}

export function confirmDialog(options) {
  const opts = typeof options === "string" ? { message: options } : options || {};
  return new Promise((resolve) => {
    const id = String(Date.now()) + ":" + String(Math.random());
    const onResult = (e) => {
      if (!e.detail || e.detail.id !== id) return;
      window.removeEventListener("admin-confirm-result", onResult);
      resolve(Boolean(e.detail.confirmed));
    };
    window.addEventListener("admin-confirm-result", onResult);
    window.dispatchEvent(
      new CustomEvent("admin-confirm", {
        detail: {
          id,
          message: opts.message || "Are you sure?",
          confirmText: opts.confirmText || "Confirm",
          cancelText: opts.cancelText || "Cancel",
        },
      })
    );
  });
}
