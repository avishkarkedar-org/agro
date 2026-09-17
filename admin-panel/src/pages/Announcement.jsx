import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

const TEMPLATES = [
  "🌧️ Monsoon Advisory: Heavy rainfall expected in [region]. Ensure proper drainage in fields.",
  "💰 MSP Update: Government has revised MSP for [crop] to ₹[price]/quintal for 2026-27 season.",
  "📋 Scheme Deadline: Last date to apply for [scheme] is [date]. Visit nearest CSC.",
  "🌾 Kharif Sowing: Ideal time to sow [crop]. Ensure seed treatment before planting.",
  "⚠️ Pest Alert: [pest] outbreak reported in [region]. Spray [chemical] immediately.",
  "🎉 Festival Greeting: Wishing all farmers a prosperous [festival]! 🙏",
];

export default function Announcement() {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api("/api/settings");
      setText(data.announcement || "");
      setImage(data.ann_image || "");
      setStartDate(data.ann_start_date || "");
      setEndDate(data.ann_end_date || "");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          announcement: text,
          ann_image: image,
          ann_start_date: startDate,
          ann_end_date: endDate,
        }),
      });
      notify("Announcement saved!");
    } catch (e) {
      notify(e.message);
    }
  };

  const handleClear = async () => {
    setText("");
    setImage("");
    setStartDate("");
    setEndDate("");
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          announcement: "",
          ann_image: "",
          ann_start_date: "",
          ann_end_date: "",
        }),
      });
      notify("Announcement cleared!");
    } catch (e) {
      notify(e.message);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Announcement</h1>
        <p className="page-sub">Set a banner announcement for all users</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📋 Quick Templates</span>
        </div>
        <div className="card-body">
          <p
            style={{
              fontSize: "12px",
              color: "var(--t2)",
              marginBottom: "10px",
            }}
          >
            Click a template to fill the announcement text.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                className="btn btn-outline btn-sm"
                onClick={() => setText(tmpl)}
              >
                {tmpl.split(":")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">📢 Banner Settings</span>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Announcement Text</label>
            <textarea
              className="form-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter announcement text"
            ></textarea>
          </div>
          <div className="form-group">
            <label>Image URL (optional)</label>
            <input
              className="form-input"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="grid-form" style={{ marginBottom: "14px" }}>
            <div className="form-group">
              <label>Start Date (optional)</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>End Date (optional)</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={handleSave}>
              💾 Save Announcement
            </button>
            <button className="btn btn-outline" onClick={handleClear}>
              ✕ Clear Announcement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
