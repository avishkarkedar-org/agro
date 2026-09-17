import { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";

/* R99.1
 * The previous empty state was written for a much older build: it told the
 * USER to "Open index.html and find const videoId = 'gg1tN-gkcwk'". That file
 * has not driven this component for many revisions - the id comes from
 * settings.youtube_id, set in the admin panel - and the audience here is
 * farmers, not developers. Showing source-editing instructions in production
 * UI is a defect regardless of whether the path is correct.
 *
 * Related but NOT fixed here: CONTEXT.md outstanding issue 1, the card serving
 * an unrelated music video. That is bad DATA in settings.youtube_id, not bad
 * code. The id validation below limits the blast radius of a malformed paste
 * but cannot detect a well-formed id pointing at the wrong video.
 */

// YouTube ids are exactly 11 chars of [A-Za-z0-9_-]. Anything else is a paste
// error (a full URL, a truncated id, the placeholder) and must not be embedded:
// an invalid id renders YouTube's own error frame inside our card.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export default function YoutubePlayer() {
  const [videoId, setVideoId] = useState("");
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.youtube_id) setVideoId(String(settings.youtube_id).trim());
  }, [settings]);

  const valid = YT_ID.test(videoId);

  return (
    <div className="card mt3" id="sec-video">
      <div className="card-hd">
        <span className="card-title">Farming Video</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          AGROINTEL GYAN
        </span>
      </div>
      <div style={{ padding: "14px" }}>
        {valid ? (
          <>
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: "56.25%",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#000",
              }}
            >
              <iframe
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                src={
                  "https://www.youtube.com/embed/" +
                  videoId +
                  "?rel=0&modestbranding=1"
                }
                title="Farming video guide"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9px",
                color: "var(--t3)",
                marginTop: "8px",
                textAlign: "center",
              }}
            >
              Powered by Youtube.com
            </p>
          </>
        ) : (
          <div
            style={{
              padding: "28px 20px",
              textAlign: "center",
              background: "var(--s2)",
              borderRadius: "12px",
              border: "1px dashed var(--b2)",
            }}
          >
            <div
              aria-hidden="true"
              style={{ fontSize: "28px", lineHeight: 1, marginBottom: "10px" }}
            >
              {"\uD83D\uDCFA"}
            </div>
            <p
              style={{
                fontFamily: "var(--serif)",
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "6px",
              }}
            >
              No video yet
            </p>
            <p
              style={{
                fontSize: "12.5px",
                color: "var(--t2)",
                lineHeight: 1.6,
                margin: "0 auto",
                maxWidth: "260px",
              }}
            >
              This week&rsquo;s farming guide has not been published yet. Please
              check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
