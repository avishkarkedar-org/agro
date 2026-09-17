/* SCAN_SPLIT_R110 - the plant disease results card, extracted from
 * AgroIntelScan.jsx.
 *
 * FIXED HERE: text-to-speech never worked in Hindi or Marathi. The old code read
 * localStorage.getItem("agrointel-lang"), a key nothing in this app writes, so
 * it always fell back to English. The language now arrives as a prop from the
 * card's own selector (persisted under krishi_scan_lang), so there is no second
 * source of truth to drift. Marathi requests hi-IN because no common browser
 * ships an mr-IN voice (KL#6).
 *
 * SHOPPING_LINK_R151: each treatment step now carries a "Buy" link that opens
 * a Google Shopping search for that exact recommendation. The backend returns
 * treatment as free-text steps, not SKUs or brand names, so an exact-match
 * purchase link isn't possible without a product database - a Shopping search
 * pre-filled with the AI's own wording is the closest honest equivalent, and
 * it degrades gracefully (an empty results page, never a broken link). Hidden
 * for a healthy-plant result, since "care tips" aren't something to buy. */

import { useState, useEffect } from "react";
import { notify } from "../../utils/notify";
import ConfRing from "../ConfRing";
import CropDoctorChat from "./CropDoctorChat";
import { sev2chip, sev2card } from "./scanStore";
import { SpeakerIcon, StopIcon } from "./ScanIcons";

function buildShopUrl(text) {
  var base = "https://www.google.com/search";
  return base + "?tbm=shop&q=" + encodeURIComponent(text);
}

/* Map the scan language to a voice the browser might actually have. */
function ttsLang(lang) {
  if (lang === "hi" || lang === "mr") return "hi-IN";
  if (lang === "ta") return "ta-IN";
  if (lang === "te") return "te-IN";
  if (lang === "bn") return "bn-IN";
  if (lang === "gu") return "gu-IN";
  if (lang === "kn") return "kn-IN";
  return "en-IN";
}

export default function ScanResult({ result, scanLang = "en", onReset }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechErr, setSpeechErr] = useState("");
  const healthy = result?.severity === "None";

  /* Never leave the phone talking after the user navigates away. */
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      setSpeechErr("Text-to-speech is not supported in this browser.");
      return;
    }
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    if (!result) return;
    const text = `Crop detected: ${result.crop}. Disease: ${result.disease}. Severity is ${result.severity}. Treatment plan: ${(result.treatment || []).join(". ")}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLang(scanLang);
    utterance.rate = 0.9;
    utterance.onend = () => setIsPlaying(false);
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };


  const copyResult = () => {
    const resultText = `Crop: ${result.crop}\nDisease: ${result.disease}\nSeverity: ${result.severity}\nTreatment: ${result.treatment?.join(", ") || "None"}`;
    navigator.clipboard
      ?.writeText(resultText)
      .then(() => notify("Result copied"))
      .catch(() => notify("Clipboard not available"));
  };

  const waHref =
    "https://wa.me/?text=" +
    encodeURIComponent(
      "AgroIntel AI Scan Result\nCrop: " +
        result.crop +
        "\nDisease: " +
        result.disease +
        "\nSeverity: " +
        result.severity +
        " (" +
        result.confidence +
        "% confidence)\nTreatment: " +
        (result.treatment || []).slice(0, 2).join(" | ") +
        "\n\nScanned with AgroIntel - agrointel.pages.dev",
    );

  return (
    <div className={`res-card${sev2card(result.severity)}`}>
      {/* No clear plant detected notice */}
      {(!result.crop || result.crop === "Unknown") && (
        <div className="mb3">
          <div className="bold tr mb2">No clear plant detected</div>
          <p className="sm t2 mb2">
            We couldn't confidently identify a plant in this photo. Take a
            close-up of a single affected leaf in good daylight, then scan again.
          </p>
          <button className="btn btn-o btn-sm" onClick={onReset}>
            Retake Photo
          </button>
        </div>
      )}

      {/* Ambiguous result banner */}
      {result.ambiguous && (
        <div
          style={{
            padding: "10px 13px",
            background: "var(--adim)",
            border: "1px solid #92400e",
            borderRadius: "10px",
            marginBottom: "14px",
          }}
        >
          <div
            className="mono xs"
            style={{
              color: "var(--amber)",
              letterSpacing: ".08em",
              marginBottom: "4px",
            }}
          >
            AMBIGUOUS RESULT — MULTIPLE POSSIBILITIES
          </div>
          <p className="xs t2" style={{ lineHeight: 1.6 }}>
            The AI found similar-looking possibilities. Check symptoms carefully
            or consult a local agronomist.
          </p>
          {result.possible_crops && result.possible_crops.length > 1 && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px 10px",
                background: "var(--s3)",
                borderRadius: "6px",
              }}
            >
              <div
                className="mono t3"
                style={{
                  fontSize: "9px",
                  letterSpacing: ".06em",
                  marginBottom: "4px",
                }}
              >
                COULD BE ONE OF THESE CROPS:
              </div>
              <div className="flex gap1 wrap">
                {result.possible_crops.map((c, i) => (
                  <span key={i} className="chip ca">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.possible_diseases && result.possible_diseases.length > 1 && (
            <div
              style={{
                marginTop: "6px",
                padding: "8px 10px",
                background: "var(--s3)",
                borderRadius: "6px",
              }}
            >
              <div
                className="mono t3"
                style={{
                  fontSize: "9px",
                  letterSpacing: ".06em",
                  marginBottom: "4px",
                }}
              >
                POSSIBLE DISEASES:
              </div>
              <div className="flex gap1 wrap">
                {result.possible_diseases.map((d, i) => (
                  <span key={i} className="chip cr">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.accuracy_note && (
            <p
              className="xs t2 mt2"
              style={{ lineHeight: 1.5, fontStyle: "italic" }}
            >
              {result.accuracy_note}
            </p>
          )}
        </div>
      )}

      {result.crop && result.crop !== "Unknown" && (
        <div className="crop-banner">
          <span className="crop-icon">🌿</span>
          <div>
            <div className="mono xs t3 mb1" style={{ letterSpacing: ".08em" }}>
              DETECTED CROP
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: "18px",
                fontWeight: 900,
                color: "var(--green)",
              }}
            >
              {result.crop}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap3 mb3">
        <ConfRing pct={result.confidence} sev={result.severity} />
        <div style={{ flex: 1 }}>
          <div className="mono t3 xs mb1" style={{ letterSpacing: ".08em" }}>
            DIAGNOSIS
          </div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 900,
              lineHeight: 1.3,
              marginBottom: "8px",
            }}
          >
            {result.disease}
          </h3>
          <div className="flex gap2 wrap">
            <span className={sev2chip(result.severity)}>
              {result.severity} Severity
            </span>
            {result.pathogen && result.pathogen !== "None" && (
              <span className="chip cx">
                {result.pathogen.split("(")[0].trim()}
              </span>
            )}
          </div>
        </div>
      </div>

      {result.accuracy_note && !result.ambiguous && (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--s3)",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          <p className="xs t3" style={{ lineHeight: 1.5 }}>
            {result.accuracy_note}
          </p>
        </div>
      )}

      {result.symptoms && !healthy && (
        <div className="mb3">
          <div className="mono t3 xs mb1" style={{ letterSpacing: ".08em" }}>
            SYMPTOMS OBSERVED
          </div>
          <p className="sm t2" style={{ lineHeight: 1.65 }}>
            {result.symptoms}
          </p>
        </div>
      )}

      {result.spread && result.spread !== "N/A" && !healthy && (
        <div className="mb3">
          <div className="mono t3 xs mb1" style={{ letterSpacing: ".08em" }}>
            HOW IT SPREADS
          </div>
          <p className="sm t2" style={{ lineHeight: 1.6 }}>
            {result.spread}
          </p>
        </div>
      )}

      {result.treatment?.length > 0 && (
        <div className="mb3">
          <div className="mono t3 xs mb2" style={{ letterSpacing: ".08em" }}>
            {healthy ? "CARE TIPS" : "TREATMENT PROTOCOL"}
          </div>
          {result.treatment.map((t, i) => (
            <div key={i} className="tx-item" style={{ alignItems: "center" }}>
              <span className="tx-num">{i + 1}.</span>
              <span style={{ flex: 1 }}>{t}</span>
              {!healthy && (
                <a
                  href={buildShopUrl(t)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip cg"
                  title="Search this recommendation on Google Shopping"
                  style={{
                    textDecoration: "none",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    fontSize: "11px",
                  }}
                >
                  🛒 Buy
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {result.prevention && (
        <div
          style={{
            padding: "11px 13px",
            background: "var(--gdim)",
            borderRadius: "9px",
            border: "1px solid var(--g3)",
            marginBottom: "12px",
          }}
        >
          <div className="mono xs tg mb1" style={{ letterSpacing: ".08em" }}>
            PREVENTION
          </div>
          <p className="xs t2" style={{ lineHeight: 1.6 }}>
            {result.prevention}
          </p>
        </div>
      )}

      {speechErr && (
        <p className="xs mb2" style={{ color: "var(--red)" }}>
          {speechErr}
        </p>
      )}

      <button
        className={`btn w100 mb2 ${isPlaying ? "btn-r" : "btn-o"}`}
        onClick={toggleSpeech}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {isPlaying ? <StopIcon size={16} /> : <SpeakerIcon size={16} />}
        <span className="bold">
          {isPlaying ? "Stop Audio" : "Listen to Diagnosis"}
        </span>
      </button>

      <button
        className="btn btn-o w100 mb3"
        style={{ borderColor: "var(--g2)", color: "var(--g2)" }}
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("open-encyclopedia", {
              detail: { query: result.disease },
            }),
          );
        }}
      >
        View in Disease Encyclopedia
      </button>

      <button className="btn btn-o w100 btn-sm mb2" onClick={onReset}>
        Scan Another Image
      </button>

      <button className="btn btn-o w100 btn-sm" onClick={copyResult}>
        Copy result
      </button>

      {result.crop &&
        result.crop !== "Unknown" &&
        result.disease !== "Healthy Plant" && (
          <button
            className="btn btn-o w100 btn-sm"
            style={{
              marginTop: "8px",
              borderColor: "var(--green)",
              color: "var(--green)",
            }}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("autofill-fert", {
                  detail: { crop: result.crop },
                }),
              )
            }
          >
            Calculate Fertilizer for {result.crop}
          </button>
        )}

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "8px",
          padding: "9px",
          background: "#25D366",
          borderRadius: "9px",
          color: "#fff",
          fontWeight: 700,
          fontSize: "13px",
          textDecoration: "none",
          transition: "opacity .2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = ".85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Share on WhatsApp
      </a>

      {result.confidence < 60 && (
        <div
          style={{
            marginTop: "10px",
            padding: "12px",
            background: "var(--adim)",
            border: "1px solid #92400e",
            borderRadius: "10px",
          }}
        >
          <div
            className="mono xs"
            style={{
              color: "var(--amber)",
              letterSpacing: ".06em",
              marginBottom: "6px",
            }}
          >
            LOW CONFIDENCE — TIPS TO IMPROVE
          </div>
          <div className="xs t2" style={{ lineHeight: 1.6 }}>
            {result.confidence < 40 && (
              <div style={{ marginBottom: "4px" }}>
                Image may be too dark - try natural sunlight
              </div>
            )}
            <div style={{ marginBottom: "4px" }}>
              Too far from leaf - fill the frame with one affected leaf
            </div>
            <div style={{ marginBottom: "4px" }}>
              Image appears blurry - hold camera steady
            </div>
          </div>
          <button
            className="btn btn-o btn-sm"
            style={{
              marginTop: "8px",
              borderColor: "var(--amber)",
              color: "var(--amber)",
            }}
            onClick={onReset}
          >
            Retake Photo
          </button>
        </div>
      )}

      <CropDoctorChat
        crop={result.crop}
        disease={result.disease}
        severity={result.severity}
      />
    </div>
  );
}
