// In-app confirmation dialog helper (replaces native window.confirm).
// Dispatches a "krishi-confirm" event handled by <ConfirmHost/> (mounted in App.jsx)
// and resolves to true (confirmed) or false (cancelled/dismissed).
//
// Usage:
//   import { confirmAction } from "../utils/confirm";
//   const ok = await confirmAction("Delete this?", { danger: true, confirmText: "Delete" });
//   if (!ok) return;
export function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("krishi-confirm", {
        detail: { message, ...options, resolve },
      }),
    );
  });
}
