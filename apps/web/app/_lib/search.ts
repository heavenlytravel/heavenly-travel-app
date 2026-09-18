import { DESTINATIONS, WHATSAPP_HREF } from "./content";
import { MAIN_SERVICE_NOTES, SERVICE_LABELS } from "./trip";

/**
 * The four products a search box can ask about, and the fields each one needs.
 * A hotel has no pick-up point and a car has no check-out, so every search box
 * renders its fields from this list instead of hard-coding a trip form. The
 * boxes differ in layout and interaction, never in what they ask.
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
  /** Places offered as one-tap answers. */
  suggestions?: string[];
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

const PLACES = DESTINATIONS.map((d) => d.name);
const PICKUPS = [
  "KLIA Terminal 1",
  "Langkawi Airport",
  "Penang Airport",
  "Kuala Lumpur city",
];

const pickUp: FieldDef = {
  key: "from",
  kind: "place",
  label: "Pick-up",
  placeholder: "Airport, hotel or address",
  suggestions: PICKUPS,
};
const dropOff: FieldDef = {
  key: "to",
  kind: "place",
  label: "Drop-off",
  placeholder: "Where are you going?",
  suggestions: PLACES,
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
        suggestions: PICKUPS,
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
        suggestions: PLACES,
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
    label: SERVICE_LABELS.car,
    note: MAIN_SERVICE_NOTES.car,
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
    label: SERVICE_LABELS.coach,
    note: MAIN_SERVICE_NOTES.coach,
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
        suggestions: [
          "Langkawi cable car",
          "Mangrove cruise",
          "Island hopping",
          ...PLACES.slice(1, 3),
        ],
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
        suggestions: PLACES,
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

/** The four products most search boxes offer, in the order they show them. */
export const PRODUCT_LIST: Product[] = [
  PRODUCTS.car,
  PRODUCTS.coach,
  PRODUCTS.attraction,
  PRODUCTS.hotel,
];

export type SearchValues = Record<FieldKey, string>;

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
};

/** Today plus a number of days, as the value a date input takes. */
export function isoDateFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A date a number of days after another, both as date input values. */
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Days until the coming Saturday; 7 when today is Saturday. */
export function daysToSaturday() {
  return (6 - new Date().getDay() + 7) % 7 || 7;
}

/** "2026-10-12" as "12 Oct", without a Date so the time zone cannot shift it. */
export function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const month = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[
    (m ?? 1) - 1
  ];
  return d && month ? `${d} ${month}` : iso;
}

export function nightsBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** A field's value as people read it: "12 Oct", "2 guests", "Langkawi". */
export function readable(def: FieldDef, value: string) {
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

/**
 * The request so far as short phrases, in the order people say them: where,
 * when, who. Empty until something is filled in.
 */
export function summarise(product: Product, values: SearchValues) {
  const has = (key: FieldKey) => product.fields.some((f) => f.key === key);
  const text = (key: FieldKey) => {
    const def = product.fields.find((f) => f.key === key);
    return def ? readable(def, values[key]) : "";
  };

  const where = has("place")
    ? text("place")
    : [text("from"), text("to")].filter(Boolean).join(" to ");
  const nights = has("endDate")
    ? nightsBetween(values.date, values.endDate)
    : 0;
  const when = [text("date"), text("endDate")].filter(Boolean).join(" to ");
  const stay =
    product.key === "hotel" && nights > 0
      ? `${nights} ${nights === 1 ? "night" : "nights"}`
      : "";
  const typed = Boolean(where || when || text("time"));
  // Counts have defaults, so they only count as an answer beside a typed one.
  const who = typed
    ? product.fields
        .filter((f) => f.kind === "count")
        .map((f) => readable(f, values[f.key]))
        .filter(Boolean)
        .join(", ")
    : "";

  return [where, when, stay, text("time"), who].filter(Boolean);
}

/** A field in a combined request; `owner` is the product that brought it in. */
export type BundleField = FieldDef & { owner?: ProductKey };

/**
 * The fields for several products in one request. Where, when and who are
 * asked once; each product then adds only what it alone needs.
 */
export function bundleFields(keys: ProductKey[]): BundleField[] {
  const transport = keys.find((k) => k === "car" || k === "coach");
  const hotel = keys.includes("hotel");
  const fields: (BundleField | false | undefined)[] = [
    {
      key: "place",
      kind: "place",
      label: "Destination",
      placeholder: "Langkawi",
      suggestions: PLACES,
    },
    transport && { ...pickUp, label: "Pick-up point", owner: transport },
    { key: "date", kind: "date", label: hotel ? "Check-in" : "Date" },
    hotel && {
      key: "endDate",
      kind: "date",
      label: "Check-out",
      owner: "hotel",
    },
    transport && {
      key: "time",
      kind: "time",
      label: "Pick-up time",
      owner: transport,
    },
    {
      key: "people",
      kind: "count",
      label: keys.includes("attraction") ? "Adults" : "Travellers",
      unit: ["person", "people"],
    },
    keys.includes("attraction") && {
      key: "children",
      kind: "count",
      label: "Children",
      min: 0,
      unit: ["child", "children"],
      owner: "attraction",
    },
    hotel && {
      key: "rooms",
      kind: "count",
      label: "Rooms",
      unit: ["room", "rooms"],
      owner: "hotel",
    },
  ];
  return fields.filter((f): f is BundleField => Boolean(f));
}
