import { useEffect, useRef } from "react";

// Traps keyboard focus inside an open modal/dialog and closes it on Escape.
// Pass `active` (whether the modal is open) and an `onClose` callback.
// Returns a ref to attach to the modal container element.
export function useFocusTrap(active, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(node.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );

    const previouslyFocused = document.activeElement;
    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (closeRef.current) closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const f = getFocusable();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          !node.contains(document.activeElement)
        ) {
          e.preventDefault();
          last.focus();
        }
      } else if (
        document.activeElement === last ||
        !node.contains(document.activeElement)
      ) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previouslyFocused && previouslyFocused.focus) {
        try {
          previouslyFocused.focus();
        } catch (err) {}
      }
    };
  }, [active]);

  return ref;
}
