import React, { useState, useEffect, useRef } from "react";

/* PERF_LAZY_FEATURE_CARD_R202
 * Viewport-aware lazy loader for heavy feature widgets on the homepage.
 *
 * Why this exists:
 * AgroIntel has 19 feature cards (Weather, Mandi, Crop Planner, Yield Calculator,
 * Soil Health, Community, Market, etc.). When all 19 were mounted simultaneously:
 *   1. 19 separate dynamic JS chunks (~1.5 MB total) were requested at once.
 *   2. 19 sets of useEffect hooks executed concurrently on page load, firing
 *      20+ simultaneous API requests, GPS queries, and heavy Recharts calculations.
 *   3. This choked the browser thread and network queue, causing severe UI lag
 *      and delayed loading ("things load lately").
 *
 * How this fixes it:
 *   - Priority cards (top of page or dedicated tabs) mount immediately.
 *   - Off-screen cards render a lightweight placeholder (with content-visibility)
 *     and ONLY download their chunk + run their API calls when the user scrolls
 *     within 350px of them.
 *   - Once visible, the component stays mounted permanently.
 */
export default function LazyFeatureCard({ children, priority = false, minHeight = 220 }) {
  const [isVisible, setIsVisible] = useState(priority);
  const containerRef = useRef(null);

  useEffect(() => {
    if (priority || isVisible) return;
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isVisible]);

  if (priority || isVisible) {
    return children;
  }

  return (
    <div
      ref={containerRef}
      className="lazy-card-placeholder"
      style={{
        minHeight: `${minHeight}px`,
        contentVisibility: "auto",
        containIntrinsicSize: `auto ${minHeight}px`,
      }}
    >
      <div className="skel skel-card" style={{ minHeight: `${minHeight}px` }} />
    </div>
  );
}
