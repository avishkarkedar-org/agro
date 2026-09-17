import React, { useState, useEffect } from "react";
import { Phone, MessageCircle, Plus, Search, Filter, Tractor, ShieldCheck, MapPin } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { safeGetLS, safeSetLS } from "../utils/helpers";

function AddRentalModal({ onClose, onAdd }) {
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("Tractor");
  const [price, setPrice] = useState("");
  const [owner, setOwner] = useState("");
  const [loc, setLoc] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid = item.trim() && price.trim() && owner.trim() && phone.trim() && loc.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);

    const newRental = {
      id: "user-" + Date.now(),
      item: item.trim(),
      category,
      price: price.trim().startsWith("₹") ? price.trim() : "₹" + price.trim(),
      owner: owner.trim(),
      loc: loc.trim(),
      phone: phone.trim().replace(/\D/g, ""),
      desc: desc.trim() || "Available for rent. Contact owner for booking.",
      isUserListing: true,
      verified: false,
    };

    // Save to user listings in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("agrointel_user_rentals")) || [];
      const updated = [newRental, ...stored];
      localStorage.setItem("agrointel_user_rentals", JSON.stringify(updated));
    } catch {}

    onAdd(newRental);
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: "Equipment listed successfully! Visible to farmers near you." }),
    );
    onClose();
  };

  return (
    <div
      className="modal-bg fade-in"
      onClick={onClose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1100,
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div className="flex jcb aic mb3">
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800 }}>List Your Machine</h3>
            <p className="xs t2 mt1">Earn extra income by renting your tractor or equipment to local farmers</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb2">
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Equipment / Machine Model *</label>
            <input
              className="input"
              placeholder="e.g. Mahindra 575 DI (45 HP)"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label className="xs bold t2 mb1" style={{ display: "block" }}>Category *</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Tractor">🚜 Tractor</option>
                <option value="Rotavator">⚙️ Rotavator / Tiller</option>
                <option value="Harvester">🌾 Harvester</option>
                <option value="Drone Sprayer">🚁 Drone Sprayer</option>
                <option value="Trolley">🚚 Trolley / Trailer</option>
                <option value="Water Pump">💧 Water Pump / Tanker</option>
                <option value="Other">🔧 Other Machinery</option>
              </select>
            </div>
            <div>
              <label className="xs bold t2 mb1" style={{ display: "block" }}>Rental Rate *</label>
              <input
                className="input"
                placeholder="e.g. 500 / hr or 1200 / acre"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label className="xs bold t2 mb1" style={{ display: "block" }}>Owner / Operator Name *</label>
              <input
                className="input"
                placeholder="e.g. Ramesh Pawar"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="xs bold t2 mb1" style={{ display: "block" }}>Mobile / WhatsApp Number *</label>
              <input
                className="input"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb2">
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Village & District *</label>
            <input
              className="input"
              placeholder="e.g. Indapur, Pune"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              required
            />
          </div>

          <div className="mb3">
            <label className="xs bold t2 mb1" style={{ display: "block" }}>Notes / Availability (Optional)</label>
            <textarea
              className="input"
              rows="2"
              placeholder="e.g. Available 7 AM - 6 PM, driver included, diesel extra"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ minHeight: "65px" }}
            />
          </div>

          <div className="flex gap2" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-o btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-g btn-sm"
              disabled={!isValid || submitting}
              style={{ opacity: isValid ? 1 : 0.4 }}
            >
              {submitting ? "Listing..." : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KrishiShare() {
  const [rentals, setRentals] = useState([]);
  const [userListings, setUserListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { settings, loaded } = useSettings();

  useEffect(() => {
    if (!loaded) return;

    // Load admin settings rentals
    const adminRentals = Array.isArray(settings?.rentals) ? settings.rentals : [];

    // Load locally saved user listings
    let savedUserRentals = [];
    try {
      savedUserRentals = JSON.parse(localStorage.getItem("agrointel_user_rentals")) || [];
    } catch {}

    setUserListings(savedUserRentals);

    // Combine: user listings first, then admin rentals from database
    const combined = [...savedUserRentals, ...adminRentals];
    setRentals(combined);

    setLoading(false);
  }, [settings, loaded]);

  const handleAddRental = (newRental) => {
    setRentals((prev) => [newRental, ...prev]);
    setUserListings((prev) => [newRental, ...prev]);
  };

  const categories = [
    "All",
    "Tractor",
    "Rotavator",
    "Harvester",
    "Drone Sprayer",
    "Trolley",
    "Water Pump",
  ];

  const getEquipmentIcon = (item = "", cat = "") => {
    const text = (item + " " + cat).toLowerCase();
    if (text.includes("drone")) return "🚁";
    if (text.includes("harvester") || text.includes("combine")) return "🌾";
    if (text.includes("rotavator") || text.includes("tiller") || text.includes("cultivator")) return "⚙️";
    if (text.includes("trolley") || text.includes("trailer")) return "🚚";
    if (text.includes("water") || text.includes("pump") || text.includes("tanker")) return "💧";
    return "🚜";
  };

  const filteredRentals = rentals.filter((r) => {
    const itemText = (r.item || "") + " " + (r.desc || "");
    const matchesCategory =
      category === "All" ||
      (r.category && r.category.toLowerCase() === category.toLowerCase()) ||
      itemText.toLowerCase().includes(category.toLowerCase());

    const matchesSearch =
      !search.trim() ||
      (r.item && r.item.toLowerCase().includes(search.toLowerCase())) ||
      (r.loc && r.loc.toLowerCase().includes(search.toLowerCase())) ||
      (r.owner && r.owner.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="card mt3" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        className="card-hd"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "14px 18px",
          borderBottom: "1px solid var(--ds-line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="card-title" style={{ fontSize: "16.5px", fontWeight: 800 }}>
            🚜 AgroIntel Share (Equipment & Tractor Rentals)
          </span>
          <span className="chip cg xs">FARM MACHINERY</span>
        </div>

        <button
          className="btn btn-g btn-sm"
          onClick={() => setModalOpen(true)}
          style={{
            padding: "6px 14px",
            fontSize: "12.5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontWeight: 700,
          }}
        >
          <Plus size={14} /> + List Your Equipment
        </button>
      </div>

      {/* Categories Bar (Horizontal scroll) */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--ds-line)",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`filter-btn${category === c ? " active" : ""}`}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              borderRadius: "20px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              fontWeight: category === c ? 700 : 500,
              background: category === c ? "var(--ds-accent, #22c55e)" : "var(--ds-surface-2)",
              color: category === c ? "#ffffff" : "var(--ds-text-2)",
              border: category === c ? "1px solid var(--ds-accent)" : "1px solid var(--ds-line)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {c === "All" ? "🚜 All Machinery" : c}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div
        style={{
          padding: "10px 16px",
          background: "var(--ds-surface-2)",
          borderBottom: "1px solid var(--ds-line)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ds-text-3)",
            }}
          />
          <input
            className="input"
            style={{
              paddingLeft: "30px",
              paddingTop: "6px",
              paddingBottom: "6px",
              fontSize: "13px",
              borderRadius: "8px",
              height: "34px",
            }}
            placeholder="Search tractor model, rotavator, or village location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Equipment Listings Grid */}
      <div className="card-body" style={{ padding: "14px" }}>
        {loading ? (
          <div style={{ padding: "8px 0" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: "14px",
                  background: "var(--ds-surface-2)",
                  borderRadius: "12px",
                  marginBottom: "10px",
                  border: "1px solid var(--ds-line)",
                }}
              >
                <div className="flex jcb mb2">
                  <div className="skel skel-line w60" style={{ height: "16px" }} />
                  <div className="skel skel-line w20" style={{ height: "16px" }} />
                </div>
                <div className="skel skel-line w40" style={{ height: "12px", marginBottom: "12px" }} />
                <div className="flex gap2">
                  <div className="skel" style={{ flex: 1, height: "34px", borderRadius: "8px" }} />
                  <div className="skel" style={{ flex: 1, height: "34px", borderRadius: "8px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="tc fade-in" style={{ padding: "36px 16px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🚜</div>
            <p className="bold" style={{ fontSize: "16px", marginBottom: "6px" }}>
              No machinery found
            </p>
            <p className="sm t2" style={{ lineHeight: 1.6, marginBottom: "16px" }}>
              {search ? "No equipment matches your search query. Try another keyword." : "Be the first farmer in your area to list equipment for rent!"}
            </p>
            <button className="btn btn-g btn-sm" onClick={() => setModalOpen(true)}>
              + Add Machine Listing
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {filteredRentals.map((e, i) => (
              <div
                key={e.id || i}
                style={{
                  padding: "14px",
                  background: "var(--ds-surface)",
                  border: "1px solid var(--ds-line)",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  transition: "all 0.18s ease",
                }}
              >
                <div>
                  <div className="flex jcb aic mb2" style={{ gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ fontSize: "20px", flexShrink: 0 }}>
                        {getEquipmentIcon(e.item, e.category)}
                      </span>
                      <span className="sm bold" style={{ color: "var(--ds-text)", lineHeight: 1.3, wordBreak: "break-word" }}>
                        {e.item}
                      </span>
                    </div>
                    <span
                      className="bold"
                      style={{
                        color: "var(--ds-accent, #22c55e)",
                        fontSize: "13.5px",
                        whiteSpace: "nowrap",
                        background: "var(--ds-accent-soft)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--ds-accent-line)",
                      }}
                    >
                      {e.price}
                    </span>
                  </div>

                  <div className="xs t2 flex aic gap1 mb2" style={{ fontSize: "12px" }}>
                    <span>🧑‍🌾 {e.owner}</span>
                    <span>•</span>
                    <span>📍 {e.loc}</span>
                    {e.isUserListing && (
                      <span
                        className="chip xs"
                        style={{
                          background: "var(--ds-accent-soft)",
                          color: "var(--ds-accent)",
                          fontSize: "9px",
                          padding: "1px 5px",
                          fontWeight: 700,
                        }}
                      >
                        My Listing
                      </span>
                    )}
                  </div>

                  {e.desc && (
                    <p className="xs t3 mb3" style={{ lineHeight: 1.45, fontStyle: "italic" }}>
                      "{e.desc}"
                    </p>
                  )}
                </div>

                <div className="flex gap2 mt2" style={{ paddingTop: "8px", borderTop: "1px solid var(--ds-line)" }}>
                  <a
                    href={`tel:${e.phone}`}
                    className="btn btn-g btn-sm tc"
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={12} /> Call Owner
                  </a>
                  <a
                    href={
                      "https://wa.me/" +
                      e.phone +
                      "?text=" +
                      encodeURIComponent(
                        "Namaste, I saw your listing for '" +
                          e.item +
                          "' on AgroIntel. Is it available for rent?",
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-o btn-sm tc"
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      borderColor: "#25D366",
                      color: "#25D366",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddRentalModal
          onClose={() => setModalOpen(false)}
          onAdd={handleAddRental}
        />
      )}
    </div>
  );
}

