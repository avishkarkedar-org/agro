import { useEffect, useRef, useCallback } from "react";

/* PULL_TO_REFRESH_R200
 * Minimal pull-to-refresh for mobile. Works by tracking touch events on the
 * given container element. When the user pulls down ≥70px from the top of
 * the scroll container, it triggers the onRefresh callback.
 *
 * Usage:
 *   const { pullProps, isPulling, progress } = usePullToRefresh({ onRefresh: myFetch });
 *   <div {...pullProps}>...</div>
 *
 * Returns:
 *   pullProps  - spread onto the scrollable container
 *   isPulling  - true while the user is pulling (for showing indicator)
 *   progress   - 0..1 how far through the pull threshold (for indicator size)
 *   isLoading  - true while onRefresh promise is pending
 */
export function usePullToRefresh({ onRefresh, threshold = 70, disabled = false }) {
  const startY = useRef(null);
  const pulling = useRef(false);
  const isPullingState = useRef(false);
  const progressRef = useRef(0);
  const indicatorRef = useRef(null);
  const isLoading = useRef(false);

  const updateIndicator = useCallback((progress, loading) => {
    const el = indicatorRef.current;
    if (!el) return;
    if (progress > 0 || loading) {
      el.style.display = "flex";
      if (loading) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        el.querySelector(".ptr-spinner")?.classList.add("ptr-spin");
      } else {
        el.style.opacity = String(Math.min(progress, 1));
        el.style.transform = `translateY(${Math.min(progress * 56, 56) - 56}px)`;
        el.querySelector(".ptr-spinner")?.classList.remove("ptr-spin");
      }
    } else {
      el.style.opacity = "0";
      el.style.transform = "translateY(-56px)";
      setTimeout(() => {
        if (el && progressRef.current === 0 && !isLoading.current) {
          el.style.display = "none";
        }
      }, 300);
    }
  }, []);

  const onTouchStart = useCallback((e) => {
    if (disabled || isLoading.current) return;
    const el = e.currentTarget;
    if (el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [disabled]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null || isLoading.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) { pulling.current = false; return; }
    const progress = Math.min(dy / threshold, 1.4);
    progressRef.current = progress;
    isPullingState.current = true;
    updateIndicator(progress, false);
    if (progress > 0.3) {
      // Prevent page scroll while actively pulling
      e.preventDefault();
    }
  }, [threshold, updateIndicator]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const progress = progressRef.current;
    startY.current = null;
    progressRef.current = 0;
    isPullingState.current = false;

    if (progress >= 1 && onRefresh && !isLoading.current) {
      isLoading.current = true;
      updateIndicator(1, true);
      try {
        await onRefresh();
      } finally {
        isLoading.current = false;
        updateIndicator(0, false);
      }
    } else {
      updateIndicator(0, false);
    }
  }, [onRefresh, updateIndicator]);

  return {
    indicatorRef,
    pullProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      style: { overflowY: "auto", WebkitOverflowScrolling: "touch" },
    },
  };
}
