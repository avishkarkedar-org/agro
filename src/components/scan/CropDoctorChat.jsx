/* SCAN_SPLIT_R110 - AI crop doctor follow-up chat, extracted from
 * AgroIntelScan.jsx.
 *
 * One fix over the original: the error branch rendered '"? " + e.message',
 * which showed the farmer a literal question mark followed by a raw exception
 * string. Almost certainly a mojibaked emoji that lost its character in an
 * earlier edit. Replaced with a plain sentence. */

import { useState } from "react";
import { API } from "../../context/SettingsContext";
import { safeGetLS } from "../../utils/helpers";

const MAX_QUESTIONS = 3;

export default function CropDoctorChat({ crop, disease, severity }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const questionsAsked = messages.filter((m) => m.role === "user").length;

  const ask = async () => {
    if (!input.trim() || loading || questionsAsked >= MAX_QUESTIONS) return;
    const q = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const userLang = safeGetLS("krishi_scan_lang") || safeGetLS("agrointel_lang") || "en";
      const r = await fetch(`${API}/api/crop-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          crop,
          disease,
          severity,
          lang: userLang,
          stream: true,
        }),
      });
      if (!r.ok) throw new Error("Could not reach the AI service.");

      setMessages((prev) => [...prev, { role: "ai", text: "" }]);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || ""; // Keep uncompleted line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") break;
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.text) {
              aiText += data.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  text: aiText,
                };
                return next;
              });
            }
          } catch (e) {
            if (e.message && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }

      /* The stream can close having sent nothing at all - an upstream error
       * event, or a dropped connection. An empty grey bubble looks like the app
       * hung, so say something instead. */
      if (!aiText) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            text: "No answer came back. Please try asking again.",
          };
          return next;
        });
      }
    } catch (e) {
      const msg = e?.message || "Something went wrong.";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai" && !last.text) {
          next[next.length - 1] = { ...last, text: msg };
        } else {
          next.push({ role: "ai", text: msg });
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "12px",
        background: "var(--s2)",
        border: "1px solid var(--b1)",
        borderRadius: "10px",
      }}
    >
      <div className="mono xs tg mb2" style={{ letterSpacing: ".06em" }}>
        AI CROP DOCTOR — Ask follow-up questions
      </div>
      {messages.map((m, i) => (
        <div
          key={i}
          style={{
            marginBottom: "8px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: m.role === "user" ? "var(--gdim)" : "var(--s3)",
            borderLeft:
              m.role === "user"
                ? "3px solid var(--green)"
                : "3px solid var(--blue)",
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: "9px",
              color: m.role === "user" ? "var(--green)" : "var(--blue)",
              marginBottom: "3px",
            }}
          >
            {m.role === "user" ? "YOU" : "AI DOCTOR"}
          </div>
          <div className="xs t2" style={{ lineHeight: 1.5 }}>
            {m.text}
          </div>
        </div>
      ))}
      {loading && (
        <div className="xs t3" style={{ padding: "6px 0" }} aria-live="polite">
          Thinking...
        </div>
      )}
      {questionsAsked < MAX_QUESTIONS ? (
        <div className="flex gap2 mt2">
          <input
            className="input"
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Ask the AI crop doctor a follow-up question"
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask about this diagnosis..."
          />
          <button
            className="btn btn-g btn-sm"
            onClick={ask}
            disabled={loading || !input.trim()}
          >
            Ask
          </button>
        </div>
      ) : (
        <div className="xs t3 mt2">
          {MAX_QUESTIONS}/{MAX_QUESTIONS} questions used. Scan again for more.
        </div>
      )}
      <div className="mono t3 mt1" style={{ fontSize: "9px" }}>
        {questionsAsked}/{MAX_QUESTIONS} questions used
      </div>
    </div>
  );
}
