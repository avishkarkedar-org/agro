import { API } from "../context/SettingsContext";
import { safeGetLS, safeRemoveLS } from "./helpers";

export async function apiClient(endpoint, options = {}) {
  const token = safeGetLS("agrointel_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API}${endpoint}`, config);
  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Session expired or unauthorized — clear auth state and notify the app.
      safeRemoveLS("agrointel_token");
      safeRemoveLS("token");
      safeRemoveLS("agrointel_user");
      safeRemoveLS("agrointel_username");
      window.dispatchEvent(new CustomEvent("agrointel-auth-change"));
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: "Session expired. Please log in again.",
        }),
      );
    }
    let errMessage;
    try {
      const jsonError = JSON.parse(text);
      errMessage =
        jsonError.detail || jsonError.error || jsonError.message || text;
      if (typeof errMessage === "object")
        errMessage = JSON.stringify(errMessage);
    } catch {
      errMessage = text || `HTTP error ${response.status}`;
    }
    throw new Error(errMessage);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
