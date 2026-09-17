import { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Global in-app confirmation dialog. Listens for "krishi-confirm" events
// (dispatched by confirmAction in src/utils/confirm.js) and renders a glass
// modal matching the app theme. Resolves the caller's promise with true/false.
export default function ConfirmHost() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const onConfirm = (e) => {
      const d = (e && e.detail) || {};
      setState((prev) => {
        if (prev && typeof prev.resolve === "function") prev.resolve(false);
        return {
          message: d.message || "Are you sure?",
          confirmText: d.confirmText || "Confirm",
          cancelText: d.cancelText || "Cancel",
          danger: !!d.danger,
          resolve: typeof d.resolve === "function" ? d.resolve : () => {},
        };
      });
    };
    window.addEventListener("krishi-confirm", onConfirm);
    return () => window.removeEventListener("krishi-confirm", onConfirm);
  }, []);

  const close = (result) => {
    setState((prev) => {
      if (prev && typeof prev.resolve === "function") prev.resolve(result);
      return null;
    });
  };

  const trapRef = useFocusTrap(!!state, () => close(false));

  if (!state) return null;

  const boxStyle = { maxWidth: 360, width: "100%" };
  const msgStyle = { fontSize: 16, lineHeight: 1.5 };

  return (
    <div
      className="modal-overlay fade-in"
      ref={trapRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
      role="alertdialog"
      aria-modal="true"
      aria-label={state.message}
    >
      <div className="card p3" style={boxStyle}>
        <p className="bold mb3" style={msgStyle}>
          {state.message}
        </p>
        <div className="flex gap2">
          <button className="btn btn-o w100" onClick={() => close(false)}>
            {state.cancelText}
          </button>
          <button
            className={`btn w100 ${state.danger ? "btn-r" : "btn-g"}`}
            onClick={() => close(true)}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
