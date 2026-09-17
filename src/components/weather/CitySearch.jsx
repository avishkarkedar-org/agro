// CITY_SEARCH_R104
// Replaces the inline search in Weather.jsx, which had three defects:
//   - dropRef was attached and never read, so there was no click-outside close
//   - the listbox had no aria-expanded / aria-controls / aria-activedescendant
//     and no arrow-key navigation, only tabbable divs
//   - the dropdown was positioned with a magic right:60px to dodge the Go
//     button, so any label change misaligned it
//
// R104.1: added `inline`. .card is overflow:hidden !important, so an absolutely
// positioned list at the bottom of a short card gets clipped (KL#37). In the
// first-run location gate the card IS short, so the gate renders the list in
// normal flow instead and pushes the card taller.
//
// R106: optional trailing slot so the Weather card can put a "Use my location"
// button on the same row without a second flex wrapper fighting this one.
//
// Escapes live in JS expressions only (KL#9).

import { useState, useRef, useEffect, useId } from "react";
import { matchCities } from "./weatherMaps";
import { RADIUS } from "./panel";

const PLACEHOLDER = "Search city or town\u2026";

export default function CitySearch({
  onSelect,
  disabled,
  autoFocus,
  inline,
  trailing,
}) {
  const [value, setValue] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = useId();

  // The click-outside handler dropRef was supposed to provide.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [open]);

  const change = (v) => {
    setValue(v);
    const next = matchCities(v, 8);
    setOptions(next);
    setOpen(next.length > 0);
    setActive(-1);
  };

  const choose = (name) => {
    setOpen(false);
    setActive(-1);
    setOptions([]);
    setValue("");
    if (onSelect) onSelect(name);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return choose(options[active]);
    // Geocode whatever was typed - the list is a convenience, not a whitelist,
    // so villages absent from CITIES still work.
    if (value.trim()) choose(value.trim());
  };

  const onKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const listStyle = inline
    ? {
        // In normal flow: cannot be clipped by the card's overflow:hidden.
        position: "static",
        marginTop: "6px",
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        padding: 0,
        listStyle: "none",
        background: "var(--ds-surface, #121815)",
        border: "1px solid var(--ds-line-2, rgba(255,255,255,0.14))",
        borderRadius: RADIUS.sm,
        overflow: "hidden",
      }
    : {
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        margin: 0,
        padding: 0,
        listStyle: "none",
        background: "var(--ds-surface-2, #182019)",
        border: "1px solid var(--ds-line-2, rgba(255,255,255,0.14))",
        borderRadius: RADIUS.sm,
        zIndex: 50,
        overflow: "hidden",
        boxShadow: "var(--ds-sh-3, 0 12px 32px rgba(0,0,0,0.45))",
      };

  return (
    <div ref={wrapRef} style={{ position: inline ? "static" : "relative" }}>
      <form onSubmit={submit} className="flex gap2">
        <input
          className="input"
          style={{
            flex: 1,
            padding: "10px 12px",
            fontSize: "13px",
            minWidth: 0,
          }}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => change(e.target.value)}
          onFocus={() => value && options.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDER}
          aria-label="Search for a city or town"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? listId + "-opt-" + active : undefined
          }
        />
        <button
          type="submit"
          className="btn btn-o btn-sm"
          disabled={disabled}
          style={{ minHeight: "44px", flexShrink: 0 }}
        >
          Go
        </button>
        {trailing}
      </form>

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching places"
          style={listStyle}
        >
          {options.map((c, i) => (
            <li
              key={c}
              id={listId + "-opt-" + i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "11px 14px",
                cursor: "pointer",
                fontSize: "13px",
                background:
                  i === active
                    ? "var(--ds-accent-soft, rgba(52,211,153,0.12))"
                    : "transparent",
                color:
                  i === active
                    ? "var(--ds-accent, #34d399)"
                    : "var(--ds-text, #eef2ef)",
              }}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
