/* SCAN_SPLIT_R110 - scan history modal, extracted from AgroIntelScan.jsx.
 *
 * Two fixes over the original:
 *  - role="dialog" + aria-modal="true". It already used useFocusTrap, so focus
 *    was being trapped inside an element screen readers were never told was a
 *    dialog.
 *  - Cancelling the clear-history confirmation no longer closes the modal. */

import { useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { confirmAction } from "../../utils/confirm";
import { readScanHistory, clearScanHistory, sev2col } from "./scanStore";
import { CloseIcon } from "./ScanIcons";

export default function ScanHistory({ onClose }) {
  const [hist, setHist] = useState(() => readScanHistory());
  const trapRef = useFocusTrap(true, onClose);

  const clear = async () => {
    const ok = await confirmAction("Clear all scan history?", {
      danger: true,
      confirmText: "Clear",
    });
    if (!ok) return;
    clearScanHistory();
    setHist([]);
    onClose();
  };

  return (
    <div className="modal-bg fade-in" onClick={onClose}>
      <div
        ref={trapRef}
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Scan history"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        <div className="flex jcb aic mb3">
          <h3 style={{ fontSize: "17px", fontWeight: 900 }}>Scan History</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>
        {hist.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px 0",
              color: "var(--t3)",
            }}
          >
            <p className="sm">No scans yet. Scan a plant to see history here.</p>
          </div>
        ) : (
          hist.map((h) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px 0",
                borderBottom: "1px solid var(--b1)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--gdim)",
                  border: "1px solid var(--g3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                🌿
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  {h.crop}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: sev2col(h.severity),
                    marginTop: "2px",
                  }}
                >
                  {h.disease}
                </div>
                <div
                  className="mono t3"
                  style={{ fontSize: "10px", marginTop: "2px" }}
                >
                  {h.date} · {h.time}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  className="tx-num"
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: sev2col(h.severity),
                  }}
                >
                  {h.confidence}%
                </div>
                <div className="mono t3" style={{ fontSize: "9px" }}>
                  {h.severity}
                </div>
              </div>
            </div>
          ))
        )}
        {hist.length > 0 && (
          <button className="btn btn-r w100 btn-sm mt3" onClick={clear}>
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
