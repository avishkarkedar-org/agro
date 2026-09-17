import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { API } from "../context/SettingsContext";

export function usePricesWebSocket() {
  const setWsConnected = useStore((state) => state.setWsConnected);
  const setLiveMandiPrices = useStore((state) => state.setLiveMandiPrices);
  const setLiveFuelPrices = useStore((state) => state.setLiveFuelPrices);

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let pingInterval;
    let backoff = 2000;

    const connect = () => {
      // Convert http/https API URL to ws/wss
      const wsUrl = API.replace(/^http/, "ws") + "/ws/prices";
      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        reconnectTimeout = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 1.5, 30000);
        return;
      }

      ws.onopen = () => {
        setWsConnected(true);
        backoff = 2000;
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send("ping"); } catch (_) {}
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === "pong" || event.data === "ping") return;
          const data = JSON.parse(event.data);
          if (data.type === "prices_updated") {
            // Background tasks updated the backend cache.
            // Dispatch a custom event so Mandi/Fuel components can trigger a background refresh
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
        const jitter = Math.random() * 1000;
        reconnectTimeout = setTimeout(connect, Math.min(backoff + jitter, 30000));
        backoff = Math.min(backoff * 1.5, 30000);
      };

      ws.onerror = (err) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [setWsConnected]);
}
