import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { API } from "../context/SettingsContext";

export function usePricesWebSocket() {
  const setWsConnected = useStore((state) => state.setWsConnected);

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let pingInterval;
    let backoff = 5000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      // Convert http/https API URL to ws/wss
      const wsUrl = API.replace(/^http/, "ws") + "/ws/prices";
      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        reconnectTimeout = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 1.5, 60000);
        return;
      }

      ws.onopen = () => {
        setWsConnected(true);
        backoff = 5000;
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send("ping"); } catch (_) {}
          }
        }, 45000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === "pong" || event.data === "ping") return;
          const data = JSON.parse(event.data);
          if (data.type === "prices_updated") {
            window.dispatchEvent(
              new CustomEvent("agrointel-live-prices-updated", {
                detail: data,
              }),
            );
          }
        } catch (e) {
          // Ignore non-json or ping frames
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        clearInterval(pingInterval);
        if (!stopped) {
          const jitter = Math.random() * 2000;
          reconnectTimeout = setTimeout(connect, Math.min(backoff + jitter, 60000));
          backoff = Math.min(backoff * 1.5, 60000);
        }
      };

      ws.onerror = () => {
        // Handled silently by onclose
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
    };
  }, [setWsConnected]);
}
