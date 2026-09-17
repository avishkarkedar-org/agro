import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function News() {
  const [news, setNews] = useState([]);
  // NEWS_URL_FIELD_R96: extended custom news to support {text, url} objects
  const [inputVal, setInputVal] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      setNews(data.custom_news || []);
    } catch (e) {
      console.error(e);
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // NEWS_URL_ADD_R96: save as {text, url} object; backwards-compat with legacy string items
  const addNewsItem = async () => {
    const text = inputVal.trim();
    if (!text) {
      notify("Please enter a news headline");
      return;
    }
    const item = inputUrl.trim() ? { text, url: inputUrl.trim() } : { text };
    const updated = [...news, item];
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ custom_news: updated }),
      });
      setInputVal("");
      setInputUrl(""); // NEWS_URL_CLEAR_R96
      setNews(updated);
      notify("✅ News headline added successfully!");
    } catch (e) {
      notify("Failed to add news: " + e.message);
    }
  };

  const deleteNewsItem = async (idx) => {
    if (!await confirmDialog("Delete this news headline?")) return;
    const updated = news.filter((_, i) => i !== idx);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ custom_news: updated }),
      });
      setNews(updated);
      notify("✅ News headline removed successfully!");
    } catch (e) {
      notify("Failed to delete news: " + e.message);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading custom news...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Custom News</h1>
        <p className="page-sub">Manage custom news items shown to users</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📰 Add News Item</span>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: "10px" }}>
            {/* NEWS_URL_INPUT_R96: added URL field for clickable headlines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <input
                className="form-input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewsItem()}
                placeholder="News headline (required)..."
              />
              <input
                className="form-input"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Article URL (optional, e.g. https://krishijagran.com/...)"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={addNewsItem}>
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📋 Current News Items</span>
          <button className="btn btn-sm btn-outline" onClick={loadNews}>
            ↻ Refresh
          </button>
        </div>
        <div className="card-body">
          {news.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📰</div>
              <p>No custom news items. Add one above.</p>
            </div>
          ) : (
            // NEWS_URL_RENDER_R96: support both legacy string items and new {text,url} objects
            news.map((item, idx) => {
              const text = typeof item === "string" ? item : item.text;
              const url = typeof item === "object" && item.url ? item.url : null;
              return (
              <div className="news-item" key={idx}>
                {url
                  ? <a href={url} target="_blank" rel="noopener noreferrer" className="news-item-text" style={{ color: "inherit" }}>{text} ↗</a>
                  : <span className="news-item-text">{text}</span>
                }
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteNewsItem(idx)}
                >
                  ✕
                </button>
              </div>
              ); // NEWS_URL_RENDER_CLOSE_R96
            })
          )}
        </div>
      </div>
    </div>
  );
}
