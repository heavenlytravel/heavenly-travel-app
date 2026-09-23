import { WHATSAPP_HREF } from "./content";

/**
 * The products the home page search card can ask about, and the fields each
 * one needs. A hotel has no pick-up point and a car has no check-out, so the
 * card renders its fields from this list instead of hard-coding a trip form.
 */

export type ProductKey =
  "rental" | "car" | "coach" | "attraction" | "hotel" | "package";

export type FieldKey =
  | "from"
  | "to"
  | "place"
  | "date"
  | "endDate"
  | "time"
  | "endTime"
  | "days"
  | "people"
  | "children"
  | "rooms";

export type FieldKind = "place" | "date" | "time" | "count";

export type FieldDef = {
  key: FieldKey;
  kind: FieldKind;
  label: string;
  placeholder?: string;
  /** Lowest count allowed; counts default to 1. */
  min?: number;
  /** Noun for the count in summaries: "2 guests". */
  unit?: [singular: string, plural: string];
};

export type Product = {
  key: ProductKey;
  label: string;
  note: string;
  /** Label of the send button. */
  cta: string;
  fields: FieldDef[];
};

const pickUp: FieldDef = {
  key: "from",
  kind: "place",
  label: "Pick-up",
  placeholder: "Airport, hotel or address",
};
const dropOff: FieldDef = {
  key: "to",
  kind: "place",
  label: "Drop-off",
  placeholder: "Where are you going?",
};

export const PRODUCTS: Record<ProductKey, Product> = {
  rental: {
    key: "rental",
    label: "Car rental",
    note: "Drive yourself, by the day or the week",
    cta: "Search cars",
    fields: [
      {
        key: "from",
        kind: "place",
        label: "Pick-up location",
        placeholder: "City, airport or address",
      },
      { key: "date", kind: "date", label: "Pick-up date" },
      { key: "time", kind: "time", label: "Pick-up time" },
      { key: "endDate", kind: "date", label: "Return date" },
      { key: "endTime", kind: "time", label: "Return time" },
    ],
  },
  package: {
    key: "package",
    label: "Custom packages",
    note: "Transport, stays and experiences in one plan",
    cta: "Plan my package",
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination",
        placeholder: "Where would you like to go?",
      },
      { key: "date", kind: "date", label: "Travel date" },
      {
        key: "days",
        kind: "count",
        label: "Number of days",
        unit: ["day", "days"],
      },
      {
        key: "people",
        kind: "count",
        label: "Travellers",
        unit: ["traveller", "travellers"],
      },
    ],
  },
  car: {
    key: "car",
    label: "Car with driver",
    note: "Sedan, MPV or van, up to 10 seats",
    cta: "Get my price",
    fields: [
      pickUp,
      dropOff,
      { key: "date", kind: "date", label: "Date" },
      { key: "time", kind: "time", label: "Pick-up time" },
      {
        key: "people",
        kind: "count",
        label: "Passengers",
        unit: ["passenger", "passengers"],
      },
    ],
  },
  coach: {
    key: "coach",
    label: "Coach charter",
    note: "Minibus or coach, 26 to 44 seats",
    cta: "Get my price",
    fields: [
      pickUp,
      dropOff,
      { key: "date", kind: "date", label: "Departure" },
      { key: "endDate", kind: "date", label: "Return" },
      {
        key: "people",
        kind: "count",
        label: "Group size",
        unit: ["person", "people"],
      },
    ],
  },
  attraction: {
    key: "attraction",
    label: "Attractions",
    note: "Tickets and tours, skip the queue",
    cta: "Find tickets",
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or attraction",
        placeholder: "Langkawi cable car",
      },
      { key: "date", kind: "date", label: "Visit date" },
      {
        key: "people",
        kind: "count",
        label: "Adults",
        unit: ["adult", "adults"],
      },
      {
        key: "children",
        kind: "count",
        label: "Children",
        min: 0,
        unit: ["child", "children"],
      },
    ],
  },
  hotel: {
    key: "hotel",
    label: "Hotels",
    note: "Stays picked by people who live here",
    cta: "Find hotels",
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or hotel",
        placeholder: "Langkawi",
      },
      { key: "date", kind: "date", label: "Check-in" },
      { key: "endDate", kind: "date", label: "Check-out" },
      {
        key: "people",
        kind: "count",
        label: "Guests",
        unit: ["guest", "guests"],
      },
      { key: "rooms", kind: "count", label: "Rooms", unit: ["room", "rooms"] },
    ],
  },
};

/** The fields that name a place and can carry a resolved place id. */
export type PlaceFieldKey = "from" | "to" | "place";

export const isPlaceKey = (key: FieldKey): key is PlaceFieldKey =>
  key === "from" || key === "to" || key === "place";

/**
 * What the person typed for every field, plus the place id behind each place
 * field once it was picked from the autocomplete list. A place field with text
 * but no id was typed freehand, or edited after picking, and is not resolved.
 */
export type SearchValues = Record<FieldKey, string> & {
  placeIds: Partial<Record<PlaceFieldKey, string>>;
};

export const EMPTY_SEARCH: SearchValues = {
  from: "",
  to: "",
  place: "",
  date: "",
  endDate: "",
  time: "",
  endTime: "",
  days: "3",
  people: "2",
  children: "0",
  rooms: "1",
  placeIds: {},
};

/** "2026-10-12" as "12 Oct", without a Date so the time zone cannot shift it. */
function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const month = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[
    (m ?? 1) - 1
  ];
  return d && month ? `${d} ${month}` : iso;
}

/** A field's value as people read it: "12 Oct", "2 guests", "Langkawi". */
function readable(def: FieldDef, value: string) {
  if (!value) return "";
  if (def.kind === "date") return shortDate(value);
  if (def.kind === "count" && def.unit) {
    const n = Number(value);
    if (n === 0) return "";
    return `${n} ${n === 1 ? def.unit[0] : def.unit[1]}`;
  }
  return value;
}

/** The request as a WhatsApp link, listing only the fields that were asked. */
export function searchHref(
  products: Product[],
  fields: FieldDef[],
  values: SearchValues,
  /** Extra lines a box adds for answers that are not fields, like a checkbox. */
  notes: string[] = [],
) {
  const names = products.map((p) => p.label.toLowerCase()).join(" + ");
  const lines = [
    `Hi Heavenly Travel, I'd like a quote for: ${names}.`,
    ...fields.flatMap((f) => {
      const text = readable(f, values[f.key]);
      return text ? [`${f.label}: ${text}`] : [];
    }),
    ...notes,
  ];
  return `${WHATSAPP_HREF}?text=${encodeURIComponent(lines.join("\n"))}`;
}
