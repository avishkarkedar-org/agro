import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function AdvancedSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advTab, setAdvTab] = useState("voice");

  const [voiceSettings, setVoiceSettings] = useState({
    gender: "female",
    pitch: 1.1,
    rate: 1.0,
    lang: "hi-IN",
    greeting: "नमस्ते किसान भाइयों, मैं कृषि-साथी हूँ। आपकी क्या मदद करूँ?",
  });
  const [advancedFeatures, setAdvancedFeatures] = useState({
    websockets: true,
    graphql: true,
    community: true,
  });

  const [aiSettings, setAiSettings] = useState({
    persona: "friendly",
    max_tokens: 300,
    context: "",
    strict_topic: true,
    memory: true,
  });
  const [wsSettings, setWsSettings] = useState({
    ping_rate: 30,
    disconnect_idle: true,
    broadcast_msg: "",
  });
  const [gqlSettings, setGqlSettings] = useState({
    cache_ttl: 6,
    query_depth: 3,
  });
  const [weatherSettings, setWeatherSettings] = useState({
    trust_threshold: 3,
    auto_reject: true,
    shadowban_limit: 5,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api("/api/settings");
      if (data.voice_settings) setVoiceSettings(data.voice_settings);
      if (data.advanced_features) setAdvancedFeatures(data.advanced_features);
      if (data.ai_settings) setAiSettings(data.ai_settings);
      if (data.ws_settings) setWsSettings(data.ws_settings);
      if (data.gql_settings) setGqlSettings(data.gql_settings);
      if (data.weather_settings) setWeatherSettings(data.weather_settings);
    } catch (e) {
      notify("Failed to load settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          voice_settings: voiceSettings,
          advanced_features: advancedFeatures,
          ai_settings: aiSettings,
          ws_settings: wsSettings,
          gql_settings: gqlSettings,
          weather_settings: weatherSettings,
        }),
      });
      notify("✅ Advanced Settings Saved Successfully!");
    } catch (e) {
      notify("Failed to save settings: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeCache = async () => {
    if (
      !await confirmDialog(
        "Purge all server-side data caches (mandi, fuel, news, weather, fertilizer)? The next request will refetch fresh data.",
      )
    )
      return;
    try {
      const res = await api("/api/admin/purge-cache", { method: "POST" });
      notify("✅ " + (res.message || "Cache purged successfully!"));
    } catch (e) {
      notify("Failed to purge cache: " + e.message);
    }
  };

  const handleBroadcast = async () => {
    if (!wsSettings.broadcast_msg)
      return notify("Enter a message to broadcast!");
    try {
      const res = await api("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ message: wsSettings.broadcast_msg }),
      });
      notify("📡 " + (res.message || "Broadcast sent."));
      setWsSettings({ ...wsSettings, broadcast_msg: "" });
    } catch (e) {
      notify("Failed to broadcast: " + e.message);
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading Enterprise Settings...
      </div>
    );

  return (
    <div className="page active" style={{ maxWidth: "1200px" }}>
      <div className="page-header flex jcb aic">
        <div>
          <h1 className="page-title">Enterprise Settings</h1>
          <p className="page-sub">
            Command Center for AI, WebSockets, Caching, and Core Mechanics
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          {saving ? "Saving..." : "💾 Save All Configurations"}
        </button>
      </div>
      <div className="flex gap1 mb3 wrap">
        {[["voice","🎙️ Voice"],["ws","⚡ WebSocket"],["gql","🕸️ GraphQL"],["weather","🌤️ Weather"]].map(([k, l]) => (
          <button key={k}
            className={"btn btn-sm " + (advTab === k ? "btn-g" : "btn-o")}
            onClick={() => setAdvTab(k)}
            aria-label={"Settings tab " + k}>{l}</button>
        ))}
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "20px",
        }}
      >
        {advTab === "voice" && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🎙️ AI Brain & Voice Engine</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "11px",
                color: "var(--t2)",
                marginBottom: "15px",
              }}
            >
              Configure the LLM Persona, memory, and TTS output.
            </p>

            <div className="form-group">
              <label>Custom Greeting (Text-to-Speech)</label>
              <textarea
                className="input"
                rows="2"
                value={voiceSettings.greeting}
                onChange={(e) =>
                  setVoiceSettings({
                    ...voiceSettings,
                    greeting: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Daily Context Injection</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Cyclone alert in Gujarat today"
                value={aiSettings.context}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, context: e.target.value })
                }
              />
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--t3)",
                  marginTop: "4px",
                }}
              >
                AI will automatically include this context in all responses
                today.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600 }}>
                  AI Persona
                </label>
                <select
                  className="input"
                  value={aiSettings.persona}
                  onChange={(e) =>
                    setAiSettings({ ...aiSettings, persona: e.target.value })
                  }
                >
                  <option value="friendly">Friendly Neighbor</option>
                  <option value="strict">Scientific Agronomist</option>
                  <option value="concise">To-The-Point Assistant</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600 }}>
                  Max Response Tokens
                </label>
                <select
                  className="input"
                  value={aiSettings.max_tokens}
                  onChange={(e) =>
                    setAiSettings({
                      ...aiSettings,
                      max_tokens: parseInt(e.target.value),
                    })
                  }
                >
                  <option value="150">Short (~2 sentences)</option>
                  <option value="300">Medium (Default)</option>
                  <option value="600">Long (Detailed)</option>
                </select>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={aiSettings.strict_topic}
                onChange={(e) =>
                  setAiSettings({
                    ...aiSettings,
                    strict_topic: e.target.checked,
                  })
                }
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                  Strict Farming-Only Mode
                </div>
                <div style={{ fontSize: "10px", color: "var(--t3)" }}>
                  Block non-agricultural queries.
                </div>
              </div>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
              }}
            >
              <input
                type="checkbox"
                checked={aiSettings.memory}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, memory: e.target.checked })
                }
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                  Conversation Memory
                </div>
                <div style={{ fontSize: "10px", color: "var(--t3)" }}>
                  Remember previous questions (uses more tokens).
                </div>
              </div>
            </label>
          </div>
        </div>

        )}
        {advTab === "ws" && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">⚡ WebSocket Connections</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "11px",
                color: "var(--t2)",
                marginBottom: "15px",
              }}
            >
              Manage server load and live broadcasts.
            </p>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <input
                type="checkbox"
                checked={advancedFeatures.websockets}
                onChange={(e) =>
                  setAdvancedFeatures({
                    ...advancedFeatures,
                    websockets: e.target.checked,
                  })
                }
              />
              <div style={{ fontSize: "12px", fontWeight: 600 }}>
                Master Switch: Enable WebSockets
              </div>
            </label>

            <div className="form-group">
              <label>Live Price Ping Rate (Seconds)</label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={wsSettings.ping_rate}
                  onChange={(e) =>
                    setWsSettings({
                      ...wsSettings,
                      ping_rate: parseInt(e.target.value),
                    })
                  }
                  style={{ flex: 1 }}
                />
                <span className="badge">{wsSettings.ping_rate}s</span>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <input
                type="checkbox"
                checked={wsSettings.disconnect_idle}
                onChange={(e) =>
                  setWsSettings({
                    ...wsSettings,
                    disconnect_idle: e.target.checked,
                  })
                }
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                  Idle Auto-Disconnect (5m)
                </div>
                <div style={{ fontSize: "10px", color: "var(--t3)" }}>
                  Drop connections for inactive tabs to save CPU.
                </div>
              </div>
            </label>

            <div
              className="form-group"
              style={{
                borderTop: "1px solid var(--border-light)",
                paddingTop: "15px",
              }}
            >
              <label style={{ color: "var(--red)" }}>
                Live Broadcast to All Users
              </label>
              <div style={{ display: "flex", gap: "5px" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Emergency alert..."
                  value={wsSettings.broadcast_msg}
                  onChange={(e) =>
                    setWsSettings({
                      ...wsSettings,
                      broadcast_msg: e.target.value,
                    })
                  }
                />
                <button className="btn btn-primary" onClick={handleBroadcast}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        )}
        {advTab === "gql" && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🕸️ GraphQL Caching</span>
          </div>
          <div className="card-body">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <input
                type="checkbox"
                checked={advancedFeatures.graphql}
                onChange={(e) =>
                  setAdvancedFeatures({
                    ...advancedFeatures,
                    graphql: e.target.checked,
                  })
                }
              />
              <div style={{ fontSize: "12px", fontWeight: 600 }}>
                Master Switch: Enable GraphQL Cache
              </div>
            </label>

            <div className="form-group">
              <label>Cache Expiry TTL (Hours)</label>
              <select
                className="input"
                value={gqlSettings.cache_ttl}
                onChange={(e) =>
                  setGqlSettings({
                    ...gqlSettings,
                    cache_ttl: parseInt(e.target.value),
                  })
                }
              >
                <option value="1">1 Hour (High Refresh)</option>
                <option value="6">6 Hours (Standard)</option>
                <option value="24">24 Hours (Static)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Query Depth (Security)</label>
              <select
                className="input"
                value={gqlSettings.query_depth}
                onChange={(e) =>
                  setGqlSettings({
                    ...gqlSettings,
                    query_depth: parseInt(e.target.value),
                  })
                }
              >
                <option value="2">Level 2 (Strict)</option>
                <option value="3">Level 3 (Standard)</option>
                <option value="5">Level 5 (Relaxed)</option>
              </select>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--t3)",
                  marginTop: "4px",
                }}
              >
                Prevents scrapers from nesting queries to steal DB.
              </div>
            </div>

            <button
              className="btn btn-outline"
              style={{
                width: "100%",
                borderColor: "var(--red)",
                color: "var(--red)",
              }}
              onClick={handlePurgeCache}
            >
              🗑️ Emergency Purge All Cache
            </button>
          </div>
        </div>

        )}
        {advTab === "weather" && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🌤️ Crowdsourced Weather</span>
          </div>
          <div className="card-body">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <input
                type="checkbox"
                checked={advancedFeatures.community}
                onChange={(e) =>
                  setAdvancedFeatures({
                    ...advancedFeatures,
                    community: e.target.checked,
                  })
                }
              />
              <div style={{ fontSize: "12px", fontWeight: 600 }}>
                Master Switch: Enable Microclimates
              </div>
            </label>

            <div className="form-group">
              <label>Minimum Trust Threshold</label>
              <select
                className="input"
                value={weatherSettings.trust_threshold}
                onChange={(e) =>
                  setWeatherSettings({
                    ...weatherSettings,
                    trust_threshold: parseInt(e.target.value),
                  })
                }
              >
                <option value="1">1 Farmer (Immediate Post)</option>
                <option value="3">3 Farmers (Verified Cluster)</option>
                <option value="5">5 Farmers (High Confidence)</option>
              </select>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "var(--s2)",
                borderRadius: "6px",
                marginBottom: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={weatherSettings.auto_reject}
                onChange={(e) =>
                  setWeatherSettings({
                    ...weatherSettings,
                    auto_reject: e.target.checked,
                  })
                }
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                  Auto-Reject Outliers
                </div>
                <div style={{ fontSize: "10px", color: "var(--t3)" }}>
                  Delete impossible reports (e.g. Snow in Kerala).
                </div>
              </div>
            </label>

            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>Shadowban Limit (Fake Reports)</label>
              <select
                className="input"
                value={weatherSettings.shadowban_limit}
                onChange={(e) =>
                  setWeatherSettings({
                    ...weatherSettings,
                    shadowban_limit: parseInt(e.target.value),
                  })
                }
              >
                <option value="3">3 Fake Reports</option>
                <option value="5">5 Fake Reports</option>
                <option value="10">10 Fake Reports</option>
              </select>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--t3)",
                  marginTop: "4px",
                }}
              >
                Shadowbanned users can still report, but they are ignored.
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
