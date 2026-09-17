import { useState } from "react";

const KVK_DATA = [
  // Maharashtra
  { state: "Maharashtra", district: "Pune", name: "KVK Baramati (Sharadchandraji Pawar)", phone: "02112-255207", address: "Malegaon Colony, Baramati, Pune - 413115" },
  { state: "Maharashtra", district: "Pune", name: "KVK Narayangaon", phone: "02132-243455", address: "Gramonnati Mandal, Narayangaon, Junnar, Pune - 410504" },
  { state: "Maharashtra", district: "Nashik", name: "KVK Yashwantrao Chavan", phone: "0253-2393433", address: "YCMOU Campus, Dnyangangotri, Near Gangapur Dam, Nashik - 422222" },
  { state: "Maharashtra", district: "Ahmednagar", name: "KVK Babhaleshwar (PIRENS)", phone: "02422-252414", address: "Babhaleshwar, Tal-Rahata, Ahmednagar - 413737" },
  { state: "Maharashtra", district: "Jalgaon", name: "KVK Mamurabad Farm", phone: "02582-251261", address: "Mamurabad Farm, Post Box No. 64, Jalgaon - 425001" },
  { state: "Maharashtra", district: "Kolhapur", name: "KVK Kaneri Math", phone: "0231-2601446", address: "Siddhagiri Math, Kaneri, Karveer, Kolhapur - 416234" },
  { state: "Maharashtra", district: "Nagpur", name: "KVK College of Agriculture", phone: "0712-2500168", address: "Maharajbagh, College of Agriculture, Nagpur - 440001" },
  { state: "Maharashtra", district: "Chhatrapati Sambhajinagar", name: "KVK Paithan", phone: "02431-223230", address: "Paithan Road, Aurangabad - 431107" },
  { state: "Maharashtra", district: "Solapur", name: "KVK Mohol", phone: "0217-2372016", address: "Zonal Agril. Research Station, Mohol, Solapur - 413213" },
  { state: "Maharashtra", district: "Sangli", name: "KVK Telsang / Sangli", phone: "0233-2211266", address: "Mangalwedha Road, Jath / Sangli - 416416" },
  { state: "Maharashtra", district: "Latur", name: "KVK Manjara Trust", phone: "02382-227584", address: "Udgir Road, Motinagar, Latur - 413512" },
  { state: "Maharashtra", district: "Satara", name: "KVK Borgaon", phone: "02162-233456", address: "Regional Agril. Research Station, Borgaon, Satara - 415519" },
  { state: "Maharashtra", district: "Ratnagiri", name: "KVK Lanja", phone: "02352-228200", address: "Dr. BSKKV Research Station, Lanja, Ratnagiri - 416701" },
  { state: "Maharashtra", district: "Amravati", name: "KVK Durgapur (Badnera)", phone: "0721-2580645", address: "Badnera Road, Durgapur, Amravati - 444701" },

  // Punjab & Haryana
  { state: "Punjab", district: "Ludhiana", name: "KVK Samrala (PAU)", phone: "0161-2401960", address: "PAU Extension Center, Samrala, Ludhiana - 141114" },
  { state: "Punjab", district: "Bhatinda", name: "KVK Bathinda", phone: "0164-2212159", address: "Regional Station, Dabwali Road, Bathinda - 151001" },
  { state: "Haryana", district: "Karnal", name: "KVK NDRI Campus", phone: "0184-2259023", address: "National Dairy Research Institute, Karnal - 132001" },
  { state: "Haryana", district: "Hisar", name: "KVK CCS HAU", phone: "01662-289264", address: "Chaudhary Charan Singh HAU Campus, Hisar - 125004" },

  // Uttar Pradesh
  { state: "Uttar Pradesh", district: "Varanasi", name: "KVK Kallipur (ICAR-IIVR)", phone: "0542-2635227", address: "ICAR-Indian Institute of Vegetable Research, Varanasi - 221305" },
  { state: "Uttar Pradesh", district: "Lucknow", name: "KVK ICAR-IISR", phone: "0522-2480726", address: "Indian Institute of Sugarcane Research, Lucknow - 226002" },
  { state: "Uttar Pradesh", district: "Kanpur", name: "KVK CSAUAT", phone: "0512-2534156", address: "Chandra Shekhar Azad Univ of Ag & Tech, Kanpur - 208002" },
  { state: "Uttar Pradesh", district: "Meerut", name: "KVK Hastinapur (SVPUAT)", phone: "0121-2888511", address: "Sardar Vallabhbhai Patel Univ, Hastinapur, Meerut - 250110" },

  // Madhya Pradesh & Rajasthan
  { state: "Madhya Pradesh", district: "Indore", name: "KVK Kasturbagram", phone: "0731-2856214", address: "Kasturbagram Rural Institute, Indore - 452020" },
  { state: "Madhya Pradesh", district: "Bhopal", name: "KVK ICAR-CIAE", phone: "0755-2521000", address: "Central Institute of Agril Engineering, Berasia Road, Bhopal - 462038" },
  { state: "Rajasthan", district: "Jaipur", name: "KVK Chomu (SKNAU)", phone: "01423-222030", address: "SKN Agriculture University Center, Chomu, Jaipur - 303702" },
  { state: "Rajasthan", district: "Jodhpur", name: "KVK ICAR-CAZRI", phone: "0291-2786534", address: "Central Arid Zone Research Institute, Light Industrial Area, Jodhpur - 342003" },

  // Gujarat
  { state: "Gujarat", district: "Anand", name: "KVK Anand Agricultural Univ", phone: "02692-261310", address: "AAU Main Campus, Anand - 388110" },
  { state: "Gujarat", district: "Surat", name: "KVK Navsari Ag Univ (Athwa)", phone: "0261-2668045", address: "Agril Research Station, Athwa Farm, Surat - 395007" },

  // Karnataka & Andhra Pradesh
  { state: "Karnataka", district: "Bengaluru Rural", name: "KVK Hadonahalli (UASB)", phone: "080-27651044", address: "UAS Campus, Tubagere Hobli, Doddaballapura, Bengaluru - 561205" },
  { state: "Karnataka", district: "Dharwad", name: "KVK UAS Dharwad", phone: "0836-2448349", address: "University of Agricultural Sciences, Dharwad - 580005" },
  { state: "Andhra Pradesh", district: "Guntur", name: "KVK Lam Farm (ANGRAU)", phone: "0863-2524017", address: "Regional Agril Research Station, Lam, Guntur - 522034" },
  { state: "Tamil Nadu", district: "Coimbatore", name: "KVK TNAU Campus", phone: "0422-6611223", address: "Tamil Nadu Agricultural University, Coimbatore - 641003" },
];

export default function KVKDirectory() {
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("All");

  const states = ["All", ...Array.from(new Set(KVK_DATA.map((k) => k.state)))];

  const filtered = KVK_DATA.filter((k) => {
    const matchState = selectedState === "All" || k.state === selectedState;
    const matchQuery =
      search.trim() === "" ||
      k.district.toLowerCase().includes(search.toLowerCase()) ||
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.address.toLowerCase().includes(search.toLowerCase());
    return matchState && matchQuery;
  });

  return (
    <div className="card mt3" id="sec-kvk">
      <div className="card-hd flex jcb aic">
        <span className="card-title">📞 Local Expert Directory (ICAR-KVK)</span>
        <span className="chip cg" style={{ fontSize: "9px" }}>
          {filtered.length} Centers
        </span>
      </div>
      <div className="card-body">
        <p className="xs t2 mb2">
          Direct consultation with ICAR Krishi Vigyan Kendra scientists for localized disease management, soil testing, and certified seed procurement.
        </p>

        <div className="flex gap2 wrap mb2">
          <input
            className="input"
            style={{ flex: 1, minWidth: "160px", padding: "6px 12px", fontSize: "12px" }}
            placeholder="Search by district or city name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search KVK directory"
          />
          <select
            className="input"
            style={{ padding: "6px 10px", fontSize: "12px", maxWidth: "160px" }}
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            aria-label="Filter by state"
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
          {filtered.length === 0 ? (
            <div className="tc xs t3 p3">No KVK centers found matching your search.</div>
          ) : (
            filtered.map((k, i) => (
              <div
                key={i}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex aic gap1">
                    <span className="sm bold" style={{ color: "var(--fg)" }}>
                      {k.district}
                    </span>
                    <span
                      className="chip"
                      style={{
                        fontSize: "8px",
                        padding: "1px 5px",
                        background: "var(--s3)",
                        color: "var(--t3)",
                      }}
                    >
                      {k.state}
                    </span>
                  </div>
                  <div className="xs bold mt1" style={{ color: "var(--green)" }}>
                    {k.name}
                  </div>
                  <div className="xs t3 mt1 truncate" title={k.address}>
                    {k.address}
                  </div>
                </div>
                <div className="flex gap1 aic" style={{ flexShrink: 0 }}>
                  <a
                    href={`tel:${k.phone}`}
                    className="btn btn-g btn-sm"
                    aria-label={`Call ${k.name}, ${k.district}`}
                    style={{ padding: "6px 10px", fontSize: "11px" }}
                  >
                    📞 Call
                  </a>
                  <a
                    href={mapsUrl(k)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-o btn-sm"
                    aria-label={`Directions to ${k.name}`}
                    style={{ padding: "6px 8px", fontSize: "11px" }}
                  >
                    📍 Map
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function mapsUrl(k) {
  const base = "https://maps.google.com/?q=";
  return base + encodeURIComponent(k.name + ", " + k.address);
}
