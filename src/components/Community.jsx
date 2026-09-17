import React, { useState, useEffect, useRef } from "react";
import { Mic, MessageCircle, Share2, Heart, ShieldAlert, CheckCircle, Plus, Search } from "lucide-react";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import { API, useSettings } from "../context/SettingsContext";
import { confirmAction } from "../utils/confirm";

const IMG_TAG = "[IMG:";
function extractImg(body) {
  const s = body || "";
  const start = s.indexOf(IMG_TAG);
  if (start === -1) return null;
  const end = s.indexOf("]", start + IMG_TAG.length);
  if (end === -1) return null;
  const url = s.slice(start + IMG_TAG.length, end).trim();
  return url || null;
}
function stripImg(body) {
  const s = body || "";
  const start = s.indexOf(IMG_TAG);
  if (start === -1) return s;
  const end = s.indexOf("]", start + IMG_TAG.length);
  if (end === -1) return s;
  return (s.slice(0, start) + s.slice(end + 1)).trim();
}

function ReplyModal({ user, postId, onClose, onPost }) {
  const [body, setBody] = useState("");
  const fallback = user ? (typeof user === "string" ? user.split("@")[0] : user.username || user.email?.split("@")[0] || "Farmer") : "Farmer";
  const [name, setName] = useState(String(fallback));
  const [loc, setLoc] = useState("");
  const ok = body.trim() && name.trim();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!ok || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/posts/${postId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), author: name.trim(), loc: loc.trim() || "Local Farmer" }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || "Server error " + r.status);
      }
      const d = await r.json();
      if (!d.reply) throw new Error("Malformed server response");
      onPost(d.reply);
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Reply posted successfully!" }),
      );
      onClose();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: "Failed to post reply: " + err.message,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg fade-in" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div className="flex jcb aic mb3">
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800 }}>Post a Reply</h3>
            <p className="xs t2 mt1">Share your advice with this farmer</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <label className="xs bold t2 mb1" style={{ display: "block" }}>Your Advice / Solution *</label>
        <textarea
          className="input mb3"
          rows="4"
          placeholder="Type your reply, recommended dosage, or treatment..."
          aria-label="Your reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: "90px" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div>
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Your Name *</label>
            <input
              className="input"
              placeholder="e.g. Ramesh Patil"
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Your Location</label>
            <input
              className="input"
              placeholder="e.g. Nashik, MH"
              aria-label="Your location"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap2" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-o btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-g btn-sm"
            disabled={!ok || submitting}
            onClick={submit}
          >
            {submitting ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AskModal({ user, onClose, onPost }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const fallback = user ? (typeof user === "string" ? user.split("@")[0] : user.username || user.email?.split("@")[0] || "Farmer") : "Farmer";
  const [name, setName] = useState(String(fallback));
  const [loc, setLoc] = useState("");
  const [tag, setTag] = useState("General");
  const [imgUrl, setImgUrl] = useState("");
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ok = title.trim() && body.trim() && name.trim();

  const startVoice = (setField) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: "Voice input not supported in this browser. Please type.",
        }),
      );
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-IN";
      rec.onstart = () => setListening(true);
      rec.onresult = (e) =>
        setField((p) => p + (p ? " " : "") + e.results[0][0].transcript);
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const submit = async () => {
    if (!ok || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() + (imgUrl.trim() ? "\n[IMG:" + imgUrl.trim() + "]" : ""),
          tag,
          loc: loc.trim() || "Maharashtra",
          author: name.trim(),
          emoji: "👨‍🌾",
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || "Server error " + r.status);
      }
      const newPost = await r.json();
      onPost({ ...newPost, isNew: true });
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Question published to Community!" }),
      );
      onClose();
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: "Saved locally (" + e.message + ")",
        }),
      );
      onPost({
        id: Date.now(),
        author: name.trim() || "Farmer",
        loc: loc.trim() || "Maharashtra",
        time: "Just now",
        emoji: "👨‍🌾",
        title: title.trim(),
        body: body.trim() + (imgUrl.trim() ? "\n[IMG:" + imgUrl.trim() + "]" : ""),
        tag,
        likes: 0,
        replies: 0,
        isNew: true,
      });
      setTimeout(() => onClose(), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg fade-in" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div className="flex jcb aic mb3">
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: 800 }}>Ask the Community</h3>
            <p className="xs t2 mt1">Get fast answers from thousands of verified farmers & experts</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <label className="xs bold t2 mb1" style={{ display: "block" }}>Your Name *</label>
        <input
          className="input mb2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rajendra Patil"
        />

        <div className="flex aic jcb mb1">
          <label className="xs bold t2" style={{ margin: 0 }}>Question Title *</label>
          <button
            className="btn btn-o"
            style={{
              padding: "3px 8px",
              fontSize: "11.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              minHeight: "28px",
              height: "28px",
              borderColor: listening ? "var(--red)" : "var(--ds-line-2)",
              color: listening ? "var(--red)" : "var(--ds-text-2)",
              borderRadius: "6px",
            }}
            onClick={() => startVoice(setTitle)}
            type="button"
          >
            <Mic size={12} /> {listening ? "Listening..." : "Speak"}
          </button>
        </div>
        <input
          className="input mb3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Why are my tomato leaves turning yellow with brown spots?"
        />

        <div className="flex aic jcb mb1">
          <label className="xs bold t2" style={{ margin: 0 }}>Problem Details & Symptoms *</label>
          <button
            className="btn btn-o"
            style={{
              padding: "3px 8px",
              fontSize: "11.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              minHeight: "28px",
              height: "28px",
              borderColor: listening ? "var(--red)" : "var(--ds-line-2)",
              color: listening ? "var(--red)" : "var(--ds-text-2)",
              borderRadius: "6px",
            }}
            onClick={() => startVoice(setBody)}
            type="button"
          >
            <Mic size={12} /> {listening ? "Listening..." : "Speak"}
          </button>
        </div>
        <textarea
          className="input mb3"
          rows="3"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Crop stage, soil type, weather condition, fertilizers applied..."
          style={{ minHeight: "80px" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Crop / Category</label>
            <select
              className="input"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {[
                "General",
                "Tomato",
                "Wheat",
                "Soybean",
                "Sugarcane",
                "Grape",
                "Potato",
                "Cotton",
                "Rice",
                "Maize",
                "Onion",
                "Banana",
                "Fertilizer",
                "Pest",
                "Weather",
                "Irrigation",
              ].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Village / District</label>
            <input
              className="input"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="e.g. Baramati, Pune"
            />
          </div>
        </div>

        <label className="xs bold t2 mb1" style={{ display: "block" }}>Photo URL (Optional)</label>
        <input
          className="input mb4"
          value={imgUrl}
          onChange={(e) => setImgUrl(e.target.value)}
          placeholder="Paste image URL (from WhatsApp, Google Photos, or imgur)"
        />

        <button
          className="btn btn-g w100"
          style={{ padding: "12px", opacity: ok ? 1 : 0.4 }}
          disabled={!ok || submitting}
          onClick={submit}
        >
          {submitting ? "Publishing..." : "Post to Community"}
        </button>
      </div>
    </div>
  );
}

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [modal, setModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("agrointel_liked_posts")) || {};
    } catch {
      return {};
    }
  });
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => safeGetLS("agrointel_user") || null);
  const [experts, setExperts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const { settings } = useSettings();

  const tags = [
    "All",
    "General",
    "Tomato",
    "Wheat",
    "Sugarcane",
    "Grape",
    "Potato",
    "Cotton",
    "Rice",
    "Maize",
    "Soybean",
    "Onion",
    "Banana",
    "Fertilizer",
    "Pest",
    "Weather",
    "Irrigation",
  ];

  useEffect(() => {
    const abortController = new AbortController();
    fetch(`${API}/api/posts`, { signal: abortController.signal })
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const onAuthChange = () => setUser(safeGetLS("agrointel_user") || null);
    window.addEventListener("agrointel-auth-change", onAuthChange);
    return () => window.removeEventListener("agrointel-auth-change", onAuthChange);
  }, []);

  useEffect(() => {
    if (settings?.verified_experts && Array.isArray(settings.verified_experts)) {
      setExperts(settings.verified_experts.map((e) => String(e).toLowerCase()));
    }
  }, [settings]);

  const toggleLike = async (id) => {
    if (liked[id]) return;
    const next = { ...liked, [id]: true };
    setLiked(next);
    try {
      localStorage.setItem("agrointel_liked_posts", JSON.stringify(next));
    } catch {}
    setPosts((p) =>
      p.map((pp) => (pp.id === id ? { ...pp, likes: (pp.likes || 0) + 1 } : pp))
    );
    try {
      await fetch(`${API}/api/posts/${id}/like`, { method: "POST" });
    } catch {}
  };

  const reportPost = async (post) => {
    const ok = await confirmAction(
      "Report this question/reply for spam, abuse, or incorrect advice?",
      { danger: true, confirmText: "Report" },
    );
    if (!ok) return;
    try {
      await fetch(`${API}/api/bugs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Reported post #${post.id}: ${(post.title || "").slice(0, 80)}`,
          description: `Reported by ${user ? (typeof user === "string" ? user : user.username || "user") : "Guest"}. Post author: ${post.author}. Content: ${(post.body || "").slice(0, 300)}`,
          user_identifier: typeof user === "string" ? user : user?.username || "Guest",
        }),
      });
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Thank you. Post flagged for moderation." }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Could not submit report right now." }),
      );
    }
  };

  const mainPosts = posts.filter((p) => p.tag !== "Reply");
  const allReplies = posts.filter((p) => p.tag === "Reply");

  const filtered = mainPosts
    .filter((p) => (filter === "All" ? true : p.tag === filter))
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.body && p.body.toLowerCase().includes(q)) ||
        (p.author && p.author.toLowerCase().includes(q)) ||
        (p.loc && p.loc.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sortBy === "replies") return (b.replies || 0) - (a.replies || 0);
      return (b.id || 0) - (a.id || 0);
    });

  const getTagColor = (t) => {
    switch (t) {
      case "Pest": return "cr";
      case "Weather": return "cb";
      case "Fertilizer": return "cg";
      case "Irrigation": return "cb";
      case "Tomato": case "Wheat": case "Cotton": return "ca";
      default: return "cx";
    }
  };

  return (
    <div className="card mt3" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header Bar */}
      <div
        className="card-hd"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "14px 18px",
          borderBottom: "1px solid var(--ds-line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="card-title" style={{ fontSize: "16.5px", fontWeight: 800 }}>
            🌾 Farmer Community
          </span>
          <span className="chip cg xs">LIVE DISCUSSIONS</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {user ? (
            <div className="xs t2" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>
                🧑‍🌾 {typeof user === "string" ? user.split("@")[0] : user.username || "Farmer"}
              </span>
              <button
                onClick={() => {
                  setUser(null);
                  window.localStorage.removeItem("agrointel_user");
                  window.localStorage.removeItem("agrointel_username");
                  window.dispatchEvent(new CustomEvent("agrointel-auth-change"));
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--red, #ef4444)",
                  cursor: "pointer",
                  fontSize: "11px",
                  padding: "2px 4px",
                }}
                title="Log out"
              >
                (Logout)
              </button>
            </div>
          ) : (
            <button
              className="btn btn-o btn-sm"
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Login
            </button>
          )}

          <button
            className="btn btn-g btn-sm"
            onClick={() => {
              if (!user) {
                return window.dispatchEvent(new CustomEvent("open-auth-modal"));
              }
              setModal(true);
            }}
            style={{
              padding: "6px 14px",
              fontSize: "12.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 700,
            }}
          >
            <Plus size={14} /> Ask Question
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar (Horizontal scrolling) */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--ds-line)",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`filter-btn${filter === t ? " active" : ""}`}
            style={{
              padding: "5px 12px",
              fontSize: "12.5px",
              borderRadius: "20px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              fontWeight: filter === t ? 700 : 500,
              background: filter === t ? "var(--ds-accent, #22c55e)" : "var(--ds-surface-2)",
              color: filter === t ? "#ffffff" : "var(--ds-text-2)",
              border: filter === t ? "1px solid var(--ds-accent)" : "1px solid var(--ds-line)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search & Sort Toolbar */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
          background: "var(--ds-surface-2)",
          borderBottom: "1px solid var(--ds-line)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ds-text-3)",
            }}
          />
          <input
            className="input"
            style={{
              paddingLeft: "30px",
              paddingTop: "6px",
              paddingBottom: "6px",
              fontSize: "13px",
              borderRadius: "8px",
              height: "34px",
            }}
            placeholder="Search questions or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span className="xs t3">Sort:</span>
          <select
            className="input"
            aria-label="Sort posts"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "5px 30px 5px 10px",
              fontSize: "12.5px",
              height: "34px",
              borderRadius: "8px",
              width: "auto",
            }}
          >
            <option value="recent">Newest</option>
            <option value="likes">Most Liked</option>
            <option value="replies">Most Replies</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div
        style={{
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {loading && (
          <div style={{ padding: "8px 0" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: "16px",
                  background: "var(--ds-surface-2)",
                  borderRadius: "14px",
                  marginBottom: "10px",
                  border: "1px solid var(--ds-line)",
                }}
              >
                <div className="flex gap2 mb2">
                  <div
                    className="skel"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="skel skel-line w80" style={{ height: "14px", marginBottom: "6px" }} />
                    <div className="skel skel-line w40" style={{ height: "10px" }} />
                  </div>
                </div>
                <div className="skel skel-line w100" style={{ height: "12px", marginBottom: "6px" }} />
                <div className="skel skel-line w60" style={{ height: "12px" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="tc fade-in" style={{ padding: "40px 16px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🌾</div>
            <p className="bold" style={{ fontSize: "16px", marginBottom: "6px" }}>
              {search ? "No matching questions found" : "No questions in this category yet"}
            </p>
            <p className="sm t2" style={{ lineHeight: 1.6, marginBottom: "18px" }}>
              {search ? "Try searching for a different keyword or clear your filter." : "Be the first farmer to ask a question and get expert advice!"}
            </p>
            <button
              className="btn btn-g btn-sm"
              onClick={() => {
                if (!user) {
                  return window.dispatchEvent(new CustomEvent("open-auth-modal"));
                }
                setModal(true);
              }}
            >
              + Ask Question
            </button>
          </div>
        )}

        {filtered.slice(0, visibleCount).map((p) => {
          const postReplies = allReplies.filter((r) => r.title === `REPLY:${p.id}`);
          const isExpertAuthor = experts.includes(String(p.author || "").toLowerCase());

          return (
            <div
              key={p.id}
              className={`post-card${p.isNew ? " new-post" : ""}`}
              style={{
                background: "var(--ds-surface)",
                border: "1px solid var(--ds-line)",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              {/* Post Author Row */}
              <div className="flex gap3 mb2" style={{ alignItems: "center" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: isExpertAuthor ? "var(--ds-accent-soft)" : "var(--ds-surface-2)",
                    border: "1px solid var(--ds-line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {p.emoji || "🧑‍🌾"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bold sm flex aic gap2" style={{ color: "var(--ds-text)" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.author}
                    </span>
                    {isExpertAuthor && (
                      <span
                        className="chip xs"
                        style={{
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          padding: "1px 6px",
                          fontSize: "9.5px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ✓ Verified Expert
                      </span>
                    )}
                  </div>
                  <div className="mono t3 xs" style={{ fontSize: "11px", marginTop: "2px" }}>
                    📍 {p.loc || "India"} · {p.time || "Recently"}
                  </div>
                </div>
                <span
                  className={`chip ${getTagColor(p.tag)} xs`}
                  style={{ fontSize: "10px", alignSelf: "flex-start", flexShrink: 0 }}
                >
                  {p.tag}
                </span>
              </div>

              {/* Title & Body */}
              <h4
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  fontFamily: "var(--sans)",
                  lineHeight: 1.45,
                  marginBottom: "8px",
                  color: "var(--ds-text)",
                }}
              >
                {p.title}
              </h4>
              <p
                className="sm t2"
                style={{
                  lineHeight: 1.6,
                  marginBottom: "12px",
                  whiteSpace: "pre-line",
                  wordBreak: "break-word",
                }}
              >
                {stripImg(p.body)}
              </p>

              {/* Attached Photo */}
              {extractImg(p.body) && (
                <div style={{ marginBottom: "12px", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--ds-line)" }}>
                  <img
                    src={extractImg(p.body)}
                    alt="Question attachment"
                    loading="lazy"
                    style={{
                      width: "100%",
                      maxHeight: "280px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              )}

              {/* Action Buttons Row (Smartphone Optimized Responsive Flex) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--ds-line)",
                }}
              >
                {/* Left: Like & Replies */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className={`like-btn${liked[p.id] ? " liked" : ""}`}
                    onClick={() => toggleLike(p.id)}
                    aria-label={liked[p.id] ? "You liked this post" : "Like this post"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: liked[p.id] ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--ds-line)",
                      background: liked[p.id] ? "rgba(239, 68, 68, 0.1)" : "var(--ds-surface-2)",
                      color: liked[p.id] ? "#ef4444" : "var(--ds-text-2)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Heart size={13} fill={liked[p.id] ? "#ef4444" : "none"} color={liked[p.id] ? "#ef4444" : "currentColor"} />
                    <span>{p.likes || 0}</span>
                  </button>

                  <span
                    className="xs t3"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      background: "var(--ds-surface-2)",
                      fontSize: "11.5px",
                    }}
                  >
                    <MessageCircle size={12} /> {postReplies.length} {postReplies.length === 1 ? "reply" : "replies"}
                  </span>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    className="btn btn-o btn-sm"
                    style={{
                      padding: "5px 10px",
                      fontSize: "11.5px",
                      minHeight: "28px",
                      height: "28px",
                      borderColor: "#25D366",
                      color: "#25D366",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() =>
                      window.open(
                        "https://wa.me/?text=" +
                          encodeURIComponent(
                            "AgroIntel Community Question: " +
                              p.title +
                              "\n\n" +
                              (p.body || "").substring(0, 120) +
                              "...\n\nRead & Answer on AgroIntel!",
                          ),
                        "_blank",
                      )
                    }
                    title="Share on WhatsApp"
                  >
                    <Share2 size={12} /> Share
                  </button>

                  <button
                    className="btn btn-g btn-sm"
                    style={{
                      padding: "5px 12px",
                      fontSize: "11.5px",
                      minHeight: "28px",
                      height: "28px",
                      borderRadius: "8px",
                    }}
                    onClick={() => setReplyTo(p.id)}
                  >
                    Reply
                  </button>

                  <button
                    className="btn btn-o btn-sm"
                    onClick={() => reportPost(p)}
                    aria-label="Report this post"
                    style={{
                      padding: "5px 8px",
                      fontSize: "11px",
                      borderRadius: "8px",
                      opacity: 0.6,
                    }}
                    title="Report"
                  >
                    <ShieldAlert size={12} />
                  </button>
                </div>
              </div>

              {/* Nested Replies Section */}
              {postReplies.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--ds-line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div className="xs bold t3" style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    💬 {postReplies.length} {postReplies.length === 1 ? "Answer" : "Answers"}
                  </div>

                  {postReplies
                    .sort((a, b) => {
                      const ae = experts.includes(String(a.author || "").toLowerCase()) ? 1 : 0;
                      const be = experts.includes(String(b.author || "").toLowerCase()) ? 1 : 0;
                      return be - ae;
                    })
                    .map((r) => {
                      const isReplyExpert = experts.includes(String(r.author || "").toLowerCase());
                      return (
                        <div
                          key={r.id}
                          style={{
                            background: isReplyExpert ? "rgba(59, 130, 246, 0.06)" : "var(--ds-surface-2)",
                            border: isReplyExpert ? "1px solid rgba(59, 130, 246, 0.25)" : "1px solid var(--ds-line)",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          <div style={{ fontSize: "16px", flexShrink: 0, marginTop: "2px" }}>
                            {r.emoji || "🧑‍🌾"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="xs bold flex aic gap2" style={{ marginBottom: "3px" }}>
                              <span style={{ color: "var(--ds-text)" }}>{r.author}</span>
                              {isReplyExpert && (
                                <span
                                  style={{
                                    color: "#3b82f6",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    background: "rgba(59, 130, 246, 0.15)",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Expert Answer
                                </span>
                              )}
                              <span className="t3" style={{ fontWeight: 400, marginLeft: "auto", fontSize: "10.5px" }}>
                                {r.loc ? `📍 ${r.loc} · ` : ""}{r.time || "Recently"}
                              </span>
                            </div>
                            <div className="xs t2" style={{ lineHeight: 1.5, wordBreak: "break-word" }}>
                              {r.body}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length > visibleCount && (
          <div className="tc mt2 mb2">
            <button
              className="btn btn-o btn-sm"
              onClick={() => setVisibleCount((v) => v + 10)}
              style={{ padding: "8px 18px", borderRadius: "10px" }}
            >
              Load more questions ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {modal && (
        <AskModal
          user={user}
          onClose={() => setModal(false)}
          onPost={(p) => setPosts((prev) => [p, ...prev])}
        />
      )}
      {replyTo && (
        <ReplyModal
          user={user}
          postId={replyTo}
          onClose={() => setReplyTo(null)}
          onPost={(p) =>
            setPosts((prev) =>
              [p, ...prev].map((pp) =>
                pp.id === replyTo
                  ? { ...pp, replies: (pp.replies || 0) + 1 }
                  : pp,
              ),
            )
          }
        />
      )}
    </div>
  );
}
