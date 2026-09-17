import React, { useState, useEffect } from "react";
import { safeGetLS, safeSetLS } from "../utils/helpers";
import { confirmAction } from "../utils/confirm";

export default function AgroIntelLedger() {
  const [expenses, setExpenses] = useState(() => {
    try {
      const ls = safeGetLS("krishi_expenses");
      const parsed = ls ? JSON.parse(ls) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [cat, setCat] = useState("Labor");
  const [amt, setAmt] = useState("");

  useEffect(
    () => safeSetLS("krishi_expenses", JSON.stringify(expenses)),
    [expenses],
  );

  const add = () => {
    const val = parseFloat(amt);
    if (isNaN(val) || val <= 0 || val > 100000000) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Enter a valid positive amount." }),
      );
      return;
    }
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setExpenses([...expenses, { id: Date.now(), cat, amt: val, date: today }]);
    setAmt("");
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: "✅ Expense added" }),
    );
  };

  const removeExpense = async (id) => {
    const ok = await confirmAction("Remove this expense?", {
      danger: true,
      confirmText: "Remove",
    });
    if (!ok) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: "Expense removed" }),
    );
  };

  const clearAll = async () => {
    const ok = await confirmAction(
      "Clear all expenses? This cannot be undone.",
      { danger: true, confirmText: "Clear All" },
    );
    if (!ok) return;
    setExpenses([]);
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: "All expenses cleared" }),
    );
  };

  const sanitizeCsvCell = (val) => {
    let s = String(val ?? "").replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(s)) {
      s = "'" + s; // Prevent CSV Formula Injection
    }
    return `"${s}"`;
  };

  const exportCsv = () => {
    const header = "Date,Category,Amount\n";
    const rows = expenses
      .map((e) => `${sanitizeCsvCell(e.date || "N/A")},${sanitizeCsvCell(e.cat)},${e.amt}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "krishi_ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = expenses.reduce((s, e) => s + (Number(e.amt) || 0), 0);

  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">🧾 Krishi Ledger</span>
        <span className="chip" style={{ fontSize: "10px" }}>
          ₹ {total.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="card-body">
        <div className="flex gap2 mb2">
          <select
            className="input"
            style={{ flex: 1 }}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Expense category"
          >
            {[
              "Seeds",
              "Fertilizer",
              "Pesticide",
              "Labor",
              "Fuel",
              "Irrigation",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1 }}
            type="number"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            aria-label="Expense amount in rupees"
            placeholder="₹ Amt"
          />
          <button className="btn btn-g" onClick={add}>
            Add
          </button>
        </div>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex jcb aic"
              style={{ padding: "8px 0", borderBottom: "1px solid var(--b1)" }}
            >
              <span className="sm t2">{e.cat}</span>
              <div className="flex aic gap2">
                <span className="sm bold">
                  ₹ {e.amt.toLocaleString("en-IN")}
                </span>
                <button
                  className="btn btn-o btn-xs"
                  style={{
                    padding: "2px 6px",
                    borderColor: "var(--red)",
                    color: "var(--red)",
                  }}
                  onClick={() => removeExpense(e.id)}
                  aria-label="Remove expense"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="xs t3 tc mt2">No expenses recorded yet.</div>
          )}
        </div>
        {expenses.length > 0 && (
          <div className="flex gap2 mt2">
            <button
              className="btn btn-o w100"
              onClick={exportCsv}
              aria-label="Export expenses as CSV"
            >
              ⬇ Export CSV
            </button>
            <button
              className="btn btn-r w100"
              onClick={clearAll}
              aria-label="Clear all expenses"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
