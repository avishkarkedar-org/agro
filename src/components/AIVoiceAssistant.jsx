import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send } from "lucide-react";
import { useSettings, API } from "../context/SettingsContext";

const LANGS = [
  { code: "en-IN", label: "English", native: "English" },
  { code: "hi-IN", label: "हिंदी", native: "हिंदी" },
  { code: "mr-IN", label: "मराठी", native: "मराठी" },
];

const T = {
  "en-IN": {
    title: "AgroIntel Assistant",
    tap: "Tap the mic and speak",
    stop: "Listening… Tap to stop",
    interrupt: "Speaking… Tap to interrupt",
    thinking: "Thinking…",
    clear: "Clear",
    hint: "Ask about weather, mandi prices, crops, schemes, fuel…",
    micErr: "Microphone error. Please try again or type below.",
    offline: "Sorry, I am having trouble connecting right now.",
    you: "You",
    ai: "AgroIntel",
    typePlaceholder: "Type your question here…",
    unsupportedMsg: "Voice input isn't supported in this browser. You can type or tap a topic below!",
  },
  "hi-IN": {
    title: "AgroIntel वॉइस",
    tap: "बोलने के लिए माइक दबाएँ",
    stop: "सुन रहा हूँ… रोकने के लिए दबाएँ",
    interrupt: "बोल रहा हूँ… रोकने के लिए दबाएँ",
    thinking: "सोच रहा हूँ…",
    clear: "साफ़ करें",
    hint: "मौसम, मंडी भाव, फसल, योजनाएँ पूछें…",
    micErr: "माइक्रोफ़ोन त्रुटि। पुनः प्रयास करें या नीचे लिखें।",
    offline: "क्षमा करें, अभी कनेक्ट नहीं हो पा रहा है.",
    you: "आप",
    ai: "AgroIntel",
    typePlaceholder: "अपना प्रश्न यहाँ लिखें…",
    unsupportedMsg: "इस ब्राउज़र में आवाज़ पहचान समर्थित नहीं है। आप नीचे टाइप कर सकते हैं!",
  },
  "mr-IN": {
    title: "AgroIntel व्हॉइस",
    tap: "बोलण्यासाठी माइक दाबा",
    stop: "ऐकत आहे… थांबवण्यासाठी दाबा",
    interrupt: "बोलत आहे… थांबवण्यासाठी दाबा",
    thinking: "विचार करत आहे…",
    clear: "साफ करा",
    hint: "हवामान, बाजारभाव, पिके, योजना विचारा…",
    micErr: "मायक्रोफोन त्रुटी. पुन्हा प्रयत्न करा किंवा खाली टाइप करा.",
    offline: "क्षमस्व, सध्या कनेक्ट होऊ शकत नाही.",
    you: "तुम्ही",
    ai: "AgroIntel",
    typePlaceholder: "तुमचा प्रश्न येथे टाइप करा…",
    unsupportedMsg: "या ब्राउझरमध्ये व्हॉइस इनपुट समर्थित नाही. कृपया खाली टाइप करा!",
  },
};

const CHIPS = {
  "en-IN": ["Today's weather", "Mandi prices", "Govt schemes", "Fertilizer dose"],
  "hi-IN": ["आज का मौसम", "मंडी भाव", "सरकारी योजनाएँ", "खाद की मात्रा"],
  "mr-IN": ["आजचे हवामान", "बाजारभाव", "सरकारी योजना", "खताचे प्रमाण"],
};

const SHARE_LABEL = { "en-IN": "Share", "hi-IN": "साझा करें", "mr-IN": "शेअर करा" };

const Logo = () => (
  <Mic className="ksv-logo-svg" size={28} color="#fff" strokeWidth={1.75} />
);

export default function AIVoiceAssistant() {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [lang, setLang] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("ks_voice_lang")) || "en-IN"
  );

  const t = T[lang] || T["en-IN"];
  const whoClass = lang === "en-IN" ? "ksv-msg-who" : "ksv-msg-who ksv-msg-who-deva";
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const voicesRef = useRef([]);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const messagesRef = useRef([]);
  const convoEndRef = useRef(null);

  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    messagesRef.current = messages;
    if (convoEndRef.current) convoEndRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ks_voice_lang", lang);
  }, [lang]);

  // Load and cache browser voices
  useEffect(() => {
    const synth = synthRef.current;
    if (!synth) return undefined;
    const loadVoices = () => {
      const v = synth.getVoices ? synth.getVoices() : [];
      if (v && v.length) voicesRef.current = v;
    };
    loadVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", loadVoices);
      return () => synth.removeEventListener("voiceschanged", loadVoices);
    }
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // Sequential speech queue runner to prevent cutting off speech
  const processSpeechQueue = useCallback(() => {
    const synth = synthRef.current;
    if (!synth || speechQueueRef.current.length === 0 || isSpeakingRef.current) return;

    const nextText = speechQueueRef.current.shift();
    if (!nextText) return;

    try {
      if (synth.paused) synth.resume();

      const u = new SpeechSynthesisUtterance(nextText);
      const vs = settings?.voice_settings || {};
      const voices = (voicesRef.current && voicesRef.current.length ? voicesRef.current : synth.getVoices?.()) || [];

      const prefs = lang === "mr-IN" ? ["mr-IN", "mr", "hi-IN", "hi"] : [lang, lang.split("-")[0]];
      let match = null;
      for (const pl of prefs) {
        const low = pl.toLowerCase();
        match =
          voices.find((v) => v.lang && v.lang.toLowerCase() === low) ||
          voices.find((v) => v.lang && v.lang.toLowerCase().indexOf(low) === 0);
        if (match) break;
      }

      u.lang = match ? match.lang : lang === "mr-IN" ? "hi-IN" : lang;
      u.pitch = typeof vs.pitch === "number" ? vs.pitch : 1.0;
      u.rate = typeof vs.rate === "number" ? vs.rate : 1.0;
      if (match) u.voice = match;

      u.onstart = () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
      };

      const handleDone = () => {
        isSpeakingRef.current = false;
        if (speechQueueRef.current.length > 0) {
          processSpeechQueue();
        } else {
          setIsSpeaking(false);
        }
      };

      u.onend = handleDone;
      u.onerror = handleDone;

      synth.speak(u);
    } catch (e) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [lang, settings]);

  const speak = useCallback(
    (text) => {
      if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
      speechQueueRef.current.push(text);
      processSpeechQueue();
    },
    [processSpeechQueue]
  );

  const stopSpeaking = useCallback(() => {
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (_) {}
    }
  }, []);

  const handleSendToAI = useCallback(
    async (text) => {
      const clean = (text || "").trim();
      if (!clean) return;

      stopSpeaking();
      const history = [...messagesRef.current, { role: "user", content: clean }].slice(-12);
      setMessages(history);
      setIsThinking(true);
      setTranscript("");
      setError("");

      try {
        const _now = new Date();
        const _dateStr = _now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const _timeStr =
          _now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }) + " IST";

        const _ctxParts = [`Today is ${_dateStr}`, `Current time is ${_timeStr}`];

        try {
          const _wCache = JSON.parse(localStorage.getItem("ks_weather_summary") || "null");
          if (_wCache && _wCache.summary && Date.now() - _wCache.ts < 1800000) {
            _ctxParts.push(`Current weather: ${_wCache.summary}`);
          }
        } catch (_e) {}

        try {
          const mandiList = settings?.mandi_prices || [];
          if (mandiList.length > 0) {
            const mSummary = mandiList
              .slice(0, 8)
              .map((m) => `${m.crop || m.name}: ₹${m.price}/${m.unit || "quintal"} (${m.market || "APMC"})`)
              .join(", ");
            _ctxParts.push(`Live Mandi Prices: ${mSummary}`);
          }
        } catch (_e) {}

        try {
          const fuelRates = settings?.fuel_prices;
          if (fuelRates && (fuelRates.diesel || fuelRates.petrol)) {
            _ctxParts.push(`Fuel rates in Maharashtra: Diesel ₹${fuelRates.diesel || 89.5}/L, Petrol ₹${fuelRates.petrol || 104.5}/L`);
          }
        } catch (_e) {}

        if (settings?.announcement) {
          _ctxParts.push(`Latest portal announcement: ${settings.announcement}`);
        }

        const _clientCtx = _ctxParts.join(". ") + ".";
        const res = await fetch(`${API}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ messages: history, client_context: _clientCtx, lang: lang, stream: true }),
        });

        if (!res.ok) throw new Error("API Error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";
        let sentenceBuffer = "";
        setIsThinking(false);

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const processSentence = (sentence) => {
          const cleanForSpeech = sentence
            .replace(/[*#_~`>]/g, "")
            .replace(/°C/g, " degrees Celsius")
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
            .trim();
          if (cleanForSpeech) speak(cleanForSpeech);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                const token = parsed.text || parsed.chunk || "";
                fullText += token;
                sentenceBuffer += token;

                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: fullText };
                  return updated;
                });

                const boundaryMatch = sentenceBuffer.match(/([.!?।\n]+)/);
                if (boundaryMatch) {
                  const splitIdx = boundaryMatch.index + boundaryMatch[0].length;
                  const readySentence = sentenceBuffer.slice(0, splitIdx);
                  sentenceBuffer = sentenceBuffer.slice(splitIdx);
                  processSentence(readySentence);
                }
              } catch (parseErr) {
                if (parseErr.message && !parseErr.message.includes("JSON")) {
                  throw parseErr;
                }
              }
            }
          }
        }

        if (sentenceBuffer.trim()) {
          processSentence(sentenceBuffer);
        }
      } catch (err) {
        setIsThinking(false);
        const errMsg = err.message && err.message !== "API Error" ? err.message : t.offline;
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        speak(errMsg);
      }
    },
    [speak, stopSpeaking, t, lang, settings]
  );

  // Setup SpeechRecognition instance
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return undefined;

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;

    rec.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setError("");
      setTranscript("");
      stopSpeaking();
    };

    rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      if (interim) {
        setTranscript(interim);
      }
      if (final) {
        setTranscript(final);
        setIsListening(false);
        isListeningRef.current = false;
        handleSendToAI(final);
      }
    };

    rec.onerror = (e) => {
      setIsListening(false);
      isListeningRef.current = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied. Please allow mic access in your browser or type below.");
      } else if (e.error === "network") {
        setError("Speech recognition network error. Please try again or type below.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(t.micErr);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch (_e) {}
    };
  }, [lang, handleSendToAI, stopSpeaking, t]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const toggleListen = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    stopSpeaking();
    setError("");

    if (!supported || !recognitionRef.current) {
      setError(t.unsupportedMsg);
      return;
    }

    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (_e) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            isListeningRef.current = true;
            setIsListening(true);
          } catch (err2) {
            isListeningRef.current = false;
            setIsListening(false);
            setError(t.micErr);
          }
        }, 80);
      } catch (_e2) {
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  const handleOpen = () => {
    if (settings?.login_required_features?.includes("voice")) {
      const token = typeof window !== "undefined" ? localStorage.getItem("agrointel_token") : null;
      if (!token) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        window.dispatchEvent(
          new CustomEvent("show-toast", { detail: "Please log in to use the AI Voice Assistant." })
        );
        return;
      }
    }
    setIsOpen(true);
    setError("");
    if (!supported) {
      setError(t.unsupportedMsg);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    const q = inputText.trim();
    setInputText("");
    handleSendToAI(q);
  };

  const clearChat = () => {
    setMessages([]);
    setTranscript("");
    setError("");
    stopSpeaking();
  };

  const shareChat = async () => {
    const text = messagesRef.current
      .map((m) => `${m.role === "user" ? t.you : t.ai}: ${m.content}`)
      .join("\n\n");
    if (!text) return;
    const copiedMsg = { "en-IN": "Copied ✓", "hi-IN": "कॉपी हो गया ✓", "mr-IN": "कॉपी झाले ✓" };
    try {
      if (navigator.share) {
        await navigator.share({ title: t.title, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setError(copiedMsg[lang] || copiedMsg["en-IN"]);
        setTimeout(() => setError(""), 1800);
      }
    } catch (_e) {}
  };

  const closeModal = () => {
    setIsOpen(false);
    stopSpeaking();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_e) {}
    }
    setIsListening(false);
    isListeningRef.current = false;
  };

  let orbState = "idle";
  if (isListening) orbState = "listening";
  else if (isThinking) orbState = "thinking";
  else if (isSpeaking) orbState = "speaking";

  const statusText = isListening
    ? t.stop
    : isSpeaking
      ? t.interrupt
      : isThinking
        ? t.thinking
        : t.tap;

  return (
    <>
      <style>{`
        /* BOTTOM_NAV_CLEAR_R201: raised from 96px to 160px so the voice FAB
         * clears the 64px nav bar + 22px scan button protrusion + safe area.
         * On desktop (≥769px) it drops back to 24px since nav bar hides. */
        .ksv-fab{position:fixed;bottom:calc(160px + env(safe-area-inset-bottom));right:18px;z-index:300;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(145deg,#4ade80,#15803d);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.35);transition:transform .2s ease, box-shadow .2s ease;}

        .ksv-fab:hover{transform:scale(1.06);box-shadow:0 10px 26px rgba(0,0,0,.4);}
        .ksv-fab:active{transform:scale(.94);}
        .ksv-fab .ksv-logo-svg{width:28px;height:28px;}
        @media (min-width:769px){.ksv-fab{bottom:24px;}}
        .ksv-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;animation:ksvFade .25s ease forwards;}
        .ksv-card{width:100%;max-width:440px;background:var(--clay-surface,#14201a);color:var(--text,#fff);border-radius:26px;padding:18px 18px 20px;box-shadow:8px 8px 24px rgba(0,0,0,.6),-6px -6px 18px rgba(255,255,255,.03);opacity:0;animation:ksvPop .35s cubic-bezier(.16,1,.3,1) forwards;display:flex;flex-direction:column;max-height:90vh;}
        @keyframes ksvFade{to{opacity:1;}}
        @keyframes ksvPop{from{opacity:0;transform:translateY(10px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        .ksv-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
        .ksv-brand{display:flex;align-items:center;gap:9px;min-width:0;}
        .ksv-brand .ksv-logo-svg{width:30px;height:30px;flex-shrink:0;}
        .ksv-title{font-family:var(--serif,serif);font-weight:800;font-size:17px;background:linear-gradient(135deg,#eafff0,#4ade80);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ksv-head-actions{display:flex;align-items:center;gap:8px;}
        .ksv-langs{display:flex;gap:3px;background:rgba(0,0,0,.25);padding:3px;border-radius:999px;}
        .ksv-lang{border:none;background:transparent;color:var(--t2,rgba(255,255,255,.65));font-family:var(--sans,sans-serif);font-weight:700;font-size:12px;min-width:32px;height:28px;padding:0 8px;border-radius:999px;cursor:pointer;transition:all .15s ease;}
        .ksv-lang.active{background:linear-gradient(145deg,#4ade80,#15803d);color:#08160c;box-shadow:inset 1px 1px 2px rgba(255,255,255,.25);}
        .ksv-close{border:none;background:rgba(255,255,255,.06);color:var(--t2,#bbb);width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:15px;flex-shrink:0;}
        .ksv-close:hover{background:rgba(251,113,133,.15);color:#fb7185;}
        .ksv-orb-wrap{position:relative;width:120px;height:120px;margin:4px auto 10px;display:flex;align-items:center;justify-content:center;cursor:pointer;}
        .ksv-ring{position:absolute;width:95px;height:95px;border-radius:50%;border:2px solid rgba(74,222,128,.35);opacity:0;}
        .ksv-listening .ksv-ring,.ksv-speaking .ksv-ring{animation:ksvRipple 2s ease-out infinite;}
        .ksv-listening .ksv-ring2,.ksv-speaking .ksv-ring2{animation-delay:1s;}
        .ksv-speaking .ksv-ring{border-color:rgba(139,92,246,.45);}
        @keyframes ksvRipple{0%{opacity:.6;transform:scale(.7);}100%{opacity:0;transform:scale(1.5);}}
        .ksv-orb{position:relative;z-index:2;width:94px;height:94px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .35s ease,box-shadow .35s ease;}
        .ksv-orb svg{width:38px;height:38px;color:#fff;}
        .ksv-idle .ksv-orb{background:linear-gradient(145deg,#1f3326,#16241b);box-shadow:inset 3px 3px 8px rgba(0,0,0,.5),inset -3px -3px 8px rgba(255,255,255,.04),6px 6px 16px rgba(0,0,0,.45);}
        .ksv-idle .ksv-orb svg{color:#4ade80;}
        .ksv-listening .ksv-orb{background:linear-gradient(145deg,#4ade80,#15803d);box-shadow:0 0 28px rgba(74,222,128,.55);animation:ksvBreathe 1.6s ease-in-out infinite;}
        .ksv-speaking .ksv-orb{background:linear-gradient(145deg,#8b5cf6,#6366f1);box-shadow:0 0 28px rgba(139,92,246,.55);}
        .ksv-thinking .ksv-orb{background:linear-gradient(145deg,#fbbf24,#d97706);box-shadow:0 0 24px rgba(251,191,36,.45);}
        @keyframes ksvBreathe{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}
        .ksv-bars{display:flex;align-items:center;gap:4px;height:36px;}
        .ksv-bars span{width:4px;height:10px;border-radius:3px;background:#fff;animation:ksvBar 1s ease-in-out infinite;}
        .ksv-bars span:nth-child(2){animation-delay:.15s;}
        .ksv-bars span:nth-child(3){animation-delay:.3s;}
        .ksv-bars span:nth-child(4){animation-delay:.45s;}
        .ksv-bars span:nth-child(5){animation-delay:.6s;}
        @keyframes ksvBar{0%,100%{height:8px;}50%{height:32px;}}
        .ksv-dots{display:flex;gap:6px;}
        .ksv-dots span{width:8px;height:8px;border-radius:50%;background:#fff;animation:ksvDot 1.2s ease-in-out infinite;}
        .ksv-dots span:nth-child(2){animation-delay:.2s;}
        .ksv-dots span:nth-child(3){animation-delay:.4s;}
        @keyframes ksvDot{0%,100%{transform:translateY(0);opacity:.5;}50%{transform:translateY(-6px);opacity:1;}}
        .ksv-status{text-align:center;font-size:12.5px;color:var(--t2,rgba(255,255,255,.65));margin:0 0 8px;font-weight:500;}
        .ksv-error{text-align:center;font-size:12px;color:#fb7185;margin:0 0 8px;padding:0 8px;}
        .ksv-convo{flex:1;min-height:140px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px;}
        .ksv-hint{text-align:center;color:var(--t3,rgba(255,255,255,.45));font-size:12.5px;line-height:1.45;padding:8px 6px;}
        .ksv-msg{display:flex;flex-direction:column;gap:2px;max-width:86%;padding:8px 12px;border-radius:15px;font-size:13.5px;line-height:1.45;}
        .ksv-msg-who{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.6;}
        .ksv-msg-who-deva{text-transform:none;letter-spacing:normal;font-size:11px;}
        .ksv-msg-user{align-self:flex-end;background:linear-gradient(145deg,#22c55e,#15803d);color:#fff;border-bottom-right-radius:4px;}
        .ksv-msg-assistant{align-self:flex-start;background:var(--clay-surface-2,#1a2c22);color:var(--text,#eafff0);border-bottom-left-radius:4px;}
        .ksv-msg-pending{opacity:.65;}
        .ksv-clear{display:block;margin:0 auto;background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--t2,#bbb);font-size:11.5px;font-weight:600;padding:5px 14px;border-radius:999px;cursor:pointer;}
        .ksv-clear:hover{border-color:rgba(251,113,133,.4);color:#fb7185;}
        .ksv-convo::-webkit-scrollbar{width:5px;}
        .ksv-convo::-webkit-scrollbar-thumb{background:rgba(74,222,128,.3);border-radius:10px;}
        .ksv-empty{display:flex;flex-direction:column;align-items:center;}
        .ksv-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:4px 4px 2px;}
        .ksv-chip{border:1px solid rgba(74,222,128,.35);background:rgba(74,222,128,.08);color:var(--text,#eafff0);font-family:var(--sans,sans-serif);font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;transition:all .15s ease;min-height:34px;}
        .ksv-chip:hover{background:linear-gradient(145deg,#4ade80,#15803d);color:#08160c;}
        .ksv-input-form{display:flex;align-items:center;gap:6px;margin-top:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:4px 6px 4px 14px;}
        .ksv-text-input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:13px;font-family:inherit;}
        .ksv-text-input::placeholder{color:rgba(255,255,255,.35);}
        .ksv-send-btn{border:none;background:linear-gradient(145deg,#4ade80,#15803d);color:#08160c;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s ease;flex-shrink:0;}
        .ksv-send-btn:disabled{opacity:.35;cursor:not-allowed;}
        .ksv-send-btn:not(:disabled):hover{transform:scale(1.06);}
        .ksv-actions{display:flex;gap:8px;justify-content:center;margin-top:8px;}
        @media (prefers-reduced-motion:reduce){.ksv-fab,.ksv-orb,.ksv-ring,.ksv-bars span,.ksv-dots span{animation:none !important;}}
      `}</style>

      <button className="ksv-fab" onClick={handleOpen} aria-label={t.title} title={t.title}>
        <Logo />
      </button>

      {isOpen && (
        <div className="ksv-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-label={t.title}>
          <div className="ksv-card" onClick={(e) => e.stopPropagation()}>
            <div className="ksv-head">
              <div className="ksv-brand">
                <Logo />
                <span className="ksv-title">{t.title}</span>
              </div>
              <div className="ksv-head-actions">
                <div className="ksv-langs" role="group" aria-label="Language">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      className={`ksv-lang ${lang === l.code ? "active" : ""}`}
                      onClick={() => setLang(l.code)}
                      aria-pressed={lang === l.code}
                      title={l.native}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <button className="ksv-close" onClick={closeModal} aria-label="Close">✕</button>
              </div>
            </div>

            <div
              className={`ksv-orb-wrap ksv-${orbState}`}
              onClick={toggleListen}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleListen();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={statusText}
            >
              <span className="ksv-ring ksv-ring1" aria-hidden="true"></span>
              <span className="ksv-ring ksv-ring2" aria-hidden="true"></span>
              <div className="ksv-orb">
                {orbState === "thinking" ? (
                  <div className="ksv-dots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                ) : orbState === "listening" || orbState === "speaking" ? (
                  <div className="ksv-bars" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                ) : (
                  <Mic className="ksv-logo-svg" style={{ color: "#4ade80" }} />
                )}
              </div>
            </div>

            <p className="ksv-status">{statusText}</p>
            {error ? <p className="ksv-error">{error}</p> : null}

            <div className="ksv-convo">
              {messages.length === 0 ? (
                <div className="ksv-empty">
                  <p className="ksv-hint">{t.hint}</p>
                  <div className="ksv-chips">
                    {(CHIPS[lang] || CHIPS["en-IN"]).map((c) => (
                      <button key={c} className="ksv-chip" onClick={() => handleSendToAI(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`ksv-msg ksv-msg-${m.role}`}>
                    <span className={whoClass}>{m.role === "user" ? t.you : t.ai}</span>
                    <span className="ksv-msg-text">{m.content}</span>
                  </div>
                ))
              )}
              {isThinking || (isListening && transcript) ? (
                <div className="ksv-msg ksv-msg-user ksv-msg-pending">
                  <span className={whoClass}>{t.you}</span>
                  <span className="ksv-msg-text">{transcript || "…"}</span>
                </div>
              ) : null}
              <div ref={convoEndRef}></div>
            </div>

            <form onSubmit={handleTextSubmit} className="ksv-input-form">
              <input
                type="text"
                className="ksv-text-input"
                placeholder={t.typePlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                type="submit"
                className="ksv-send-btn"
                disabled={!inputText.trim() || isThinking}
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </form>

            {messages.length > 0 ? (
              <div className="ksv-actions">
                <button className="ksv-clear" onClick={shareChat}>
                  {SHARE_LABEL[lang] || SHARE_LABEL["en-IN"]}
                </button>
                <button className="ksv-clear" onClick={clearChat}>
                  {t.clear}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
