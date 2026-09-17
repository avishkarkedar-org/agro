import React from "react";
import { Home, CloudSun, TrendingUp, User, Scan } from "lucide-react";

/* BOTTOM_NAV_R200 — revised R201
 * Fix: Scan button tap was unreliable because:
 *   1. The button was `position:absolute; bottom:8px` which placed it partially
 *      INSIDE the 64px bar height. The bar's `overflow` was not set to `visible`
 *      so pointer events on the protruding part were hit-tested against the parent.
 *   2. `env(safe-area-inset-bottom)` padding on `.bottom-nav` shifted the bar
 *      content area up, but the absolute button still anchored to the container
 *      bottom — pushing the button INTO the safe-area padding zone where taps
 *      are ignored on iOS.
 *   3. The inner container height was 64px but the protruding button center
 *      was not reliably in the touch target zone.
 *
 * Fix approach:
 *   • Bar height is split: 64px content + env(safe-area-inset-bottom) dead zone.
 *   • Center button uses margin-top: -20px to rise ABOVE the bar without relying
 *     on absolute positioning. This keeps it in normal flow for pointer events.
 *   • Added `overflow: visible` to inner container explicitly.
 *   • Added `pointer-events: auto` and explicit z-index on the cam button.
 *   • Increased touch target slightly to 66px for easier one-tap activation.
 */

const NAV_ITEMS = [
  { id: "home",    label: "Home",    Icon: Home       },
  { id: "weather", label: "Weather", Icon: CloudSun   },
  { id: "scan",    label: "Scan",    Icon: Scan,  center: true },
  { id: "mandi",   label: "Mandi",   Icon: TrendingUp },
  { id: "profile", label: "Profile", Icon: User       },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <>
      <style>{`
        /* ── Bar wrapper ── */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 500;
          /* Safe area padding goes BELOW the content, not inside it */
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: var(--clay-surface, #141b18);
          border-top: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
          /* CRITICAL: must be visible so the raised scan button isn't clipped */
          overflow: visible;
        }
        @media (min-width: 900px) {
          .bottom-nav { display: none; }
        }

        /* ── Inner flex row: fixed 64px, overflow visible ── */
        .bottom-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 64px;
          max-width: 600px;
          margin: 0 auto;
          padding: 0 4px;
          position: relative;
          /* CRITICAL: must be visible so absolute cam button isn't clipped */
          overflow: visible;
        }

        /* ── Regular tab button ── */
        .bn-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--t3, rgba(236,253,245,0.44));
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 8px 0 4px;
          transition: color 0.18s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          position: relative;
          z-index: 501;
          pointer-events: auto;
        }
        .bn-tab.active { color: var(--green, #34d399); }
        .bn-tab:active { transform: scale(0.92); }

        /* Icon bg pill on active */
        .bn-tab-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          transition: background 0.18s ease;
        }
        .bn-tab.active .bn-tab-icon {
          background: rgba(52, 211, 153, 0.14);
        }

        /* Active indicator dot */
        .bn-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--green, #34d399);
          opacity: 0;
          transform: scaleX(0);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .bn-tab.active .bn-dot {
          opacity: 1;
          transform: scaleX(1);
        }

        /* ── Center camera slot ── */
        /* ── Center camera button (full column touch target) ── */
        .bn-center-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
          background: transparent;
          border: none;
          cursor: pointer;
          overflow: visible;
          z-index: 520;
          pointer-events: auto !important;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          padding: 0;
          margin: 0;
        }

        .bn-cam-circle {
          position: relative;
          margin-top: -24px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 3.5px solid var(--clay-surface, #141b18);
          background: linear-gradient(145deg, #4ade80, #15803d);
          box-shadow: 0 4px 18px rgba(52,211,153,0.5), 0 8px 30px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .bn-center-btn:active .bn-cam-circle {
          transform: scale(0.9);
          box-shadow: 0 2px 10px rgba(52,211,153,0.4), 0 4px 16px rgba(0,0,0,0.35);
        }
        .bn-center-btn.active .bn-cam-circle {
          background: linear-gradient(145deg, #22c55e, #15803d);
          box-shadow: 0 4px 22px rgba(52,211,153,0.75), 0 8px 30px rgba(0,0,0,0.4);
        }

        .bn-cam-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--green, #34d399);
          letter-spacing: 0.04em;
          margin-top: 3px;
          line-height: 1;
        }
      `}</style>

      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;

            if (item.center) {
              return (
                <button
                  key={item.id}
                  className={`bn-center-btn${isActive ? " active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                  aria-label="Scan crop with AI"
                  aria-pressed={isActive}
                  type="button"
                >
                  <div className="bn-cam-circle">
                    <item.Icon size={26} strokeWidth={2.4} />
                  </div>
                  <span className="bn-cam-label">Scan</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                className={`bn-tab${isActive ? " active" : ""}`}
                onClick={() => onTabChange(item.id)}
                aria-label={item.label}
                aria-pressed={isActive}
                type="button"
              >
                <div className="bn-tab-icon">
                  <item.Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span>{item.label}</span>
                <span className="bn-dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
