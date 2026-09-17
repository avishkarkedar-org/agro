import { useEffect, useRef, useState } from "react";
import "./overlays.css";

export default function ConfirmHost() {
  const [req, setReq] = useState(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    const onConfirm = (e) => {
      const detail = e.detail || {};
      if (!detail.id) return;
      const danger = /delete|undone|permanent|revoke|purge|ban|clear|remove/i.test(
        detail.message || ""
      );
      setReq({
        id: detail.id,
        message: detail.message || "Are you sure?",
        confirmText: detail.confirmText || "Confirm",
        cancelText: detail.cancelText || "Cancel",
        danger,
      });
    };
    window.addEventListener("admin-confirm", onConfirm);
    return () => window.removeEventListener("admin-confirm", onConfirm);
  }, []);

  const respond = (confirmed) => {
    setReq((current) => {
      if (current) {
        window.dispatchEvent(
          new CustomEvent("admin-confirm-result", {
            detail: { id: current.id, confirmed },
          })
        );
      }
      return null;
    });
  };

  useEffect(() => {
    if (req && confirmBtnRef.current) confirmBtnRef.current.focus();
  }, [req]);

  useEffect(() => {
    if (!req) return;
    const onKey = (e) => {
      if (e.key === "Escape") respond(false);
      if (e.key === "Enter") respond(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;

  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) respond(false);
  };

  return (
    <div className="admin-confirm-overlay" onClick={onOverlayClick}>
      <div className="admin-confirm-card" role="dialog" aria-modal="true">
        <div className="admin-confirm-msg">{req.message}</div>
        <div className="admin-confirm-actions">
          <button className="admin-confirm-cancel" onClick={() => respond(false)}>
            {req.cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            className={"admin-confirm-ok" + (req.danger ? " admin-confirm-danger" : "")}
            onClick={() => respond(true)}
          >
            {req.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
