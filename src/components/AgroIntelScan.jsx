import { useState, useEffect, useRef } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import { API } from "../context/SettingsContext";
import ScanHistory from "./scan/ScanHistory";
import ScanCamera from "./scan/ScanCamera";
import ScanResult from "./scan/ScanResult";
import { compressImage, saveScanToHistory } from "./scan/scanStore";
import { CameraIcon, FolderIcon, HistoryIcon } from "./scan/ScanIcons";

/* SCAN_SPLIT_R110
 * This component was 1,300 lines and could not be pushed without truncation,
 * which blocked every requested change to the scan card. The history modal,
 * camera overlay, results panel, crop-doctor chat and pure helpers now live in
 * ./scan/*. What remains here is upload, camera capture, the scan request and
 * its retry pass, and the card shell.
 *
 * The model name that used to sit in the header ("Groq · LLaMA 4 Vision") was
 * removed at the owner's request. It was also inaccurate - the backend has
 * called Qwen since R107 - which is reason enough not to print vendor
 * infrastructure on a farmer's screen. */

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
];

const SAMPLE_CROPS = [
  "Tomato",
  "Potato",
  "Corn",
  "Grape",
  "Apple",
  "Wheat",
  "Rice",
  "+more",
];

// CAMERA_INAPP_R151 - in-app browsers (WhatsApp, Instagram, Facebook,
// Messenger, Line, WeChat) routinely block getUserMedia or never surface the
// OS/browser's native camera-permission prompt at all, even though the site's
// own Permissions-Policy allows it (see public/_headers R151). A farmer who
// opened AgroIntel from a link shared in a WhatsApp group would tap
// "Use Camera" and see nothing happen - no prompt, no error - because these
// webviews reject the request before it reaches the OS. Detecting the
// user agent up front lets us tell them exactly what to do instead of
// leaving them stuck on a button that silently does nothing.
const IN_APP_BROWSER_UA = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Snapchat/i;

export default function AgroIntelScan({ autoOpenCamera = false }) {
  const [file, setFile] = useState(null);
  const [imgUrl, setImgUrl] = useState("");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scanLang, setScanLang] = useState(
    () => safeGetLS("krishi_scan_lang") || "en",
  );
  const browseRef = useRef();
  const videoRef = useRef();
  const [showCam, setShowCam] = useState(false);
  const [stream, setStream] = useState(null);
  // Track whether auto-open has already fired so it only runs once per mount
  const autoOpenFired = useRef(false);


  const closeCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setShowCam(false);
  };

  const pick = (f) => {
    if (!f || !f.type || !f.type.startsWith("image/")) {
      setErr("Please upload a JPG, PNG or WebP image.");
      return;
    }
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setResult(null);
    setErr("");
    setStep(0);
  };

  const openCamera = async () => {
    setErr("");

    if (
      typeof navigator !== "undefined" &&
      IN_APP_BROWSER_UA.test(navigator.userAgent || "")
    ) {
      setErr(
        'This page looks like it is open inside an app (WhatsApp, Instagram, Facebook, etc.), which blocks camera access and will not show a permission prompt. Tap the menu (\u22EE or \u2022\u2022\u2022) in that app and choose "Open in Chrome" or "Open in browser", then try the camera again \u2014 or upload a photo instead.',
      );
      return;
    }

    try {
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch (_e) {
        // Fallback for desktops / webcams without environment lens
        s = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setStream(s);
      setShowCam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (e) {
    if (
      e &&
      (e.name === "NotAllowedError" ||
        e.name === "PermissionDeniedError" ||
        e.name === "SecurityError")
    ) {
      setErr(
        "Camera access is blocked for this site. Tap the lock or site-info icon next to your browser's address bar, turn Camera on, then try again — or upload a photo instead.",
      );
    } else if (e && e.name === "NotFoundError") {
      setErr(
        "No camera was found on this device. Please upload a photo instead.",
      );
    } else if (e && e.name === "NotReadableError") {
      setErr(
        "Your camera is already in use by another app. Close it and try again.",
      );
    } else {
      setErr("Camera not available right now. Please upload a photo instead.");
    }
  }
};

const capture = () => {
  const v = videoRef.current;
  if (!v || !v.videoWidth || !v.videoHeight) {
    setErr("Camera is still initializing. Please wait a second and try again.");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = v.videoWidth;
  canvas.height = v.videoHeight;
  canvas.getContext("2d").drawImage(v, 0, 0);
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const f = new File([blob], "camera-capture.jpg", {
        type: "image/jpeg",
      });
      pick(f);
      closeCamera();
    },
    "image/jpeg",
    0.92,
  );
};

/* Cleanup camera stream and image object URL on unmount */
useEffect(() => {
  return () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };
}, [imgUrl, stream]);

  /* Instant scan with AI diagnosis */
  const scan = async () => {
    if (!file) return;
    setStep(1);
    setErr("");
    setResult(null);

    let uploadFile = file;
    try {
      const compressed = await compressImage(file);
      if (compressed) uploadFile = compressed;
    } catch {
      // Keep original file if compression fails
    }

    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("lang", scanLang);
      const r = await fetch(`${API}/api/scan`, { method: "POST", body: fd });
      let d;
      try {
        d = await r.json();
      } catch {
        throw new Error("Backend returned invalid response.");
      }
      if (!r.ok) {
        throw new Error(d.detail || d.message || "Scan analysis failed. Please try again.");
      }

      if (d.confidence < 50) {
        d = {
          ...d,
          accuracy_note:
            "Low confidence - image may be blurry or too far. Try retaking closer to the leaf in natural daylight. " +
            (d.accuracy_note || ""),
        };
      }
      saveScanToHistory(d);
      setResult(d);
      setStep(3);
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setErr("Unable to connect to AgroIntel AI server. If the server is starting up, please try again in a few seconds.");
      } else {
        setErr(msg);
      }
      setStep(4);
    }
  };

  const reset = () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setFile(null);
    setImgUrl("");
    setStep(0);
    setResult(null);
    setErr("");
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">
          AgroIntel Scan — AI Disease Detector
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <select
            className="input btn-sm"
            value={scanLang}
            aria-label="Scan result language"
            onChange={(e) => {
              setScanLang(e.target.value);
              safeSetLS("krishi_scan_lang", e.target.value);
            }}
            style={{ width: "auto" }}
          >
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-o btn-sm"
            onClick={() => setShowHistory(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <HistoryIcon size={14} />
            History
          </button>
        </div>
      </div>

      {showHistory && <ScanHistory onClose={() => setShowHistory(false)} />}

      <div className="card-body">
        {showCam && (
          <ScanCamera
            videoRef={videoRef}
            onCapture={capture}
            onClose={closeCamera}
          />
        )}

        {err && step !== 4 && (
          <div
            className="sm"
            style={{
              color: "var(--red)",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            {err}
          </div>
        )}

        {!imgUrl ? (
          <div
            className={`dropzone${drag ? " dz-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files[0]);
            }}
          >
            <h3
              style={{ fontSize: "17px", fontWeight: 900, marginBottom: "6px" }}
            >
              Drop plant image here
            </h3>
            <p className="sm t2 mb3">Close-up of a leaf gives best accuracy</p>
            <div className="flex gap2 jcc wrap mb3">
              {SAMPLE_CROPS.map((c) => (
                <span key={c} className="chip cx">
                  {c}
                </span>
              ))}
            </div>
            <div className="upload-options">
              <button
                type="button"
                className="upload-btn"
                onClick={() => browseRef.current?.click()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FolderIcon size={16} />
                Browse Files
              </button>
              <button
                type="button"
                className="upload-btn"
                onClick={openCamera}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CameraIcon size={16} />
                Use Camera
              </button>
            </div>
            <input
              ref={browseRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => pick(e.target.files[0])}
            />
          </div>
        ) : (
          <div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <img
                src={imgUrl}
                alt="Uploaded plant"
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  maxHeight: "230px",
                  objectFit: "cover",
                  border: "1px solid var(--b1)",
                }}
              />
              <button
                onClick={reset}
                aria-label="Remove uploaded image"
                style={{
                  position: "absolute",
                  top: "9px",
                  right: "9px",
                  background: "rgba(7,13,7,0.88)",
                  border: "1px solid var(--b1)",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  color: "var(--t2)",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div className="flex aic gap2 mb3">
              <span className="mono t3 xs">{file?.name}</span>
              <span className="chip cx">
                {(file?.size / 1024).toFixed(0)} KB
              </span>
            </div>

            {step === 0 && !result && (
              <button className="btn btn-g w100" onClick={scan}>
                Analyse Plant Health
              </button>
            )}

            {(step === 1 || step === 2) && (
              <div>
                <div className="step-bars">
                  <div className={`step-bar${step >= 1 ? " done" : ""}`} />
                  <div
                    className={`step-bar${step >= 2 ? " done" : step >= 1 ? " active" : ""}`}
                  />
                  <div
                    className={`step-bar${step >= 3 ? " done" : step >= 2 ? " active" : ""}`}
                  />
                </div>
                <div className="tc" style={{ padding: "22px 0" }}>
                  <div className="ring" style={{ margin: "0 auto" }} />
                  <p className="sm t2 mt3" aria-live="polite">
                    {step === 1
                      ? "Enhancing and uploading image..."
                      : "Double-checking the diagnosis..."}
                  </p>
                  <p className="xs t3 mt2">
                    Analysing leaf structure, colour and lesion pattern
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div
                style={{
                  padding: "14px",
                  background: "var(--rdim)",
                  border: "1px solid #7f1d1d",
                  borderRadius: "12px",
                }}
              >
                <div className="bold tr mb2" style={{ fontSize: "14px" }}>
                  Scan Error
                </div>
                <p className="sm" style={{ color: "#fca5a5", lineHeight: 1.6 }}>
                  {err}
                </p>
                <div className="flex gap2 mt3">
                  <button
                    className="btn btn-o btn-sm"
                    style={{ borderColor: "var(--red)", color: "var(--red)" }}
                    onClick={scan}
                  >
                    Retry
                  </button>
                  <button className="btn btn-o btn-sm" onClick={reset}>
                    New Image
                  </button>
                </div>
              </div>
            )}

            {step === 3 && result && (
              <ScanResult
                result={result}
                scanLang={scanLang}
                onReset={reset}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
