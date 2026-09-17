import { useState, useEffect } from "react";

// Floating "scroll to top" button. Appears after the user scrolls down the
// long feature page. Positioned bottom-left so it never overlaps the
// bottom-right floating action buttons (login + AI voice assistant).
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const btnStyle = {
    position: "fixed",
    left: 16,
    // BOTTOM_NAV_CLEAR_R201: on mobile the bottom nav is 64px + safe area.
    // Raise the scroll button above it so it's never hidden behind the bar.
    bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
    zIndex: 490, // below BottomNav (500) but above most content
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    padding: 0,
  };


  return (
    <button
      className="btn btn-o"
      style={btnStyle}
      aria-label="Back to top"
      title="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}
