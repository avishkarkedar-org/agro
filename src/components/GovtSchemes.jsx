import React, { useState } from "react";

const SCHEMES = [
  {
    id: 1,
    tag: "Central",
    color: "#4ade80",
    name: "PM-KISAN Samman Nidhi",
    short: "₹6,000/year direct income support in 3 instalments",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹2,000 every 4 months directly to bank account",
    who: "All landholding farmer families across India",
    start: "Ongoing — instalments released Apr, Aug, Dec",
    end: "No end date — permanent scheme",
    docs: [
      "Aadhaar Card",
      "Land ownership records (7/12 utara)",
      "Bank passbook",
      "Mobile linked to Aadhaar",
    ],
    how: "Register at pmkisan.gov.in or nearest CSC",
    link: "https://pmkisan.gov.in",
  },
  {
    id: 2,
    tag: "Central",
    color: "#4ade80",
    name: "PM Fasal Bima Yojana (PMFBY)",
    short: "Crop insurance against natural calamities at low premium",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit:
      "Full insured sum on crop loss due to drought, flood, pest, disease",
    who: "All farmers growing notified crops",
    start: "Kharif: June–July | Rabi: November–December",
    end: "Before sowing of respective season",
    docs: [
      "Aadhaar",
      "Land records/7-12",
      "Bank passbook",
      "Sowing certificate from Gram Panchayat",
    ],
    how: "Apply via bank, insurance company, CSC or pmfby.gov.in",
    link: "https://pmfby.gov.in",
  },
  {
    id: 3,
    tag: "Central",
    color: "#4ade80",
    name: "Kisan Credit Card (KCC)",
    short: "Flexible credit for farming needs at 4% interest rate",
    ministry: "Ministry of Finance + NABARD",
    benefit: "Credit limit up to ₹3 lakh at 4% p.a. interest",
    who: "All farmers, sharecroppers, oral lessees, SHGs",
    start: "Ongoing — apply anytime",
    end: "No deadline — permanent scheme",
    docs: ["Aadhaar", "PAN Card", "Land documents", "Photo", "Bank details"],
    how: "Apply at any nationalized bank, cooperative bank, or RRB",
    link: "https://www.nabard.org",
  },
  {
    id: 4,
    tag: "Central",
    color: "#4ade80",
    name: "Soil Health Card Scheme",
    short: "Free soil testing + fertilizer recommendations for your field",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Free soil testing with crop-wise fertilizer recommendations",
    who: "All farmers with agricultural land",
    start: "Ongoing — camps held throughout the year",
    end: "No end date",
    docs: ["Aadhaar Card", "Land records", "Soil sample from your field"],
    how: "Contact nearest KVK or Agriculture Department office",
    link: "https://soilhealth.dac.gov.in",
  },
  {
    id: 5,
    tag: "Central",
    color: "#4ade80",
    name: "PM Krishi Sinchai Yojana (PMKSY)",
    short: "Drip/sprinkler irrigation subsidy up to 55% for small farmers",
    ministry: "Ministry of Jal Shakti",
    benefit: "45–55% subsidy on drip/sprinkler irrigation equipment",
    who: "All farmers — priority to small/marginal farmers",
    start: "Ongoing — apply via state agriculture department",
    end: "Varies by state",
    docs: [
      "Aadhaar",
      "Land records",
      "Bank passbook",
      "Quotation from approved supplier",
    ],
    how: "Apply at District Agriculture Office or state portals",
    link: "https://pmksy.gov.in",
  },
  {
    id: 6,
    tag: "Central",
    color: "#4ade80",
    name: "Paramparagat Krishi Vikas Yojana (PKVY)",
    short: "₹50,000/hectare for organic farming conversion",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹50,000/ha for 3 years for certified organic farming",
    who: "Farmer groups — minimum 20 farmers, 20+ acres cluster",
    start: "Apply: June–August via state agriculture dept",
    end: "Ongoing — subject to annual budget",
    docs: [
      "Aadhaar",
      "Land records",
      "Group formation documents",
      "Bank account of group",
    ],
    how: "Form cluster with neighbours. Apply via KVK or District Agriculture Office",
    link: "https://pgsindia-ncof.gov.in",
  },
  {
    id: 7,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Namo Shetkari Maha Samman Nidhi",
    short: "Additional ₹6,000/year on top of PM-KISAN — Maharashtra only",
    ministry: "Government of Maharashtra",
    benefit: "₹6,000/year extra in 3 instalments (total ₹12,000 with PM-KISAN)",
    who: "Maharashtra farmers already registered under PM-KISAN",
    start: "Ongoing — automatic if PM-KISAN registered",
    end: "No end date",
    docs: [
      "PM-KISAN registration",
      "Aadhaar linked bank account",
      "7/12 land records",
    ],
    how: "Automatic for PM-KISAN beneficiaries. Register at mahaonline.gov.in if not done",
    link: "https://krishi.maharashtra.gov.in",
  },
  {
    id: 8,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Magel Tyala Shet Tale (Farm Pond)",
    short: "Free farm pond construction for water conservation",
    ministry: "Maharashtra Agriculture Department",
    benefit: "100% subsidy for constructing farm pond for water storage",
    who: "Farmers in drought-prone areas of Maharashtra",
    start: "Apply: July–September (Kharif season)",
    end: "Check with local Talathi / Agriculture Officer",
    docs: [
      "7/12 and 8-A land records",
      "Aadhaar",
      "Bank passbook",
      "Caste certificate",
      "Income certificate",
    ],
    how: "Apply at Gram Panchayat or mahadbt.maharashtra.gov.in",
    link: "https://mahadbt.maharashtra.gov.in",
  },
  {
    id: 9,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Birsa Munda Krishi Kranti Yojana",
    short: "Free irrigation equipment + seeds for tribal farmers — Maharashtra",
    ministry: "Maharashtra Tribal Development Dept",
    benefit:
      "Free drip irrigation kit + seeds worth ₹25,000 for tribal farmers",
    who: "ST category farmers in Maharashtra with land",
    start: "Apply: June–August",
    end: "Subject to district allocation",
    docs: [
      "Aadhaar",
      "ST caste certificate",
      "7/12 land records",
      "Bank passbook",
    ],
    how: "Apply at Tribal Development Office or Block level Agriculture Officer",
    link: "https://tribal.maharashtra.gov.in",
  },
  {
    id: 10,
    tag: "Central",
    color: "#4ade80",
    name: "eNAM — National Agriculture Market",
    short: "Online mandi platform — sell crops at best price across India",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Access to 1000+ mandis online, transparent price discovery",
    who: "All farmers with registered produce",
    start: "Register anytime at enam.gov.in",
    end: "No deadline — permanent platform",
    docs: [
      "Aadhaar",
      "Bank passbook",
      "Mobile number",
      "Mandi trader license (if applicable)",
    ],
    how: "Register at enam.gov.in or via local APMC mandi office",
    link: "https://enam.gov.in",
  },
  {
    id: 11,
    tag: "Central",
    color: "#4ade80",
    name: "PM-KUSUM",
    short: "Subsidy on solar water pumps for irrigation",
    ministry: "Ministry of New and Renewable Energy",
    benefit: "Up to 60% subsidy on standalone solar agriculture pumps",
    who: "All farmers with a water source",
    start: "Ongoing",
    end: "Subject to state targets",
    docs: ["Aadhaar", "Land records", "Bank passbook", "Passport size photo"],
    how: "Apply via state nodal agencies or state portals",
    link: "https://pmkusum.mnre.gov.in",
  },
  {
    id: 12,
    tag: "Central",
    color: "#4ade80",
    name: "SMAM (Agricultural Mechanization)",
    short: "Subsidy on buying tractors and farm machinery",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "50-80% subsidy on purchase of agricultural machinery",
    who: "Small/marginal farmers, women, SC/ST get higher subsidy",
    start: "Ongoing",
    end: "Subject to budget availability",
    docs: [
      "Aadhaar",
      "Tractor RC (if applicable)",
      "Land records",
      "Bank details",
    ],
    how: "Apply on Direct Benefit Transfer (DBT) portal of your state",
    link: "https://agrimachinery.nic.in",
  },
  {
    id: 13,
    tag: "Central",
    color: "#4ade80",
    name: "Rashtriya Krishi Vikas Yojana (RKVY)",
    short: "Funding for agri-infrastructure and agribusiness",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Financial support for setting up processing units, godowns, etc.",
    who: "Farmers, FPOs, Agri-entrepreneurs",
    start: "Ongoing",
    end: "No specific deadline",
    docs: [
      "Detailed Project Report (DPR)",
      "Land documents",
      "Bank statements",
    ],
    how: "Submit DPR to State Nodal Agency (Agriculture Dept)",
    link: "https://rkvy.nic.in",
  },
  {
    id: 14,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Bhausaheb Fundkar Orchard Planting Scheme",
    short: "100% subsidy for planting fruit orchards (Maharashtra)",
    ministry: "Maharashtra Agriculture Department",
    benefit:
      "Free saplings and maintenance cost for 3 years (Mango, Pomegranate, etc.)",
    who: "Farmers in Maharashtra holding 7/12",
    start: "Apply during Kharif season",
    end: "Varies by district allocation",
    docs: ["Aadhaar", "7/12 and 8-A land records", "Bank passbook"],
    how: "Apply at mahadbt.maharashtra.gov.in",
    link: "https://mahadbt.maharashtra.gov.in",
  },
  {
    id: 15,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Gopinath Munde Shetkari Apghat Vima Yojana",
    short: "Accidental insurance cover of ₹2 lakh for farmers",
    ministry: "Government of Maharashtra",
    benefit:
      "₹2,00,000 (₹2 Lakh) cover for accidental death or permanent disability of a farmer",
    who: "All registered farmers in Maharashtra (10 to 75 years age)",
    start: "Ongoing",
    end: "Permanent scheme",
    docs: ["FIR copy", "Death certificate", "7/12 extract", "Heir certificate"],
    how: "Claim through Taluka Agriculture Officer within 45 days of accident",
    link: "https://krishi.maharashtra.gov.in",
  },
];

function GovtSchemes() {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("All");
  const [quizMode, setQuizMode] = useState(false);
  const [qSize, setQSize] = useState("Small/Marginal (<2 Hectares)");
  const [schemeSearch, setSchemeSearch] = useState("");

  const list = quizMode
    ? SCHEMES.filter((s) => {
        if (
          qSize.includes("Large") &&
          (s.name.includes("PMKSY") ||
            s.name.includes("Bhausaheb") ||
            s.name.includes("Pik Vima"))
        )
          return false;
        return true;
      })
    : filter === "All"
      ? SCHEMES
      : SCHEMES.filter((s) => s.tag === filter);

  const filtered = schemeSearch.trim()
    ? list.filter(
        (s) =>
          s.name.toLowerCase().includes(schemeSearch.toLowerCase()) ||
          s.short.toLowerCase().includes(schemeSearch.toLowerCase()),
      )
    : list;

  return (
    <div className="card mt3" id="sec-schemes">
      <div className="card-hd">
        <span className="card-title">🏛 Government Schemes</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          {list.length} SCHEMES
        </span>
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {["All", "Central", "Maharashtra"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setQuizMode(false);
              setSel(null);
            }}
            style={{
              background:
                !quizMode && filter === f ? "var(--gdim)" : "var(--s2)",
              border: `1px solid ${!quizMode && filter === f ? "var(--g3)" : "var(--b1)"}`,
              borderRadius: "6px",
              padding: "4px 12px",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              color: !quizMode && filter === f ? "var(--green)" : "var(--t2)",
              transition: "all .2s",
            }}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => {
            setQuizMode(true);
            setSel(null);
          }}
          style={{
            background: quizMode ? "var(--blue)" : "var(--s2)",
            border: `1px solid ${quizMode ? "var(--blue)" : "var(--b1)"}`,
            borderRadius: "6px",
            padding: "4px 12px",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: quizMode ? "#fff" : "var(--t2)",
          }}
        >
          ✨ Eligibility Quiz
        </button>
      </div>
      {quizMode && (
        <div
          style={{
            padding: "14px",
            background: "var(--bdim)",
            borderBottom: "1px solid var(--blue)",
          }}
        >
          <div className="xs t2 mb1 bold" style={{ color: "var(--blue)" }}>
            Find Schemes For You
          </div>
          <select
            className="input mt1"
            value={qSize}
            onChange={(e) => setQSize(e.target.value)}
          >
            <option>Small/Marginal (&lt;2 Hectares)</option>
            <option>Medium/Large (&gt;2 Hectares)</option>
          </select>
        </div>
      )}
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--b1)" }}>
        <input
          className="input"
          placeholder="Search schemes (e.g. KCC, solar, insurance)..."
          value={schemeSearch}
          onChange={(e) => setSchemeSearch(e.target.value)}
          style={{ fontSize: "12px", padding: "8px 12px" }}
        />
      </div>
      <div
        style={{
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: "520px",
          overflowY: "auto",
        }}
      >
        {filtered.length === 0 && (
          <div className="xs t3 tc" style={{ padding: "20px" }}>
            No schemes match your search.
          </div>
        )}
        {filtered.map((s) => (
          <div key={s.id}>
            <div
              onClick={() => setSel(sel?.id === s.id ? null : s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel?.id === s.id ? null : s); } }}
              aria-label={`${s.name}: tap to ${sel?.id === s.id ? "collapse" : "expand"}`}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: sel?.id === s.id ? "var(--s3)" : "var(--s2)",
                border: `1px solid ${sel?.id === s.id ? s.color : "var(--b1)"}`,
                cursor: "pointer",
                transition: "all .2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background:
                        s.tag === "Central" ? "var(--gdim)" : "var(--bdim)",
                      border: `1px solid ${s.color}`,
                      color: s.color,
                      marginBottom: "6px",
                      display: "inline-block",
                    }}
                  >
                    {s.tag}
                  </span>
                  <div
                    style={{
                      fontFamily: "Playfair Display",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: "4px",
                      lineHeight: 1.3,
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--t2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {s.short}
                  </div>
                </div>
                <span
                  style={{
                    color: "var(--t3)",
                    fontSize: "14px",
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                >
                  {sel?.id === s.id ? "▲" : "▼"}
                </span>
              </div>
            </div>
            {sel?.id === s.id && (
              <div
                style={{
                  margin: "4px 0",
                  padding: "16px",
                  background: "var(--s2)",
                  border: `1px solid ${s.color}`,
                  borderRadius: "12px",
                  animation: "fade-in .25s ease",
                }}
              >
                <div
                  style={{
                    padding: "8px 10px",
                    background: "var(--s3)",
                    borderRadius: "8px",
                    border: "1px solid var(--b1)",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      color: "var(--t3)",
                      letterSpacing: ".08em",
                      marginBottom: "2px",
                    }}
                  >
                    MINISTRY
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>
                    {s.ministry}
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--gdim)",
                    border: "1px solid var(--g3)",
                    borderRadius: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      color: "var(--green)",
                      letterSpacing: ".08em",
                      marginBottom: "4px",
                    }}
                  >
                    💰 BENEFIT
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.55 }}>
                    {s.benefit}
                  </div>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      color: "var(--t3)",
                      letterSpacing: ".08em",
                      marginBottom: "4px",
                    }}
                  >
                    👨‍🌾 WHO CAN APPLY
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--t2)",
                      lineHeight: 1.55,
                    }}
                  >
                    {s.who}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  {[
                    { l: "📅 START / WHEN", v: s.start, c: "var(--green)" },
                    { l: "⏰ END / DEADLINE", v: s.end, c: "var(--amber)" },
                  ].map((d) => (
                    <div
                      key={d.l}
                      style={{
                        padding: "10px",
                        background: "var(--s3)",
                        borderRadius: "8px",
                        border: "1px solid var(--b1)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          color: "var(--t3)",
                          letterSpacing: ".06em",
                          marginBottom: "4px",
                        }}
                      >
                        {d.l}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: d.c,
                          lineHeight: 1.4,
                        }}
                      >
                        {d.v}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      color: "var(--t3)",
                      letterSpacing: ".08em",
                      marginBottom: "6px",
                    }}
                  >
                    📄 DOCUMENTS REQUIRED
                  </div>
                  {s.docs.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        padding: "5px 0",
                        borderBottom: "1px solid var(--b1)",
                        fontSize: "12px",
                        color: "var(--t2)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--green)",
                          fontWeight: 600,
                          minWidth: "16px",
                        }}
                      >
                        {i + 1}.
                      </span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--s3)",
                    borderRadius: "8px",
                    border: "1px solid var(--b1)",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      color: "var(--t3)",
                      letterSpacing: ".08em",
                      marginBottom: "4px",
                    }}
                  >
                    🏢 HOW TO APPLY
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--t2)",
                      lineHeight: 1.55,
                    }}
                  >
                    {s.how}
                  </div>
                </div>
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "10px",
                    background: "var(--gdim)",
                    border: "1px solid var(--g3)",
                    borderRadius: "8px",
                    color: "var(--green)",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                    letterSpacing: ".04em",
                  }}
                >
                  🌐 OFFICIAL WEBSITE →
                </a>
                <button
                  onClick={() => setSel(null)}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "8px",
                    background: "none",
                    border: "1px solid var(--b1)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "var(--t2)",
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                  }}
                >
                  ▲ Collapse
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GovtSchemes;
