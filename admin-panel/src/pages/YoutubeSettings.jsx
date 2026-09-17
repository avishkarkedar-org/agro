import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function YoutubeSettings() {
  const [videoId, setVideoId] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const data = await api("/api/settings");
        if (data.youtube_id) {
          setVideoId(data.youtube_id);
          setPreview(true);
        }
      } catch (e) {
        console.error("Failed to load YouTube settings: ", e);
      }
    };
    loadVideo();
  }, []);

  const extractId = (url) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    );
    return match ? match[1] : url;
  };

  const handlePreview = () => {
    setVideoId(extractId(videoId));
    setPreview(true);
  };

  const handleSave = async () => {
    const id = extractId(videoId);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ youtube_id: id }),
      });
      notify("✅ YouTube ID saved successfully!");
    } catch (e) {
      notify(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">YouTube Video</h1>
        <p className="page-sub">
          Set the featured YouTube video on the main page
        </p>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">▶️ Video Settings</span>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>YouTube Video URL or ID</label>
            <input
              className="form-input"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="e.g. https://youtube.com/watch?v=dQw4w9WgXcQ"
            />
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <button className="btn btn-outline btn-sm" onClick={handlePreview}>
              👁️ Preview
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              💾 Save Video ID
            </button>
          </div>
          {preview && videoId && (
            <div
              style={{
                margin: "8px 0",
                borderRadius: "10px",
                overflow: "hidden",
                aspectRatio: "16/9",
                maxWidth: "480px",
                background: "var(--s2)",
              }}
            >
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
