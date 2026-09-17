import { useEffect } from "react";

export default function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      title="Tap to dismiss"
      onClick={onDone}
    >
      {msg}
    </div>
  );
}
