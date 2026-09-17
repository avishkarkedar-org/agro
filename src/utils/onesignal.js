/**
 * OneSignal Web Push Notification Manager for AgroIntel
 * Handles device registration, permission prompts, and targeted per-device price tags.
 */

export const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || "b2316e6d-5555-4a67-8e6f-placeholder";

let initialized = false;

export function initOneSignal(appId = ONESIGNAL_APP_ID) {
  if (typeof window === "undefined" || initialized) return;
  if (!appId || appId.includes("placeholder")) {
    console.info("OneSignal: App ID pending configuration.");
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: appId,
        serviceWorkerPath: "OneSignalSDKWorker.js",
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // Custom UI buttons
        },
      });
      initialized = true;
      console.log("OneSignal initialized for AgroIntel");
    } catch (e) {
      console.warn("OneSignal initialization error:", e);
    }
  });
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined") return false;
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        const permission = await OneSignal.Notifications.requestPermission();
        resolve(permission);
      } catch (e) {
        if (typeof Notification !== "undefined") {
          const p = await Notification.requestPermission();
          resolve(p === "granted");
        } else {
          resolve(false);
        }
      }
    });
  });
}

/**
 * Format commodity name to a safe OneSignal tag key (e.g., 'Wheat' -> 'alert_wheat')
 */
function toTagKey(commodity) {
  return "alert_" + String(commodity || "").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
}

/**
 * Set a targeted price alert on THIS specific phone/device
 */
export function setDeviceMandiAlert(commodity, targetPrice) {
  if (typeof window === "undefined") return;
  const tagKey = toTagKey(commodity);
  const val = String(Number(targetPrice) || 0);

  // Auto prompt permission if not granted yet
  requestNotificationPermission();

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    try {
      OneSignal.User.addTag(tagKey, val);
      console.log(`[OneSignal] Tagged device: ${tagKey} = ${val}`);
    } catch (e) {
      console.warn("[OneSignal] Could not set tag:", e);
    }
  });
}

/**
 * Clear the price alert tag for THIS specific phone/device
 */
export function clearDeviceMandiAlert(commodity) {
  if (typeof window === "undefined") return;
  const tagKey = toTagKey(commodity);

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    try {
      OneSignal.User.removeTag(tagKey);
      console.log(`[OneSignal] Removed tag from device: ${tagKey}`);
    } catch (e) {
      console.warn("[OneSignal] Could not remove tag:", e);
    }
  });
}
