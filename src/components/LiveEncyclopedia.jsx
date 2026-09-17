import React, { useState, useEffect, useCallback } from "react";

const WIKI_API = "https://en.wikipedia.org/w/api.php";

function LiveEncyclopedia() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("krishi_enc_bookmarks")) || [];
    } catch {
      return [];
    }
  });
  const toggleBookmark = (item) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.pageid === item.pageid);
      const next = exists
        ? prev.filter((b) => b.pageid !== item.pageid)
        : [...prev, { pageid: item.pageid, title: item.title, snippet: item.snippet || "" }];
      try { localStorage.setItem("krishi_enc_bookmarks", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const doSearch = useCallback(async (queryOverride) => {
    const q = typeof queryOverride === "string" ? queryOverride : search;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(
        WIKI_API +
          "?action=query&list=search&srsearch=" +
          encodeURIComponent(q + " plant disease") +
          "&utf8=&format=json&origin=*",
      );
      if (!r.ok) throw new Error("API Error");
      const d = await r.json();

      const validResults = (d.query?.search || []).filter((item) => {
        const text = (item.title + " " + item.snippet).toLowerCase();
        return (
          text.includes("plant") ||
          text.includes("disease") ||
          text.includes("fung") ||
          text.includes("virus") ||
          text.includes("crop") ||
          text.includes("agricultur") ||
          text.includes("blight") ||
          text.includes("rot") ||
          text.includes("pathogen") ||
          text.includes("botany") ||
          text.includes("pest") ||
          text.includes("leaf")
        );
      });

      setResults(validResults.length > 0 ? validResults : d.query?.search || []);
      setSelected(null);
    } catch {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { msg: "Failed to fetch from Wikipedia." },
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  const startVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { msg: "Voice search is not supported in this browser." },
        }),
      );
      return;
    }
    const recognition = new SpeechRecognition();
    const activeLang = safeGetLS("agrointel_lang") || "en";
    recognition.lang =
      activeLang === "hi" ? "hi-IN" : activeLang === "mr" ? "mr-IN" : "en-IN";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setSearch(text);
      setTimeout(() => doSearch(text), 400);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  const toggleSpeech = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const activeLang = safeGetLS("agrointel_lang") || "en";
      utterance.lang =
        activeLang === "hi" || activeLang === "mr" ? "hi-IN" : "en-IN";
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };


  useEffect(() => {
    const handler = (e) => {
      if (e.detail && e.detail.query) {
        setSearch(e.detail.query);
        doSearch(e.detail.query);
      }
    };
    window.addEventListener("open-encyclopedia", handler);
    return () => window.removeEventListener("open-encyclopedia", handler);
  }, [doSearch]);

  const fetchDetails = async (title) => {
    setLoading(true);
    try {
      const [detailRes, imagesRes] = await Promise.all([
        fetch(
          WIKI_API +
            "?action=query&prop=extracts|pageimages&explaintext=1&titles=" +
            encodeURIComponent(title) +
            "&format=json&origin=*&pithumbsize=400",
        ),
        fetch(
          WIKI_API +
            "?action=query&prop=images&titles=" +
            encodeURIComponent(title) +
            "&format=json&origin=*&imlimit=10",
        ),
      ]);
      if (!detailRes.ok) throw new Error("API Error");
      const d = await detailRes.json();
      const pages = d.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (imagesRes.ok) {
        const imgData = await imagesRes.json();
        const imgPages = imgData.query?.pages;
        if (imgPages) {
          const imgPage = imgPages[Object.keys(imgPages)[0]];
          const imageNames = (imgPage.images || [])
            .filter(
              (img) =>
                img.title.match(/\\.(jpg|jpeg|png|gif|svg)$/i) &&
                !img.title.includes("Icon") &&
                !img.title.includes("Logo"),
            )
            .slice(0, 5);
          if (imageNames.length > 0) {
            const imgTitles = imageNames.map((i) => i.title).join("|");
            const urlRes = await fetch(
              WIKI_API +
                "?action=query&titles=" +
                encodeURIComponent(imgTitles) +
                "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&format=json&origin=*",
            );
            if (urlRes.ok) {
              const urlData = await urlRes.json();
              const gallery = Object.values(urlData.query?.pages || {})
                .map((p) => p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url)
                .filter(Boolean);
              page._gallery = gallery;
            }
          }
        }
      }
      setSelected(page);
    } catch {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { msg: "Failed to fetch details." },
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">Live Disease Encyclopedia</span>
        <span className="chip cg">WIKIPEDIA</span>
      </div>
      <div className="card-body">
        <div className="flex gap2 mb3">
          <div style={{ display: "flex", flex: 1, position: "relative" }}>
            <input
              className="input"
              style={{ width: "100%", paddingRight: "40px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              aria-label="Search plant diseases"
              placeholder="Search any plant disease..."
            />
            <button
              onClick={startVoiceSearch}
              aria-label="Voice search for plant diseases"
              style={{
                position: "absolute",
                right: "5px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: isListening ? "var(--red)" : "var(--green)",
              }}
              title="Voice search"
            >
              MIC
            </button>
          </div>
          <button className="btn btn-g" onClick={doSearch}>
            {loading ? "..." : "Search"}
          </button>
        </div>

        {selected ? (
          <div className="fade-in">
            <button
              className="btn btn-o btn-sm mb2"
              onClick={() => {
                setSelected(null);
                window.speechSynthesis && window.speechSynthesis.cancel();
                setIsPlaying(false);
              }}
            >
              Back to results
            </button>
            <button
              className={`btn btn-sm mb2${bookmarks.some((b) => b.pageid === selected.pageid) ? " btn-g" : " btn-o"}`}
              onClick={() => toggleBookmark(selected)}
              aria-label={bookmarks.some((b) => b.pageid === selected.pageid) ? "Remove bookmark" : "Bookmark this article"}
            >
              {bookmarks.some((b) => b.pageid === selected.pageid) ? "Bookmarked" : "Bookmark"}
            </button>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h3 className="sm bold" style={{ color: "var(--red)" }}>
                {selected.title}
              </h3>
              <button
                onClick={() => toggleSpeech(selected.extract)}
                className="btn btn-o btn-sm"
                style={{
                  borderColor: "var(--green)",
                  color: "var(--green)",
                  padding: "4px 8px",
                }}
              >
                {isPlaying ? "Stop Audio" : "Listen to Article"}
              </button>
            </div>
            {selected.thumbnail && (
              <img
                src={selected.thumbnail.source}
                alt={selected.title}
                loading="lazy"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              />
            )}
            {selected._gallery && selected._gallery.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  marginBottom: "10px",
                  paddingBottom: "4px",
                }}
              >
                {selected._gallery.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${selected.title} ${i + 1}`}
                    loading="lazy"
                    style={{
                      height: "80px",
                      borderRadius: "6px",
                      border: "1px solid var(--b1)",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}
            <div
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                paddingRight: "5px",
                marginTop: "10px",
                marginBottom: "10px",
              }}
            >
              <p
                className="xs t2"
                style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
              >
                {selected.extract || "No detailed extract available."}
              </p>
            </div>
            <a
              href={"https://en.wikipedia.org/wiki/" + encodeURIComponent(selected.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="xs"
              style={{
                color: "var(--green)",
                display: "block",
                marginTop: "5px",
              }}
            >
              Read full article on Wikipedia
            </a>
          </div>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {bookmarks.length > 0 && results.length === 0 && (
              <div className="mb3">
                <div className="xs bold t2 mb2">Bookmarks</div>
                {bookmarks.map((b) => (
                  <div key={b.pageid} className="flex jcb aic mb1">
                    <button
                      className="btn btn-o btn-sm"
                      onClick={() => fetchDetails(b.title)}
                    >
                      {b.title}
                    </button>
                    <button
                      className="btn btn-r btn-sm"
                      onClick={() => toggleBookmark(b)}
                      aria-label="Remove bookmark"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => fetchDetails(r.title)}
                style={{
                  paddingBottom: "12px",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--b1)",
                  cursor: "pointer",
                }}
              >
                <div className="sm bold" style={{ color: "var(--fg)" }}>
                  {r.title}
                </div>
                <div className="xs mt1 t3" style={{ lineHeight: 1.4 }}>
                  {(r.snippet || "").replace(/<[^>]*>/g, "") + "..."}
                </div>
              </div>
            ))}
            {!loading && results.length === 0 && search && (
              <div className="xs t3 tc p3">No results found on Wikipedia. Try another search term.</div>
            )}
            {!loading && !search && results.length === 0 && (
              <div style={{ padding: "10px 0" }}>
                <p className="xs t2 mb2">
                  💡 Explore common plant diseases and agronomic pathogens with verified Wikipedia extracts, high-resolution galleries, and audio narration:
                </p>
                <div className="flex gap2 wrap">
                  {[
                    "Late Blight",
                    "Wheat Rust",
                    "Powdery Mildew",
                    "Rice Blast",
                    "Bacterial Blight",
                    "Downy Mildew",
                    "Citrus Canker",
                    "Fusarium Wilt",
                    "Anthracnose",
                    "Sigatoka Leaf Spot",
                    "Early Blight",
                    "Clubroot",
                  ].map((dName) => (
                    <button
                      key={dName}
                      onClick={() => {
                        setSearch(dName);
                        doSearch(dName);
                      }}
                      className="btn btn-sm btn-o"
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      🌿 {dName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveEncyclopedia;
