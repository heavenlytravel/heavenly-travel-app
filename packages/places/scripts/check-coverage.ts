// Usage: pnpm --filter @repo/places check-coverage [zone-slug ...]
//
// Geocodes real places through Google and reports the zone each resolves
// to, so the district names in `ZoneDistrict` can be checked against how
// Google actually spells Malaysian address components. Each place names the
// zone ops expects; a place outside every zone expects none. Exits 1 when any
// place lands somewhere else, except the known gaps, which are printed and
// counted apart. Needs GOOGLE_MAPS_SERVER_KEY (apps/web/.env.local) and
// DATABASE_URL (packages/db/.env); the package script loads both.
//
// The db modules are imported by path: the package entry carries
// `server-only`, which throws outside React, as the scripts in packages/db do.
import { db } from "../../db/src/client";
import { resolveZone } from "../../db/src/zones";
import { googleProvider } from "../src/google";

type Expectation = {
  /** The zone slug the places should resolve to, or null for outside all. */
  zone: string | null;
  /** Why these places are grouped: the district or town they sit in. */
  area: string;
  places: string[];
  /**
   * Set when these places are known not to resolve and why, so the check
   * still shows them without failing. See docs/260930-ops-screens.md.
   */
  knownGap?: string;
};

/**
 * Well-known places, grouped by the district they sit in. Every district a
 * zone lists gets a few, and the districts next to a zone get some too so a
 * gap shows up as a miss rather than a silence.
 */
const EXPECTATIONS: Expectation[] = [
  // Klang Valley
  {
    zone: "klang-valley",
    area: "Kuala Lumpur",
    places: [
      "Pavilion Kuala Lumpur",
      "KL Sentral",
      "Mont Kiara",
      "Bangsar Village",
      "Cheras Leisure Mall",
      "Setapak Central",
      "Kepong Metro Prima",
      "Bandar Sri Damansara",
      "Bukit Jalil Stadium",
      "Sentul KL",
    ],
  },
  {
    zone: "klang-valley",
    area: "Putrajaya",
    places: ["IOI City Mall Putrajaya", "Putrajaya Sentral"],
  },
  {
    zone: "klang-valley",
    area: "Petaling",
    places: [
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
      "Kota Kemuning",
      "Ara Damansara LRT",
      "Bandar Kinrara",
      "Damansara Utama",
      "Subang Parade",
      "Putra Heights LRT",
      "Subang Airport",
    ],
  },
  {
    zone: "klang-valley",
    area: "Klang",
    places: [
      "AEON Bukit Tinggi Klang",
      "Port Klang",
      "Klang KTM Station",
      "Kapar",
      "Meru Klang",
      "Pulau Ketam Jetty",
    ],
  },
  {
    zone: "klang-valley",
    area: "Gombak",
    places: [
      "Batu Caves",
      "Selayang Mall",
      "Selayang Hospital",
      "Rawang KTM Station",
      "IIUM Gombak",
      "Bandar Tasik Puteri",
      "Bukit Rahman Putra",
    ],
  },
  {
    zone: "klang-valley",
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
    zone: "klang-valley",
    area: "Sepang",
    places: [
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
    zone: "klang-valley",
    area: "Sepang, no locality",
    knownGap:
      "Google returns no locality for the terminal itself or the arrival lane, only the postcode 43900.",
    places: ["KLIA Terminal 2", "klia2"],
  },
  {
    zone: "klang-valley",
    area: "Kuala Lumpur, no locality",
    knownGap: "Google returns no locality, only the postcode 53100.",
    places: ["Gombak LRT Station"],
  },
  // Selangor districts the zone does not list yet: ops decides
  {
    zone: null,
    area: "Kuala Langat (not listed)",
    places: [
      "Banting",
      "Morib Beach",
      "Jenjarom",
      "Telok Panglima Garang",
      "Bandar Saujana Putra",
    ],
  },
  {
    zone: null,
    area: "Hulu Selangor (not listed)",
    places: ["Kuala Kubu Bharu", "Batang Kali", "Serendah"],
  },
  {
    zone: "klang-valley",
    area: "Hulu Selangor, but Google says Rawang",
    places: ["Bukit Beruntung"],
  },
  {
    zone: null,
    area: "Kuala Selangor (not listed)",
    places: ["Kuala Selangor Nature Park", "Sekinchan", "Puncak Alam", "Ijok"],
  },
  {
    zone: null,
    area: "Outside Klang Valley",
    places: [
      "Nilai KTM Station",
      "Seremban",
      "Resorts World Genting",
      "Genting Skyway",
      "Port Dickson",
      "Bentong",
      "Labuan Financial Park",
    ],
  },
  // Langkawi
  {
    zone: "langkawi",
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
    zone: "langkawi",
    area: "Langkawi, no locality",
    knownGap:
      "Beaches carry only the state and the postcode 07000. Hotels on the same beaches resolve.",
    places: ["Pantai Cenang", "Tanjung Rhu Beach"],
  },
  {
    zone: null,
    area: "Outside Langkawi",
    places: [
      "Alor Setar",
      "Kuala Perlis Jetty",
      "Kuala Kedah Jetty",
      "Sungai Petani",
    ],
  },
  // Penang
  {
    zone: "penang",
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
    zone: "penang",
    area: "Barat Daya",
    places: [
      "Penang International Airport",
      "Queensbay Mall",
      "Bayan Baru",
      "Balik Pulau",
      "Teluk Bahang",
      "Teluk Kumbar",
      "Sungai Ara",
      "Batu Maung",
    ],
  },
  {
    zone: "penang",
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
    zone: "penang",
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
    zone: "penang",
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
    zone: null,
    area: "Outside Penang",
    places: ["Kulim", "Parit Buntar", "Bandar Baharu Kedah"],
  },
  // Melaka
  {
    zone: "melaka",
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
    zone: "melaka",
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
    zone: "melaka",
    area: "Jasin",
    places: ["Jasin", "Merlimau", "Bemban", "Selandar"],
  },
  { zone: null, area: "Outside Melaka", places: ["Tampin", "Muar"] },
  // Johor Bahru
  {
    zone: "johor-bahru",
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
    zone: "johor-bahru",
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
    zone: "johor-bahru",
    area: "Kulai",
    places: [
      "Senai International Airport",
      "Kulai",
      "Bandar Putra Kulai",
      "Senai",
    ],
  },
  {
    zone: null,
    area: "Outside Johor Bahru",
    places: ["Pekan Nanas", "Pontian", "Kota Tinggi", "Desaru Coast", "Kluang"],
  },
  // Cameron Highlands
  {
    zone: "cameron-highlands",
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
    zone: null,
    area: "Outside Cameron Highlands",
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
  ? EXPECTATIONS.filter((e) => e.zone !== null && only.has(e.zone))
  : EXPECTATIONS;

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
let misses = 0;
let gaps = 0;
let total = 0;

for (const group of groups) {
  console.log(`\n## ${group.area} -> ${group.zone ?? "(outside)"}`);
  if (group.knownGap) console.log(`   Known gap: ${group.knownGap}`);
  for (const query of group.places) {
    total += 1;
    const [suggestion] = await google.searchPlaces(query);
    const place = suggestion && (await google.resolvePlace(suggestion.placeId));
    const match = place ? await resolveZone(place) : null;
    const got = match?.zone.slug ?? null;
    const ok = got === group.zone;
    let mark = "ok  ";
    if (!ok && group.knownGap) {
      gaps += 1;
      mark = "GAP ";
    } else if (!ok) {
      misses += 1;
      mark = "MISS";
    }
    const components = place
      ? [place.state, place.district, place.locality]
          .map((c) => c ?? "-")
          .join(" | ")
      : "(Google found nothing)";
    console.log(
      `${mark}  ${pad(query, 34)} ${pad(got ?? "-", 18)} ${components}`,
    );
  }
}

console.log(
  `\n${total - misses - gaps} of ${total} places resolved as expected, ${gaps} known gaps, ${misses} misses.`,
);
await db.$disconnect();
process.exit(misses ? 1 : 0);
