import { CAR_MODES, CAR_MODE_LABELS, HOURLY_OPTIONS } from "@repo/db";

/**
 * The products the home page search card can ask about, and the fields each
 * one needs. A hotel has no pick-up point and a car has no check-out, so the
 * card renders its fields from this list instead of hard-coding a trip form.
 * Only car with driver can be booked so far; the other tabs are shown but
 * disabled until their flows exist (docs/car-with-driver.md).
 */

export type ProductKey =
  "rental" | "car" | "coach" | "attraction" | "hotel" | "package";

export type FieldKey =
  | "from"
  | "to"
  | "place"
  | "mode"
  | "date"
  | "endDate"
  | "time"
  | "endTime"
  | "days"
  | "hours"
  | "people"
  | "children"
  | "rooms";

export type FieldKind = "place" | "choice" | "date" | "time" | "count";

export type FieldDef = {
  key: FieldKey;
  kind: FieldKind;
  label: string;
  placeholder?: string;
  /** Lowest count allowed; counts default to 1. */
  min?: number;
  /** The values a choice offers. */
  options?: { value: string; label: string }[];
  /** A field another field's value makes irrelevant: hours on a one-way trip. */
  hidden?: (values: SearchValues) => boolean;
};

export type Product = {
  key: ProductKey;
  label: string;
  note: string;
  /** Label of the send button. */
  cta: string;
  /** Whether the card can send this search anywhere yet. */
  bookable: boolean;
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
  car: {
    key: "car",
    label: "Car with driver",
    note: "Sedan, MPV or van, up to 10 seats",
    cta: "Get my price",
    bookable: true,
    fields: [
      {
        key: "mode",
        kind: "choice",
        label: "Trip",
        options: CAR_MODES.map((mode) => ({
          value: mode,
          label: CAR_MODE_LABELS[mode],
        })),
      },
      pickUp,
      { ...dropOff, hidden: (v) => v.mode === "hourly" },
      {
        key: "hours",
        kind: "choice",
        label: "Hours",
        options: HOURLY_OPTIONS.map((h) => ({
          value: String(h),
          label: `${h} hours`,
        })),
        hidden: (v) => v.mode !== "hourly",
      },
      { key: "date", kind: "date", label: "Date" },
      { key: "time", kind: "time", label: "Pick-up time" },
      { key: "people", kind: "count", label: "Passengers" },
    ],
  },
  coach: {
    key: "coach",
    label: "Coach charter",
    note: "Minibus or coach, 26 to 44 seats",
    cta: "Get my price",
    bookable: false,
    fields: [
      pickUp,
      dropOff,
      { key: "date", kind: "date", label: "Departure" },
      { key: "endDate", kind: "date", label: "Return" },
      { key: "people", kind: "count", label: "Group size" },
    ],
  },
  attraction: {
    key: "attraction",
    label: "Attractions",
    note: "Tickets and tours, skip the queue",
    cta: "Find tickets",
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or attraction",
        placeholder: "Langkawi cable car",
      },
      { key: "date", kind: "date", label: "Visit date" },
      { key: "people", kind: "count", label: "Adults" },
      { key: "children", kind: "count", label: "Children", min: 0 },
    ],
  },
  hotel: {
    key: "hotel",
    label: "Hotels",
    note: "Stays picked by people who live here",
    cta: "Find hotels",
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or hotel",
        placeholder: "Langkawi",
      },
      { key: "date", kind: "date", label: "Check-in" },
      { key: "endDate", kind: "date", label: "Check-out" },
      { key: "people", kind: "count", label: "Guests" },
      { key: "rooms", kind: "count", label: "Rooms" },
    ],
  },
  rental: {
    key: "rental",
    label: "Car rental",
    note: "Drive yourself, by the day or the week",
    cta: "Search cars",
    bookable: false,
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
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination",
        placeholder: "Where would you like to go?",
      },
      { key: "date", kind: "date", label: "Travel date" },
      { key: "days", kind: "count", label: "Number of days" },
      { key: "people", kind: "count", label: "Travellers" },
    ],
  },
};

/** The fields a product shows for the values typed so far. */
export function visibleFields(product: Product, values: SearchValues) {
  return product.fields.filter((f) => !f.hidden?.(values));
}

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
  mode: "oneway",
  date: "",
  endDate: "",
  time: "",
  endTime: "",
  days: "3",
  hours: String(HOURLY_OPTIONS[0]),
  people: "2",
  children: "0",
  rooms: "1",
  placeIds: {},
};
