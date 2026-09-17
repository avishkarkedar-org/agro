import { useState, useEffect } from "react";

// R88: compact stacked clock. Top line = day + time (prominent),
// bottom line = date in small text. Frees header space vs the old
// big seconds clock.
// R91: owner asked for seconds back on the top line. The interval was
// already 1s, so this costs nothing extra -- it was only the format
// string that omitted them.
// R92.2: date line raised 9px -> 11px. 9px is below the practical floor
// for outdoor use in glare, which is the primary context for this app.
export default function Clock() {
  const [top, setTop] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const tick = () => {
      const n = new Date();
      const hh = String(n.getHours()).padStart(2, "0");
      const mm = String(n.getMinutes()).padStart(2, "0");
      const ss = String(n.getSeconds()).padStart(2, "0");
      setTop(DAYS[n.getDay()] + " " + hh + ":" + mm + ":" + ss);
      setDate(n.getDate() + " " + MONTHS[n.getMonth()] + " " + n.getFullYear());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="notranslate" style={{ textAlign: "right", lineHeight: 1.15 }}>
      <div className="clock" style={{ fontSize: "13px", fontWeight: 700 }}>
        {top}
      </div>
      <div
        className="mono"
        style={{
          fontSize: "11px",
          color: "var(--t3)",
          marginTop: "1px",
          letterSpacing: ".03em",
        }}
      >
        {date}
      </div>
    </div>
  );
}
