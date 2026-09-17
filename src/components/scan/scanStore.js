/* SCAN_SPLIT_R110 - pure helpers extracted from AgroIntelScan.jsx.
 * No JSX and no React here, so this module stays importable from anywhere.
 * Logic copied verbatim from the original file. */

import { safeGetLS, safeSetLS } from "../../utils/helpers";

export const SCAN_HISTORY_KEY = "krishi_scan_history";

/* Severity -> chip class. Default "chip cx" is the neutral chip. */
export function sev2chip(s) {
  return s === "None"
    ? "chip cg"
    : s === "Severe"
      ? "chip cr"
      : s === "High"
        ? "chip ca"
        : "chip cx";
}

export function sev2card(s) {
  return s === "Severe" ? " sev-s" : s === "High" ? " sev-h" : "";
}

/* Severity -> token colour. Used by the history rows and the results panel. */
export function sev2col(s) {
  return s === "None"
    ? "var(--green)"
    : s === "Moderate"
      ? "var(--amber)"
      : s === "High" || s === "Severe"
        ? "var(--red)"
        : "var(--t2)";
}

export function saveScanToHistory(result) {
  try {
    const hist = JSON.parse(safeGetLS(SCAN_HISTORY_KEY) || "[]");
    hist.unshift({
      id: Date.now(),
      crop: result.crop,
      disease: result.disease,
      severity: result.severity,
      confidence: result.confidence,
      date: new Date().toLocaleDateString("en-IN"),
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    safeSetLS(SCAN_HISTORY_KEY, JSON.stringify(hist.slice(0, 10)));
  } catch (e) {}
}

export function readScanHistory() {
  try {
    return JSON.parse(safeGetLS(SCAN_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearScanHistory() {
  safeSetLS(SCAN_HISTORY_KEY, "[]");
}

/* IMAGE_QUALITY_R152: raised from 1280px/0.8 quality. The backend's own
 * enhance_image() used to hard-downscale every photo to a fixed 1024px
 * regardless of how small the final upload would actually be, and THIS pass
 * ran before that on the client, compounding detail loss across two lossy
 * resizes - almost certainly why the AI sometimes named the wrong crop or
 * disease on photos with small lesions or subtle spotting. The backend now
 * only shrinks as far as Groq's base64 payload limit actually requires, so
 * this client-side pass can stay closer to the original: it exists purely to
 * spare farmers on slow rural connections a multi-megabyte upload, not to cap
 * quality for the AI. It still skips entirely for images that are already a
 * reasonable size. Groq rejects base64 image payloads over 4 MB; the backend
 * enforces that limit adaptively after its own enhancement pass. */
export async function compressImage(file, maxDim = 1600, quality = 0.85) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/")) return file;
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = dataUrl;
    });
    let width = img.width;
    let height = img.height;
    if (width <= maxDim && height <= maxDim && file.size < 1.5 * 1024 * 1024)
      return file;
    if (width > height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || "scan").replace(/\.[^.]+$/, "");
    return new File([blob], base + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
