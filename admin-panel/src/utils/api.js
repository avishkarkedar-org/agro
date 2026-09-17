export const API_BASE = import.meta.env.VITE_API_URL || "https://agrointel-backend-ucic.onrender.com";
export const API = import.meta.env.VITE_API_URL || (window.location.origin.includes("localhost")
  ? "http://localhost:8000"
  : "https://agrointel-backend-ucic.onrender.com");

export async function api(endpoint, options = {}) {
  const token = localStorage.getItem("admin_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    if (endpoint !== "/api/admin/login") {
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
  }
  const text = await res.text();
  if (!res.ok) {
    let err = "API Error";
    try {
      const j = JSON.parse(text);
      err = j.detail || j.error || text;
      if (typeof err === "object") err = JSON.stringify(err);
    } catch (e) {
      err = text;
    }
    throw new Error(err);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}
