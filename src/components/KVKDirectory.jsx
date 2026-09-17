const KVK_DATA = [
  {
    district: "Pune",
    name: "KVK Baramati",
    phone: "02112-255207",
    address: "Malegaon Colony, Baramati, Pune",
  },
  {
    district: "Nashik",
    name: "KVK Nashik",
    phone: "0253-2393433",
    address: "Yashwantrao Chavan Open Univ Campus, Nashik",
  },
  {
    district: "Ahmednagar",
    name: "KVK Babhaleshwar",
    phone: "02422-252414",
    address: "Babhaleshwar, Tal-Rahata, Ahmednagar",
  },
  {
    district: "Jalgaon",
    name: "KVK Jalgaon",
    phone: "02582-251261",
    address: "Mamurabad Farm, Jalgaon",
  },
  {
    district: "Kolhapur",
    name: "KVK Kolhapur",
    phone: "0231-2601446",
    address: "Kaneri Math, Tal-Karveer, Kolhapur",
  },
  {
    district: "Nagpur",
    name: "KVK Nagpur",
    phone: "0712-2500168",
    address: "College of Agriculture, Nagpur",
  },
  {
    district: "Aurangabad",
    name: "KVK Paithan",
    phone: "02431-223230",
    address: "Paithan Road, Aurangabad",
  },
  {
    district: "Solapur",
    name: "KVK Solapur",
    phone: "0217-2372016",
    address: "Mohol, Solapur",
  },
  {
    district: "Sangli",
    name: "KVK Sangli",
    phone: "0233-2211266",
    address: "Mangalwedha Road, Sangli",
  },
  {
    district: "Latur",
    name: "KVK Latur",
    phone: "02382-227584",
    address: "Udgir Road, Latur",
  },
  {
    district: "Satara",
    name: "KVK Satara",
    phone: "02162-233456",
    address: "Koregaon, Satara",
  },
  {
    district: "Ratnagiri",
    name: "KVK Ratnagiri",
    phone: "02352-228200",
    address: "Lanja, Ratnagiri",
  },
];

export default function KVKDirectory() {
  return (
    <div className="card mt3">
      <div className="card-hd">
        <span className="card-title">Local Expert Directory (KVK)</span>
      </div>
      <div className="card-body">
        <p className="xs t2 mb2">
          Call your nearest Krishi Vigyan Kendra for free agricultural
          consultation.
        </p>
        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
          {KVK_DATA.map((k, i) => (
            <div
              key={i}
              style={{
                padding: "10px",
                borderBottom: "1px solid var(--b1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="sm bold">
                  {k.district} - {k.name}
                </div>
                <div className="xs t3 mt1">{k.address}</div>
              </div>
              <a
                href={`tel:${k.phone}`}
                className="btn btn-g btn-sm"
                aria-label={`Call ${k.name}, ${k.district} district`}
                style={{ flexShrink: 0, padding: "6px 10px" }}
              >
                Call
              </a>
              <a
                href={mapsUrl(k)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-o btn-sm"
                aria-label={`Map for ${k.name}`}
              >
                Map
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function mapsUrl(k) {
  const base = "https://maps.google.com/?q=";
  return base + encodeURIComponent(k.name + ", " + k.address);
}
