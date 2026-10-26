/**
 * The state of Malaysia a place suggestion names, read off its second line,
 * which Google ends with the state: "Jalan Burma, George Town, Penang". A
 * search kept to the box around a location's states still suggests the
 * corner of a neighbouring one, Penang in the box around Kedah, and Google
 * keeps a search to a box at best; the saved addresses' search leaves out
 * a suggestion that names another state. A state is named as the boundary
 * data names it (@repo/db's districts), so a location's states compare as
 * they are. The place picked is still checked by its coordinates.
 */

/** Each state's names as Google may write them, lower-cased, to the boundary data's name. */
const STATE_NAMES: Record<string, string> = {
  johor: "Johor",
  johore: "Johor",
  kedah: "Kedah",
  kelantan: "Kelantan",
  "kuala lumpur": "Kuala Lumpur",
  "federal territory of kuala lumpur": "Kuala Lumpur",
  "wilayah persekutuan kuala lumpur": "Kuala Lumpur",
  labuan: "Labuan",
  "labuan federal territory": "Labuan",
  "federal territory of labuan": "Labuan",
  "wilayah persekutuan labuan": "Labuan",
  melaka: "Melaka",
  malacca: "Melaka",
  "negeri sembilan": "Negeri Sembilan",
  pahang: "Pahang",
  penang: "Penang",
  "pulau pinang": "Penang",
  perak: "Perak",
  perlis: "Perlis",
  putrajaya: "Putrajaya",
  "federal territory of putrajaya": "Putrajaya",
  "wilayah persekutuan putrajaya": "Putrajaya",
  sabah: "Sabah",
  sarawak: "Sarawak",
  selangor: "Selangor",
  terengganu: "Terengganu",
};

/** The longest first, so "federal territory of labuan" is read before "labuan". */
const NAMES = Object.keys(STATE_NAMES).sort((a, b) => b.length - a.length);

/**
 * The state the second line of a suggestion ends with, "Penang" for
 * "George Town, Penang" or "11900 Pulau Pinang, Malaysia"; null when its
 * last part names none, as "Langkawi" alone.
 */
export function suggestionStateOf(detail: string): string | null {
  const parts = detail
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (parts.at(-1) === "malaysia") parts.pop();
  const last = parts.at(-1);
  if (!last) return null;
  const name = NAMES.find((one) => last === one || last.endsWith(` ${one}`));
  return name ? (STATE_NAMES[name] ?? null) : null;
}
