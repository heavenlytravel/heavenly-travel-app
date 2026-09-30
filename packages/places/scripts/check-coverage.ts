// Usage: pnpm --filter @repo/places check-coverage [district-code ...]
//
// Geocodes real places through Google and reports the district each lands
// in by its coordinates, next to the district it is known to sit in, so the
// boundaries in data/malaysia-districts.json can be checked against where
// Google puts real places. A group with no district holds places from
// several districts and is reported only. Exits 1 on a miss. Needs
// GOOGLE_MAPS_SERVER_KEY (apps/web/.env.local) and DATABASE_URL
// (packages/db/.env); the package script loads both. Run it after a new
// release of the boundary data, and when a customer reports a served place
// as not served. Add a place here when one surprises.
//
// The db modules are imported by path: the package entry carries
// `server-only`, which throws outside React, as the scripts in packages/db do.
import { db } from "../../db/src/client";
import { resolveDistrict } from "../../db/src/coverage";
import { googleProvider } from "../src/google";

type Expectation = {
  /** The district the places sit in, or null for a mixed group that is only reported. */
  district: string | null;
  /** Why these places are grouped. */
  area: string;
  places: string[];
};

/**
 * Well-known places, grouped by the district they sit in. Every district
 * served at launch gets a few, and the districts next to them get some too,
 * so a boundary that is off shows up as a miss rather than a silence.
 */
const EXPECTATIONS: Expectation[] = [
  {
    district: "Kuala Lumpur",
    area: "Kuala Lumpur",
    places: [
      "Pavilion Kuala Lumpur",
      "KL Sentral",
      "Mont Kiara",
      "Bangsar Village",
      "Cheras Leisure Mall",
      "Setapak Central",
      "Kepong Metro Prima",
      "Bukit Jalil Stadium",
      "Sentul KL",
    ],
  },
  {
    district: "Putrajaya",
    area: "Putrajaya",
    places: ["Putrajaya Sentral"],
  },
  {
    district: "Petaling",
    area: "Petaling",
    places: [
      "Bukit Rahman Putra",
      "Bandar Sri Damansara",
      "Sunway Pyramid",
      "1 Utama Shopping Centre",
      "IOI Mall Puchong",
      "The Mines Shopping Mall",
      "UPM Serdang",
      "Sungai Buloh KTM Station",
      "Paradigm Mall Petaling Jaya",
      "Kota Damansara MRT",
      "Setia City Mall",
      "Shah Alam Stadium",
      "Ara Damansara LRT",
      "Bandar Kinrara",
      "Damansara Utama",
      "Subang Parade",
      "Putra Heights LRT",
      "Subang Airport",
    ],
  },
  {
    district: "Klang",
    area: "Klang",
    places: [
      "Kota Kemuning",
      "AEON Bukit Tinggi Klang",
      "Port Klang",
      "Klang KTM Station",
      "Kapar",
      "Meru Klang",
      "Pulau Ketam Jetty",
    ],
  },
  {
    district: "Gombak",
    area: "Gombak",
    places: [
      "Batu Caves",
      "Selayang Mall",
      "Selayang Hospital",
      "Rawang KTM Station",
      "IIUM Gombak",
      "Bandar Tasik Puteri",
    ],
  },
  {
    district: "Gombak",
    area: "Gombak, on the Kuala Lumpur line: the boundary data puts it here",
    places: ["Gombak LRT Station"],
  },
  {
    district: "Hulu Langat",
    area: "Hulu Langat",
    places: [
      "Kajang Stadium",
      "Bandar Baru Bangi",
      "UKM Bangi",
      "Semenyih",
      "Ampang Point",
      "Balakong",
      "Bandar Sungai Long",
      "Cheras Selatan",
      "Cheras Batu 9",
      "Hulu Langat Waterfall",
      "Batu 14 Hulu Langat",
    ],
  },
  {
    district: "Sepang",
    area: "Sepang",
    places: [
      "IOI City Mall Putrajaya",
      "KLIA Terminal 1",
      "Tune Hotel klia2",
      "Sama-Sama Hotel KLIA",
      "Cyberjaya",
      "Sepang International Circuit",
      "Dengkil",
      "Bandar Baru Salak Tinggi",
      "Kota Warisan",
    ],
  },
  {
    district: "Sepang",
    area: "Sepang, the airport itself",
    places: ["KLIA Terminal 2", "klia2"],
  },
  {
    district: "Kuala Langat",
    area: "Kuala Langat",
    places: [
      "Banting",
      "Morib Beach",
      "Jenjarom",
      "Telok Panglima Garang",
      "Bandar Saujana Putra",
    ],
  },
  {
    district: "Hulu Selangor",
    area: "Hulu Selangor",
    places: ["Kuala Kubu Bharu", "Batang Kali", "Serendah"],
  },
  {
    district: "Hulu Selangor",
    area: "Hulu Selangor, near Rawang",
    places: ["Bukit Beruntung"],
  },
  {
    district: "Kuala Selangor",
    area: "Kuala Selangor",
    places: ["Kuala Selangor Nature Park", "Puncak Alam", "Ijok"],
  },
  {
    district: null,
    area: "Around the Klang Valley, several districts",
    places: [
      "Sekinchan",
      "Nilai KTM Station",
      "Seremban",
      "Resorts World Genting",
      "Genting Skyway",
      "Port Dickson",
      "Bentong",
      "Labuan Financial Park",
    ],
  },
  {
    district: "Langkawi",
    area: "Langkawi",
    places: [
      "Langkawi International Airport",
      "Kuah Jetty",
      "Meritus Pelangi Beach Resort",
      "Casa del Mar Langkawi",
      "Langkawi Sky Bridge",
      "Four Seasons Resort Langkawi",
      "The Danna Langkawi",
      "Berjaya Langkawi Resort",
      "Kilim Geoforest Park",
      "The Datai Langkawi",
      "Padang Matsirat",
      "Ayer Hangat",
    ],
  },
  {
    district: "Langkawi",
    area: "Langkawi, the beaches themselves",
    places: ["Pantai Cenang", "Tanjung Rhu Beach"],
  },
  {
    district: null,
    area: "Around Langkawi, several districts",
    places: [
      "Alor Setar",
      "Kuala Perlis Jetty",
      "Kuala Kedah Jetty",
      "Sungai Petani",
    ],
  },
  {
    district: "Timur Laut",
    area: "Timur Laut",
    places: [
      "KOMTAR",
      "Gurney Plaza",
      "Pulau Tikus",
      "Batu Ferringhi",
      "Penang Hill",
      "Tanjung Bungah",
      "Air Itam",
      "Jelutong Penang",
      "Gelugor",
    ],
  },
  {
    district: "Timur Laut",
    area: "Timur Laut, on the Barat Daya line: the boundary data puts them here",
    places: ["Queensbay Mall", "Sungai Ara"],
  },
  {
    district: "Barat Daya",
    area: "Barat Daya",
    places: [
      "Penang International Airport",
      "Bayan Baru",
      "Balik Pulau",
      "Teluk Bahang",
      "Teluk Kumbar",
      "Batu Maung",
    ],
  },
  {
    district: "Seberang Perai Utara",
    area: "Seberang Perai Utara",
    places: [
      "Penang Sentral",
      "Butterworth Ferry Terminal",
      "Kepala Batas Penang",
      "Tasek Gelugor",
      "Bandar Bertam Perdana",
    ],
  },
  {
    district: "Seberang Perai Tengah",
    area: "Seberang Perai Tengah",
    places: [
      "Bukit Mertajam",
      "Seberang Jaya",
      "Perai",
      "Juru Autocity",
      "Permatang Pauh",
    ],
  },
  {
    district: "Seberang Perai Selatan",
    area: "Seberang Perai Selatan",
    places: [
      "IKEA Batu Kawan",
      "Bukit Tambun",
      "Nibong Tebal",
      "Simpang Ampat Penang",
      "Sungai Bakap",
    ],
  },
  {
    district: null,
    area: "Around Penang, several districts",
    places: ["Kulim", "Parit Buntar", "Bandar Baharu Kedah"],
  },
  {
    district: "Melaka Tengah",
    area: "Melaka Tengah",
    places: [
      "A Famosa Fort",
      "Jonker Street",
      "Melaka Sentral",
      "Ayer Keroh",
      "Klebang Beach",
      "Bandar Hilir",
      "Melaka International Airport",
      "Bukit Katil",
      "Bukit Baru Melaka",
      "Cheng Melaka",
      "Tangga Batu",
      "Sungai Udang",
    ],
  },
  {
    district: "Alor Gajah",
    area: "Alor Gajah",
    places: [
      "Alor Gajah",
      "Masjid Tanah",
      "Durian Tunggal",
      "Pulau Sebang",
      "A Famosa Resort",
    ],
  },
  {
    district: "Jasin",
    area: "Jasin",
    places: ["Jasin", "Merlimau", "Bemban", "Selandar"],
  },
  {
    district: null,
    area: "Around Melaka, several districts",
    places: ["Tampin", "Muar"],
  },
  {
    district: "Johor Bahru",
    area: "Johor Bahru",
    places: [
      "JB Sentral",
      "Johor Bahru City Square",
      "Larkin Sentral",
      "AEON Tebrau City",
      "Mount Austin",
      "Bandar Dato Onn",
      "Tampoi",
      "Skudai",
      "Pasir Gudang",
      "Kota Masai",
      "Masai Johor",
      "Ulu Tiram",
      "Kempas",
      "Permas Jaya",
      "Taman Universiti Skudai",
    ],
  },
  {
    district: "Johor Bahru",
    area: "Iskandar Puteri",
    places: [
      "Legoland Malaysia",
      "Nusajaya",
      "Gelang Patah",
      "Puteri Harbour",
      "Bukit Indah",
      "Medini",
    ],
  },
  {
    district: "Kulai",
    area: "Kulai",
    places: [
      "Senai International Airport",
      "Kulai",
      "Bandar Putra Kulai",
      "Senai",
    ],
  },
  {
    district: null,
    area: "Around Johor Bahru, several districts",
    places: ["Pekan Nanas", "Pontian", "Kota Tinggi", "Desaru Coast", "Kluang"],
  },
  {
    district: "Cameron Highlands",
    area: "Cameron Highlands",
    places: [
      "Tanah Rata",
      "Brinchang",
      "Copthorne Cameron Highlands",
      "Strawberry Park Resort",
      "BOH Tea Centre Sungai Palas",
      "Kea Farm",
      "Ringlet",
      "Habu Cameron Highlands",
      "Kampung Raja Cameron Highlands",
      "Tringkap",
      "Bertam Valley",
      "Kuala Terla",
      "Cameron Highlands Resort",
    ],
  },
  {
    district: null,
    area: "Around Cameron Highlands, several districts",
    places: ["Ipoh", "Simpang Pulai", "Gua Musang", "Lojing", "Tapah"],
  },
];

const key = process.env.GOOGLE_MAPS_SERVER_KEY;
if (!key) {
  console.error("GOOGLE_MAPS_SERVER_KEY is not set; see the usage note.");
  process.exit(1);
}
const google = googleProvider(key);

const only = new Set(process.argv.slice(2));
const groups = only.size
  ? EXPECTATIONS.filter((e) => e.district !== null && only.has(e.district))
  : EXPECTATIONS;

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
let misses = 0;
let total = 0;

for (const group of groups) {
  console.log(`\n## ${group.area} -> ${group.district ?? "(several)"}`);
  for (const query of group.places) {
    total += 1;
    const [suggestion] = await google.searchPlaces(query, {
      includeAreas: true,
    });
    const place = suggestion && (await google.resolvePlace(suggestion.placeId));
    const district = place ? await resolveDistrict(place) : null;
    const got = district?.name ?? null;
    const ok = group.district === null ? got !== null : got === group.district;
    if (!ok) misses += 1;
    const where = place
      ? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)} | ${place.locality ?? "-"}`
      : "(Google found nothing)";
    console.log(
      `${ok ? "ok  " : "MISS"}  ${pad(query, 34)} ${pad(got ?? "-", 24)} ${district ? (district.isActive ? "on " : "off") : "   "} ${where}`,
    );
  }
}

console.log(
  `\n${total - misses} of ${total} places landed in the expected district, ${misses} misses.`,
);
await db.$disconnect();
process.exit(misses ? 1 : 0);
