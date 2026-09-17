import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

/* TASKS_BADGE_R115
   The ACTIVE/PENDING badge used to test `tasks.auto_scheduler?.last_run` for
   truthiness. The backend always sends that key and defaults it to the STRING
   "Never", which is truthy, so the badge said ACTIVE on a server where the
   scheduler had never run. Compare against the sentinel strings instead.

   Remember that _task_last_run lives in memory on the backend: every value here
   resets on restart, and Render's free tier sleeps after ~15 minutes idle. */

const NOT_RUN_VALUES = ["", "Never", "Pending", "Pending Initial Run"];

const hasRun = (value) =>
  typeof value === "string" && NOT_RUN_VALUES.indexOf(value) === -1;

export default function Tasks() {
  const [tasks, setTasks] = useState({
    refresh_mandi: { last_run: "Never", last_result: "" },
    refresh_fuel: { last_run: "Never", last_result: "" },
    refresh_news: { last_run: "Never", last_result: "" },
    purge_visitors: { last_run: "Never", last_result: "" },
    purge_old_posts: { last_run: "Never", last_result: "" },
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api("/api/admin/tasks-status");
      const loaded = data.tasks || {};
      setTasks((prev) => ({
        refresh_mandi: loaded.refresh_mandi || prev.refresh_mandi,
        refresh_fuel: loaded.refresh_fuel || prev.refresh_fuel,
        refresh_news: loaded.refresh_news || prev.refresh_news,
        purge_visitors: loaded.purge_visitors || prev.purge_visitors,
        purge_old_posts: loaded.purge_old_posts || prev.purge_old_posts,
        auto_scheduler: loaded.auto_scheduler || {
          last_run: "Pending",
          last_result: "",
        },
      }));
    } catch (e) {
      console.error("Failed to load tasks status: ", e);
    } finally {
      setLoading(false);
    }
  };

  const runTask = async (taskName) => {
    try {
      setToast({ msg: "Running task... please wait.", type: "info" });
      const data = await api("/api/admin/run-task", {
        method: "POST",
        body: JSON.stringify({ task: taskName }),
      });
      showToast(data.result || "Task completed successfully!", "success");
      loadTasks();
    } catch (e) {
      showToast("Task failed: " + e.message, "error");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading tasks runner...
      </div>
    );

  const schedulerRun = tasks.auto_scheduler?.last_run;
  const schedulerActive = hasRun(schedulerRun);

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">⚙️ Task Runner</h1>
        <p className="page-sub">
          Manual maintenance tasks with last-run tracking
        </p>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: "20px", right: "20px", padding: "15px",
          borderRadius: "8px", background: toast.type === "error" ? "var(--red)" : "var(--green)",
          color: "white", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          {toast.msg}
        </div>
      )}

      <div
        id="tasksGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "18px",
        }}
      >
        <div
          className="card"
          style={{
            border: schedulerActive
              ? "1px solid var(--green)"
              : "1px solid var(--b1)",
            background: schedulerActive
              ? "rgba(34, 197, 94, 0.05)"
              : "transparent",
          }}
        >
          <div className="card-hd">
            <span
              className="card-title"
              style={{ color: schedulerActive ? "var(--green)" : "var(--text)" }}
            >
              🤖 Automated Background Scheduler
            </span>
            <span
              style={{
                background: schedulerActive ? "var(--green)" : "var(--t3)",
                color: "#000",
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              {schedulerActive ? "ACTIVE" : "NOT RUN YET"}
            </span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              The FastAPI background loop automatically fetches fresh Mandi/Fuel
              prices and purges old database records every 6 hours.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "4px",
              }}
            >
              <strong>Last Run:</strong>{" "}
              {schedulerActive ? schedulerRun : "Not since the last restart"}
            </div>
            {tasks.auto_scheduler?.next_run && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--t3)",
                  marginBottom: "10px",
                }}
              >
                <strong>Next Run:</strong> {tasks.auto_scheduler.next_run}
              </div>
            )}
            {tasks.auto_scheduler?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--amber)",
                  marginBottom: "10px",
                  padding: "6px",
                  background: "var(--s2)",
                  borderRadius: "6px",
                }}
              >
                {tasks.auto_scheduler.last_result}
              </div>
            )}
            <div
              style={{
                fontSize: "10px",
                color: "var(--t3)",
                marginBottom: "8px",
              }}
            >
              Last-run times are held in the backend&apos;s memory, so they reset
              to blank whenever it restarts. On the free hosting tier the server
              sleeps after about 15 minutes of inactivity, so this often reads as
              not-run even when the 6-hour scheduler is working normally.
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--t3)",
                fontStyle: "italic",
              }}
            >
              (Manual overrides below will still work independently)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">🔄 Refresh Mandi Prices</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              Clears mandi cache so next request fetches fresh data from
              data.gov.in API.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "10px",
              }}
            >
              Last run:{" "}
              {hasRun(tasks.refresh_mandi?.last_run)
                ? tasks.refresh_mandi.last_run
                : "Not since the last restart"}
            </div>
            {tasks.refresh_mandi?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "10px",
                }}
              >
                {tasks.refresh_mandi.last_result}
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runTask("refresh_mandi")}
            >
              ▶️ Run Now
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">⛽ Refresh Fuel Prices</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              Clears fuel cache and forces a fresh scrape of petrol/diesel prices from NDTV.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "10px",
              }}
            >
              Last run:{" "}
              {hasRun(tasks.refresh_fuel?.last_run)
                ? tasks.refresh_fuel.last_run
                : "Not since the last restart"}
            </div>
            {tasks.refresh_fuel?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "10px",
                }}
              >
                {tasks.refresh_fuel.last_result}
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runTask("refresh_fuel")}
            >
              ▶️ Run Now
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">📰 Refresh Live News</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              Clears news cache and fetches fresh agricultural headlines from RSS feeds.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "10px",
              }}
            >
              Last run:{" "}
              {hasRun(tasks.refresh_news?.last_run)
                ? tasks.refresh_news.last_run
                : "Not since the last restart"}
            </div>
            {tasks.refresh_news?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "10px",
                }}
              >
                {tasks.refresh_news.last_result}
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runTask("refresh_news")}
            >
              ▶️ Run Now
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">
              🧹 Purge Old Visitors (&gt;30 days)
            </span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              Deletes visitor records older than 30 days to keep the database
              lean.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "10px",
              }}
            >
              Last run:{" "}
              {hasRun(tasks.purge_visitors?.last_run)
                ? tasks.purge_visitors.last_run
                : "Not since the last restart"}
            </div>
            {tasks.purge_visitors?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "10px",
                }}
              >
                {tasks.purge_visitors.last_result}
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runTask("purge_visitors")}
            >
              ▶️ Run Now
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">📝 Purge Old Posts (&gt;90 days)</span>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: "12px",
                color: "var(--t2)",
                marginBottom: "12px",
              }}
            >
              Deletes community posts older than 90 days to keep the forum
              fresh.
            </p>
            <div
              style={{
                fontSize: "11px",
                color: "var(--t3)",
                marginBottom: "10px",
              }}
            >
              Last run:{" "}
              {hasRun(tasks.purge_old_posts?.last_run)
                ? tasks.purge_old_posts.last_run
                : "Not since the last restart"}
            </div>
            {tasks.purge_old_posts?.last_result && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "10px",
                }}
              >
                {tasks.purge_old_posts.last_result}
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runTask("purge_old_posts")}
            >
              ▶️ Run Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
