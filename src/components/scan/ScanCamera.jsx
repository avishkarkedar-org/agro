/* SCAN_SPLIT_R110 - fullscreen camera overlay, extracted from AgroIntelScan.jsx.
 *
 * The parent still owns the MediaStream, because it also owns the cleanup on
 * unmount; this component owns only the UI and its own focus trap. */

import { useFocusTrap } from "../../hooks/useFocusTrap";
import { CloseIcon } from "./ScanIcons";

export default function ScanCamera({ videoRef, onCapture, onClose }) {
  const trapRef = useFocusTrap(true, onClose);

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Camera - position leaf in frame"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex jcb aic"
        style={{
          padding: "20px",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#fff" }}>
          Position Leaf in Frame
        </h3>
        <button
          onClick={onClose}
          aria-label="Close camera"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "#fff",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <video
        ref={videoRef}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        playsInline
        muted
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "30px 20px",
          background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p
          className="xs mb3"
          style={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}
        >
          For best results, keep the phone steady and ensure good lighting.
        </p>
        <button
          onClick={onCapture}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "#fff",
            border: "6px solid rgba(255,255,255,0.3)",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(0,0,0,0.5)",
          }}
          aria-label="Capture photo"
        ></button>
      </div>
    </div>
  );
}
