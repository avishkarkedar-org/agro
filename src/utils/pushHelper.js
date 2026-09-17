import { API } from "../context/SettingsContext";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerMandiAlert(commodity, targetPrice) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    throw new Error("Push notifications are not supported on this browser.");
  }

  // 1. Request notification permission if not yet granted
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error("Please allow notification permissions in your browser to receive price alerts on this device.");
  }

  // 2. Obtain service worker registration
  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) {
    throw new Error("Push manager is unavailable on this device.");
  }

  // 3. Get or create Push Subscription using backend VAPID public key
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const res = await fetch(`${API}/api/push/vapid-public-key`);
    if (!res.ok) throw new Error("Could not fetch server push keys.");
    const data = await res.json();
    const convertedVapidKey = urlBase64ToUint8Array(data.public_key);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 4. Save device subscription and target price to server
  const subJson = subscription.toJSON();
  const res = await fetch(`${API}/api/mandi/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      commodity: commodity,
      target_price: Number(targetPrice),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to register alert on server.");
  }

  return true;
}

export async function removeMandiAlert(commodity) {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await fetch(`${API}/api/mandi/alert`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        commodity: commodity,
      }),
    });
  } catch (e) {
    console.warn("Could not remove alert from server:", e);
  }
}
