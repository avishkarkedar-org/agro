import { useEffect, useState, useCallback } from "react";
import "./overlays.css";

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (e) => {
      const detail = e.detail || {};
      const id = String(Date.now()) + ":" + String(Math.random());
      setToasts((list) => [
        ...list,
        { id, message: detail.message || "", type: detail.type || "info" },
      ]);
      setTimeout(() => remove(id), 3800);
    };
    window.addEventListener("admin-toast", onToast);
    return () => window.removeEventListener("admin-toast", onToast);
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="admin-toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={"admin-toast admin-toast-" + t.type}>
          <span className="admin-toast-icon">
            {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
          </span>
          <span className="admin-toast-msg">{t.message}</span>
          <button
            className="admin-toast-close"
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
