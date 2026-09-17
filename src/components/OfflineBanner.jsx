import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let timer;
    const goOff = () => {
      setOffline(true);
      setJustReconnected(false);
    };
    const goOn = () => {
      setOffline(false);
      setJustReconnected(true);
      timer = setTimeout(() => setJustReconnected(false), 3500);
    };
    window.addEventListener("offline", goOff);
    window.addEventListener("online", goOn);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", goOff);
      window.removeEventListener("online", goOn);
    };
  }, []);

  if (!offline && !justReconnected) return null;

  if (justReconnected) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#064e3b",
          color: "#6ee7b7",
          padding: "8px 16px",
          textAlign: "center",
          fontFamily: "var(--sans)",
          fontSize: "12.5px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: "0 2px 12px rgba(0,0,0,.4)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <span>🟢</span>
        <span>Back online! Syncing latest live rates and weather...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#7f1d1d",
        color: "#fca5a5",
        padding: "8px 16px",
        textAlign: "center",
        fontFamily: "var(--sans)",
        fontSize: "12.5px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "0 2px 12px rgba(0,0,0,.5)",
      }}
    >
      <span>📵</span>
      <span>
        You are offline — serving cached agronomy data and offline guides.
      </span>
    </div>
  );
}
