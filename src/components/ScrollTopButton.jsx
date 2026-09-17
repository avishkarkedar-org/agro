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

  return (
    <>
      <style>{`
        .scroll-top-fab {
          position: fixed;
          left: 16px;
          bottom: calc(88px + env(safe-area-inset-bottom, 0px));
          z-index: 490;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          padding: 0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .scroll-top-fab:hover {
          transform: translateY(-2px);
        }
        @media (min-width: 900px) {
          .scroll-top-fab {
            bottom: 28px;
            left: 28px;
          }
        }
      `}</style>
      <button
        className="btn btn-o scroll-top-fab"
        aria-label="Back to top"
        title="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </>
  );
}
