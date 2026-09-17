import { setDeviceMandiAlert, clearDeviceMandiAlert } from "./onesignal";

export async function registerMandiAlert(commodity, targetPrice) {
  try {
    await setDeviceMandiAlert(commodity, targetPrice);
    return true;
  } catch (e) {
    console.warn("Could not register alert:", e);
    return false;
  }
}

export async function removeMandiAlert(commodity) {
  try {
    await clearDeviceMandiAlert(commodity);
    return true;
  } catch (e) {
    console.warn("Could not remove alert:", e);
    return false;
  }
}
