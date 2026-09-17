import React, { useState, useEffect } from "react";
import { safeGetLS } from "../utils/helpers";
import { API } from "../context/SettingsContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { confirmAction } from "../utils/confirm";

function KrishiMarket() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellModal, setSellModal] = useState(false);
  const [user, setUser] = useState(() => safeGetLS("agrointel_user") || null);
  const [showSold, setShowSold] = useState(false);

  const loadMarket = () => {
    setLoading(true);
    fetch(`${API}/api/posts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.posts) setItems(d.posts.filter((p) => p.tag === "Marketplace"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMarket();
  }, []);

  const [crop, setCrop] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [loc, setLoc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const me = (safeGetLS("agrointel_user") || "").split("@")[0];
  const [editingId, setEditingId] = useState(null);
  const sellTrapRef = useFocusTrap(sellModal, () => {
    setSellModal(false);
    setEditingId(null);
  });

  const markSold = async (item) => {
    const ok = await confirmAction("Mark this listing as sold?", {
      confirmText: "Mark Sold",
    });
    if (!ok) return;
    try {
      await fetch(`${API}/api/posts/${item.id}/sold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: me }),
      });
      loadMarket();
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Marked as sold" }),
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Could not mark as sold." }),
      );
    }
  };

  const deleteListing = async (item) => {
    const ok = await confirmAction("Delete this listing permanently?", {
      danger: true,
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await fetch(`${API}/api/posts/${item.id}?author=${encodeURIComponent(me)}`, {
        method: "DELETE",
      });
      loadMarket();
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Listing deleted" }),
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Could not delete listing." }),
      );
    }
  };

  const reportListing = async (item) => {
    const ok = await confirmAction(
      "Report this listing as spam, fraud, or inappropriate?",
      { danger: true, confirmText: "Report" },
    );
    if (!ok) return;
    try {
      await fetch(`${API}/api/bugs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Reported listing: ${(item.title || "").slice(0, 80)}`,
          description: `Reported by ${me || "anonymous"} (id ${item.id}, seller ${item.author}). ${(item.body || "").slice(0, 400)}`,
          user_identifier: me || "Anonymous",
        }),
      });
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Listing reported. Thank you." }),
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Could not report listing." }),
      );
    }
  };

  const openEdit = (item) => {
    const qtyM = item.title.match(/Selling (\d+)kg/);
    const cropM = item.title.match(/Selling \d+kg (.*)/);
    const priceM = item.body.match(/Price:\s*\D*(\d+)/);
    const phoneM = item.body.match(/Contact:\s*(.+)/);
    setCrop(cropM ? cropM[1] : "");
    setQty(qtyM ? qtyM[1] : "");
    setPrice(priceM ? priceM[1] : "");
    setPhone(phoneM ? phoneM[1].trim() : "");
    setLoc(item.loc || "");
    setEditingId(item.id);
    setSellModal(true);
  };

  const postListing = async () => {
    const digits = (phone || "").replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Please enter a valid 10-digit WhatsApp number." }));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: `Selling ${qty}kg ${crop}`,
        body: `Price: ₹${price}/kg.\nContact: ${phone}\nLocation: ${loc}`,
        author: me,
        loc: loc,
        tag: "Marketplace",
        emoji: "🛒",
      };
      if (editingId) {
        await fetch(`${API}/api/posts/${editingId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/api/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setSellModal(false);
      setEditingId(null);
      loadMarket();
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: editingId ? "Listing updated" : "Listing posted",
        }),
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Could not save listing." }),
      );
    }
    setSubmitting(false);
  };

  const activeItems = items.filter(
    (it) => !(it.title || "").includes("[SOLD]"),
  );
  const soldItems = items.filter((it) =>
    (it.title || "").includes("[SOLD]"),
  );

  return (
    <div className="card mt3" id="sec-market">
      <div className="card-hd flex jcb aic">
        <div className="flex aic gap2">
          <span className="card-title">🛒 AgroIntel Market</span>{" "}
          <span className="chip cg" style={{ fontSize: "9px" }}>
            BETA
          </span>
        </div>
        <button
          className="btn btn-g btn-sm"
          onClick={() => {
            const u = safeGetLS("agrointel_user");
            if (!u) {
              window.dispatchEvent(new CustomEvent("open-auth-modal"));
              return;
            }
            setUser(u);
            setEditingId(null);
            setCrop("");
            setQty("");
            setPrice("");
            setPhone("");
            setLoc("");
            setSellModal(true);
          }}
        >
          + Sell Crop
        </button>
      </div>
      <div className="card-body">
        <p className="xs t2 mb2">
          Buy and sell directly with other farmers. Zero commission.
        </p>

        {loading ? (
          <div
            className="tc p2 ring"
            style={{
              width: "24px",
              height: "24px",
              border: "2px solid var(--b2)",
              borderTopColor: "var(--green)",
              margin: "0 auto",
            }}
          />
        ) : activeItems.length === 0 && soldItems.length === 0 ? (
          <div className="tc fade-in" style={{ padding: "30px 16px" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>🛒</div>
            <p
              className="bold"
              style={{ fontSize: "15px", marginBottom: "6px" }}
            >
              No Active Listings
            </p>
            <p
              className="xs t2"
              style={{ lineHeight: 1.5, marginBottom: "14px" }}
            >
              Be the first farmer to list your crops for sale. Zero commission!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(200px, 100%), 1fr))",
              gap: "12px",
              maxHeight: "400px",
              overflowY: "auto",
              paddingRight: "5px",
            }}
          >
            {activeItems.map((item) => {
              const priceMatch = item.body.match(/Price: ₹(\d+)/);
              const cropMatch = item.title.match(/Selling \d+kg (.*)/);
              const pVal = priceMatch ? priceMatch[1] : "--";
              const cName = cropMatch ? cropMatch[1] : item.title;
              const isSold = (item.title || "").includes("[SOLD]");
              const isMine = !!me && item.author === me;

              return (
                <div
                  key={item.id}
                  className="flex flex-col jcb"
                  style={{
                    background: "var(--s2)",
                    border: "1px solid var(--b2)",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "80px",
                      background:
                        "linear-gradient(45deg, var(--green), var(--blue))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "36px",
                    }}
                  >
                    📦
                  </div>
                  <div
                    className="p2"
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div className="flex jcb aic mb1">
                      <div className="bold">{cName}</div>
                      {isSold && <span className="chip cg">SOLD</span>}
                    </div>
                    {isMine && !isSold && (
                      <div className="flex gap2 mb2">
                        <button className="btn btn-o btn-sm" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <button className="btn btn-o btn-sm" onClick={() => markSold(item)}>
                          Mark Sold
                        </button>
                        <button className="btn btn-r btn-sm" onClick={() => deleteListing(item)}>
                          Delete
                        </button>
                      </div>
                    )}
                    {!isMine && !isSold && (
                      <div className="flex gap2 mb2">
                        <button
                          className="btn btn-o btn-sm"
                          onClick={() => reportListing(item)}
                        >
                          ⚠ Report
                        </button>
                      </div>
                    )}
                    <div className="flex jcb mb2">
                      <span className="xs t2">Price</span>
                      <span
                        className="bold sm"
                        style={{ color: "var(--green)" }}
                      >
                        ₹{pVal}/kg
                      </span>
                    </div>
                    <div className="xs t2 mb2" style={{ lineHeight: 1.4 }}>
                      {item.body}
                    </div>
                    <div
                      className="xs t3 mt-auto pt1 flex jcb"
                      style={{ borderTop: "1px solid var(--b1)" }}
                    >
                      <span>👤 {item.author}</span>
                      <span>📍 {item.loc}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {soldItems.length > 0 && (
          <div className="mt3">
            <button
              className="btn btn-o btn-sm w100"
              onClick={() => setShowSold((v) => !v)}
            >
              {showSold ? "▲ Hide" : "▼ Show"} sold listings ({soldItems.length})
            </button>
            {showSold && (
              <div className="mt2 flex flex-col gap2">
                {soldItems.map((item) => {
                  const cropMatch = item.title.match(/Selling \d+kg (.*)/);
                  const cName = cropMatch ? cropMatch[1] : item.title;
                  return (
                    <div key={item.id} className="card flex jcb aic p2">
                      <span className="sm bold t2">📦 {cName}</span>
                      <span className="chip cg">SOLD</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {sellModal && (
        <div
          className="modal-overlay fade-in"
          ref={sellTrapRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) { setSellModal(false); setEditingId(null); }
          }}
        >
          <div className="card p3" style={{ width: "90%", maxWidth: "400px" }}>
            <h3 className="sm bold mb2">{editingId ? "Edit Listing" : "Sell Your Crop"}</h3>
            <input
              className="input mb2 w100"
              aria-label="Crop name"
              placeholder="Crop Name (e.g. Tomato, Wheat)"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            />
            <div className="flex gap2 mb2">
              <input
                className="input w100"
                type="number"
                aria-label="Quantity in kg"
                placeholder="Quantity (kg)"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <input
                className="input w100"
                type="number"
                aria-label="Price per kg in rupees"
                placeholder="Price (₹/kg)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <input
              className="input mb2 w100"
              aria-label="Location or village"
              placeholder="Location / Village"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
            />
            <input
              className="input mb3 w100"
              type="number"
              aria-label="WhatsApp contact number"
              placeholder="WhatsApp Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex gap2">
              <button
                className="btn btn-o w100"
                onClick={() => (setSellModal(false), setEditingId(null))}
              >
                Cancel
              </button>
              <button
                className="btn btn-g w100"
                disabled={submitting || !crop || !qty || !price || !phone}
                onClick={postListing}
              >
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Post Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KrishiMarket;
