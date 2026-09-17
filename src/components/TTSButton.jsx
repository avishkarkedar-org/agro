import { useState, useEffect } from "react";
import { safeGetLS } from "../utils/helpers";

function ttsLang() {
  const v = safeGetLS("agrointel_lang") || safeGetLS("krishi_scan_lang") || "en";
  if (v === "hi" || v === "mr") return "hi-IN";
  return "en-IN";
}

export default function TTSButton({ text, label }) {
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = ttsLang();
      utterance.rate = 0.95;
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    }
  };

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel?.();
    },
    [],
  );

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return (
    <button
      onClick={toggle}
      className="btn btn-o btn-sm"
      style={{
        padding: "4px 10px",
        fontSize: "11px",
        borderColor: playing ? "var(--red)" : "var(--b2)",
        color: playing ? "var(--red)" : "var(--t2)",
      }}
      title={label || "Listen"}
      aria-label={label || "Listen"}
    >
      {playing ? "⏹️ Stop" : "🔊 Listen"}
    </button>
  );
}
