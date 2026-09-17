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
      "Land ownership records (7/12 utara / Jamabandi)",
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
    short: "Crop insurance against natural calamities at low premium (1.5–2%)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit:
      "Full insured sum on crop loss due to drought, flood, pest, unseasonal hail",
    who: "All farmers growing notified crops (sharecroppers & tenant farmers included)",
    start: "Kharif: June–July | Rabi: November–December",
    end: "Before cut-off date of respective season",
    docs: [
      "Aadhaar Card",
      "Land records (7/12, Khasra, Khatoni)",
      "Bank passbook with IFSC",
      "Sowing certificate from Patwari / Gram Panchayat",
    ],
    how: "Apply via bank, insurance company, CSC or pmfby.gov.in",
    link: "https://pmfby.gov.in",
  },
  {
    id: 3,
    tag: "Central",
    color: "#4ade80",
    name: "Kisan Credit Card (KCC)",
    short: "Flexible crop production credit at subsidized 4% interest rate",
    ministry: "Ministry of Finance + NABARD",
    benefit: "Credit limit up to ₹3 lakh at 4% effective interest (with prompt repayment)",
    who: "All farmers, sharecroppers, oral lessees, SHGs, Animal Husbandry & Fishermen",
    start: "Ongoing — apply anytime",
    end: "No deadline — permanent scheme",
    docs: ["Aadhaar", "PAN Card", "Land ownership documents", "Passport Photo", "Bank details"],
    how: "Apply at any nationalized bank, cooperative bank, or RRB",
    link: "https://www.nabard.org",
  },
  {
    id: 4,
    tag: "Central",
    color: "#4ade80",
    name: "Soil Health Card Scheme",
    short: "Free 12-parameter soil testing + customized fertilizer advisory",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Free soil testing (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) every 2 years",
    who: "All farmers with agricultural land",
    start: "Ongoing — testing camps held round the year",
    end: "No end date",
    docs: ["Aadhaar Card", "Land records", "Soil sample from your field"],
    how: "Contact nearest KVK, State Soil Testing Lab or District Agriculture Office",
    link: "https://soilhealth.dac.gov.in",
  },
  {
    id: 5,
    tag: "Central",
    color: "#4ade80",
    name: "PM Krishi Sinchai Yojana (PMKSY - Per Drop More Crop)",
    short: "Drip & sprinkler micro-irrigation subsidy up to 55%",
    ministry: "Ministry of Agriculture & Farmers Welfare / Ministry of Jal Shakti",
    benefit: "55% subsidy for small/marginal farmers, 45% for other farmers on micro-irrigation",
    who: "All farmers with assured water source",
    start: "Ongoing — state quota allocation",
    end: "Varies by state financial year",
    docs: [
      "Aadhaar Card",
      "Land 7/12 & 8-A records",
      "Bank passbook",
      "Water source certificate (Well / Borewell)",
      "Quotation from approved micro-irrigation manufacturer",
    ],
    how: "Apply at District Agriculture Office or state DBT portal (e.g., MahaDBT)",
    link: "https://pmksy.gov.in",
  },
  {
    id: 6,
    tag: "Central",
    color: "#4ade80",
    name: "Paramparagat Krishi Vikas Yojana (PKVY)",
    short: "₹50,000/hectare financial assistance for organic farming certification",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹50,000/ha for 3 years (₹31,000 directly for organic inputs + biofertilizers)",
    who: "Farmer groups/clusters — minimum 20 farmers with 20+ hectares cluster",
    start: "Cluster proposals invited annually",
    end: "Ongoing scheme",
    docs: [
      "Aadhaar Card",
      "Land records",
      "PGS India Cluster registration form",
      "Bank account of cluster / FPO",
    ],
    how: "Form cluster with neighbouring farmers. Apply via KVK or District Agriculture Office",
    link: "https://pgsindia-ncof.gov.in",
  },
  {
    id: 7,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Namo Shetkari Maha Samman Nidhi",
    short: "Additional ₹6,000/year on top of PM-KISAN — Maharashtra farmers",
    ministry: "Government of Maharashtra",
    benefit: "₹6,000/year extra in 3 instalments (combined ₹12,000/yr with PM-KISAN)",
    who: "Maharashtra farmers registered & active under PM-KISAN",
    start: "Ongoing — automatic DBT transfer",
    end: "No end date",
    docs: [
      "PM-KISAN registration ID",
      "Aadhaar-seeded bank account",
      "7/12 land extract",
    ],
    how: "Auto-credited for active PM-KISAN beneficiaries in Maharashtra",
    link: "https://krishi.maharashtra.gov.in",
  },
  {
    id: 8,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Magel Tyala Shet Tale (Farm Pond Scheme)",
    short: "Financial subsidy of ₹50,000 to ₹75,000 for constructing farm ponds",
    ministry: "Maharashtra Agriculture Department",
    benefit: "Direct subsidy up to ₹75,000 for plastic-lined farm pond water storage",
    who: "Farmers in Maharashtra holding at least 0.5 hectare agricultural land",
    start: "Apply anytime via MahaDBT portal",
    end: "Subject to annual district targets",
    docs: [
      "7/12 and 8-A land records",
      "Aadhaar Card",
      "Bank passbook",
      "Site geotag photograph",
    ],
    how: "Apply online at mahadbt.maharashtra.gov.in under Farmer Schemes",
    link: "https://mahadbt.maharashtra.gov.in",
  },
  {
    id: 9,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Birsa Munda Krishi Kranti Yojana",
    short: "100% subsidy for new wells, micro-irrigation & power connections for ST farmers",
    ministry: "Maharashtra Tribal Development Department",
    benefit: "Up to ₹2.5 lakh for new well, ₹50,000 for pump set, and ₹50,000 for farm pond",
    who: "Scheduled Tribe (ST) category landholding farmers in Maharashtra",
    start: "Apply: June–August",
    end: "Subject to district tribal budget",
    docs: [
      "Aadhaar Card",
      "Valid ST Caste Certificate",
      "7/12 & 8-A land records",
      "Non-encumbrance certificate",
      "Bank passbook",
    ],
    how: "Apply on MahaDBT portal or submit to Project Officer, Integrated Tribal Dev Project",
    link: "https://tribal.maharashtra.gov.in",
  },
  {
    id: 10,
    tag: "Central",
    color: "#4ade80",
    name: "eNAM — National Agriculture Market",
    short: "Pan-India electronic trading portal connecting 1,361+ mandis",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Direct online competitive bidding across India, transparent weighment & instant DBT settlement",
    who: "All farmers, FPOs, and registered traders across India",
    start: "Register anytime at enam.gov.in",
    end: "Permanent national digital infrastructure",
    docs: [
      "Aadhaar Card",
      "Bank passbook",
      "Active Mobile number",
      "Produce assaying slip (from APMC gate)",
    ],
    how: "Register at enam.gov.in or visit helpdesk at any eNAM-enabled APMC mandi",
    link: "https://enam.gov.in",
  },
  {
    id: 11,
    tag: "Central",
    color: "#4ade80",
    name: "PM-KUSUM (Component B & C)",
    short: "60% subsidy on standalone & grid-connected solar agricultural pumps",
    ministry: "Ministry of New and Renewable Energy (MNRE)",
    benefit: "30% Central + 30% State subsidy (farmer pays only 10–40% or bank loan)",
    who: "Individual farmers, water user associations, and farmer groups",
    start: "State-wise tender batches announced quarterly",
    end: "Mission extended through 2026",
    docs: ["Aadhaar", "7/12 land records", "Bank passbook", "Water source proof", "Passport photograph"],
    how: "Apply via state renewable energy development agency (e.g., MEDA / HAREDA / RREC)",
    link: "https://pmkusum.mnre.gov.in",
  },
  {
    id: 12,
    tag: "Central",
    color: "#4ade80",
    name: "Sub-Mission on Agricultural Mechanization (SMAM)",
    short: "40%–80% subsidy on purchase of tractors, rotavators, harvesters & CHCs",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Subsidy up to ₹10 lakh for Custom Hiring Centers (CHCs) and 40–50% on individual machinery",
    who: "Small & marginal farmers, women farmers, SC/ST get priority and higher subsidy",
    start: "Annual state window (Kharif / Rabi)",
    end: "Subject to annual state allocation",
    docs: [
      "Aadhaar Card",
      "Land ownership documents (7/12 / Jamabandi)",
      "Bank passbook",
      "Machinery quotation from authorized dealer",
    ],
    how: "Apply online at agrimachinery.nic.in or state DBT portal",
    link: "https://agrimachinery.nic.in",
  },
  {
    id: 13,
    tag: "Central",
    color: "#4ade80",
    name: "Agriculture Infrastructure Fund (AIF)",
    short: "₹1 Lakh Crore credit facility with 3% interest subvention for post-harvest infra",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "3% interest subvention on bank loans up to ₹2 Crore for cold storage, sorting, silos & packhouses",
    who: "Farmers, Agri-entrepreneurs, Startups, Primary Agricultural Credit Societies (PACS), FPOs",
    start: "Ongoing scheme",
    end: "Permanent credit subvention",
    docs: [
      "Detailed Project Report (DPR)",
      "Land documents / Lease deed",
      "KYC documents & Bank statements",
      "Registration certificate (for FPO / SHG)",
    ],
    how: "Submit DPR and apply directly at agriinfra.dac.gov.in",
    link: "https://agriinfra.dac.gov.in",
  },
  {
    id: 14,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Bhausaheb Fundkar Orchard Planting Scheme",
    short: "100% subsidy for plantation of fruit orchards across Maharashtra",
    ministry: "Maharashtra Department of Horticulture",
    benefit:
      "100% expenditure for pit digging, saplings, fertilizer, and 3-year survival maintenance (Mango, Pomegranate, Guava, Custard Apple, Dragon Fruit)",
    who: "Farmers in Maharashtra holding land in 7/12 extract",
    start: "Kharif planting season (May–August)",
    end: "District target quota basis",
    docs: ["Aadhaar", "7/12 and 8-A land records", "Bank passbook", "Consent letter"],
    how: "Apply at mahadbt.maharashtra.gov.in under Horticulture schemes",
    link: "https://mahadbt.maharashtra.gov.in",
  },
  {
    id: 15,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Gopinath Munde Shetkari Apghat Suraksha Sanugrah Anudan",
    short: "₹2 Lakh accident insurance compensation for farmer families",
    ministry: "Government of Maharashtra",
    benefit:
      "₹2,00,000 compensation on accidental death or loss of two limbs/eyes; ₹1,00,000 for loss of one limb/eye",
    who: "All registered farmers and family members in Maharashtra aged 10–75 years",
    start: "Ongoing scheme",
    end: "Permanent welfare scheme",
    docs: ["FIR / Police Panchnama", "Post-mortem / Death report", "7/12 land extract", "Legal heir certificate"],
    how: "Submit claim through Taluka Agriculture Officer within 45 days of accident occurrence",
    link: "https://krishi.maharashtra.gov.in",
  },
  {
    id: 16,
    tag: "Central",
    color: "#4ade80",
    name: "PM Kisan Maandhan Yojana (PM-KMY)",
    short: "Assured monthly pension of ₹3,000 after attaining 60 years age",
    ministry: "Ministry of Agriculture & Farmers Welfare + LIC",
    benefit: "Guaranteed monthly pension of ₹3,000/month after 60 years with 50% central matching contribution",
    who: "Small and marginal farmers (owning <2 hectares) aged 18 to 40 years",
    start: "Ongoing enrollment",
    end: "Permanent social security",
    docs: ["Aadhaar Card", "Bank passbook / Jan Dhan account", "Land 7/12 records"],
    how: "Enroll at nearest CSC center or register online at maandhan.in",
    link: "https://maandhan.in",
  },
  {
    id: 17,
    tag: "Central",
    color: "#4ade80",
    name: "Mission for Integrated Development of Horticulture (MIDH)",
    short: "40%–50% capital subsidy for Polyhouses, Shade Nets & Packhouses",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Capital subsidy for protected cultivation (polyhouse, shade net), high-density planting & cold chains",
    who: "Individual horticulturists, FPOs, Cooperatives",
    start: "Annual state allocation windows",
    end: "Ongoing scheme",
    docs: ["Land records", "DPR for protected structure", "Aadhaar Card", "Vendor estimate"],
    how: "Apply via District Horticulture Officer or State Horticulture Mission portal",
    link: "https://midh.gov.in",
  },
  {
    id: 18,
    tag: "Central",
    color: "#4ade80",
    name: "National Mission on Edible Oils - Oil Palm (NMEO-OP)",
    short: "Up to ₹29,000/ha planting subsidy + price assurance mechanism",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹29,000/ha assistance for planting material and intercropping maintenance support",
    who: "Farmers in identified potential oil palm clusters",
    start: "Ongoing",
    end: "National target 2026",
    docs: ["Aadhaar Card", "Land title documents", "Bank passbook"],
    how: "Apply via State Department of Agriculture / Horticulture oil palm division",
    link: "https://nmeo.dac.gov.in",
  },
  {
    id: 19,
    tag: "Central",
    color: "#4ade80",
    name: "Pradhan Mantri Matsya Sampada Yojana (PMMSY)",
    short: "40%–60% subsidy for fish ponds, biofloc, RAS & aquaculture equipment",
    ministry: "Department of Fisheries, Ministry of Fisheries, Animal Husbandry & Dairying",
    benefit: "40% subsidy for general category, 60% for women & SC/ST for new ponds, hatcheries, and feed mills",
    who: "Fish farmers, SHGs, JLGs, Fisheries Cooperatives, Entrepreneurs",
    start: "Ongoing",
    end: "National flagship mission",
    docs: ["Land/water body documents", "Detailed Project Report", "Aadhaar", "Bank passbook"],
    how: "Submit project proposal to District Fisheries Officer or apply at pmmsy.dof.gov.in",
    link: "https://pmmsy.dof.gov.in",
  },
  {
    id: 20,
    tag: "Central",
    color: "#4ade80",
    name: "National Beekeeping & Honey Mission (NBHM)",
    short: "Up to 80% subsidy on beehive boxes, bee colonies & extraction units",
    ministry: "National Bee Board (NBB), Ministry of Agriculture",
    benefit: "Subsidy for purchasing 10–50 bee boxes with colonies, honey processing & bee venom collection",
    who: "Small farmers, youth, landless laborers, and bee keeping clusters",
    start: "Ongoing enrollment",
    end: "Sweet Revolution Mission",
    docs: ["Aadhaar", "Training certificate from KVK / NBB", "Bank passbook"],
    how: "Register at Madhukranti portal (madhukranti.in) and contact local KVK",
    link: "https://nbb.gov.in",
  },
  {
    id: 21,
    tag: "Central",
    color: "#4ade80",
    name: "Sub-Mission on Agroforestry (Har Medh Par Ped)",
    short: "Financial incentive of ₹70/tree for boundary & bund tree plantation",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Assistance of ₹70 per surviving tree for timber, fruit & medicinal trees planted on field bunds",
    who: "All agricultural landowners",
    start: "Monsoon planting season",
    end: "Ongoing",
    docs: ["Aadhaar Card", "7/12 Land records", "Bank passbook"],
    how: "Contact Taluka Agriculture Officer or social forestry nursery",
    link: "https://agricoop.nic.in",
  },
  {
    id: 22,
    tag: "Maharashtra",
    color: "#60a5fa",
    name: "Dr. Babasaheb Ambedkar Krishi Swavalamban Yojana",
    short: "Up to ₹2.5 Lakh subsidy for new wells & farm electrification for SC/Navbouddha farmers",
    ministry: "Maharashtra Social Justice & Special Assistance Department",
    benefit: "₹2.5 Lakh for new well, ₹50,000 for pump set, ₹50,000 for farm pond lining, ₹25,000 for drip irrigation",
    who: "Scheduled Caste (SC) & Neo-Buddhist landholding farmers in Maharashtra",
    start: "Ongoing application via MahaDBT",
    end: "Subject to annual allocation",
    docs: ["SC Caste Certificate", "Income Certificate (<₹1.5 Lakh)", "7/12 & 8-A records", "Aadhaar Card"],
    how: "Apply online at mahadbt.maharashtra.gov.in under Special Component Scheme",
    link: "https://mahadbt.maharashtra.gov.in",
  },
  {
    id: 23,
    tag: "Central",
    color: "#4ade80",
    name: "PM-PRANAM (Bio & Organic Nutrient Promotion)",
    short: "Special grants for adopting nano fertilizers, neem cake & organic bio-inputs",
    ministry: "Ministry of Chemicals & Fertilizers",
    benefit: "Direct state incentives & input vouchers for reducing chemical fertilizer consumption by 25%+",
    who: "All farmers shifting towards integrated plant nutrition management",
    start: "Ongoing",
    end: "Cabinet Approved 2026",
    docs: ["Aadhaar Card", "Soil Health Card", "Fertilizer purchase receipt"],
    how: "Consult local Agriculture Extension Officer or Primary Agricultural Credit Society (PACS)",
    link: "https://fert.nic.in",
  },
  {
    id: 24,
    tag: "Central",
    color: "#4ade80",
    name: "Rashtriya Krishi Vikas Yojana (RKVY - RAFTAAR)",
    short: "Grants up to ₹25 Lakh for Agri-startups, incubation & FPO processing units",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Idea stage grant of ₹5 Lakh, seed stage grant of ₹25 Lakh for agricultural value-addition & innovations",
    who: "Farmers, FPOs, Agri-startups, Rural youth innovators",
    start: "Call for applications twice a year via RKVY Knowledge Partners",
    end: "Ongoing program",
    docs: ["Business proposal / DPR", "Incorporation/FPO certificate", "Bank details", "Founder KYC"],
    how: "Apply via accredited Knowledge Partners (e.g., MANAGE Hyderabad, IARI New Delhi, VAMNICOM Pune)",
    link: "https://rkvy.nic.in",
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
