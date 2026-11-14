import {
  HOURLY_PACKAGES,
  DURATION_CHOICES,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  TRIP_MODES,
  type TripCategory,
} from "@repo/db";

/**
 * The products the home page search card can ask about, and the fields each
 * one needs. A hotel has no pick-up point and a car has no check-out, so the
 * card renders its fields from this list instead of hard-coding a trip form.
 * The two transportation tabs are keyed by their category, spelled as it is
 * everywhere else and ask the same fields. They can be booked; the other tabs
 * are shown but disabled until their flows exist (docs/260928-coach-charter.md).
 */

export type ProductKey =
  TripCategory | "rental" | "attraction" | "hotel" | "package";

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
  | "duration"
  | "elsewhere"
  | "people"
  | "children"
  | "rooms";

export type FieldKind = "place" | "choice" | "date" | "when" | "count";

export type FieldDef = {
  key: FieldKey;
  kind: FieldKind;
  /** A day and a time in one field: `key` holds the day, this the time. */
  timeKey?: FieldKey;
  label: string;
  placeholder?: string;
  /** Lowest count allowed; counts default to 1. */
  min?: number;
  /** The values a choice offers. */
  options?: { value: string; label: string }[];
  /** A field another field's value makes irrelevant: the duration on a one-way trip. */
  hidden?: (values: SearchValues) => boolean;
  /**
   * A tick box under the field, in its box, that sets `key` to "1" or "":
   * the pick-up's "Drop off elsewhere" on a hire. Shown while
   * `shown` says so.
   */
  tick?: {
    key: FieldKey;
    label: string;
    shown: (values: SearchValues) => boolean;
  };
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

/** Whether a hire ends away from its pickup: ticked under the pick-up, it asks the drop-off. */
const endsElsewhere = (v: SearchValues) =>
  v.mode === "hourly" && v.elsewhere === "1";

/**
 * What a trip asks, on the search card and in the vehicle page's trip
 * planner alike: its kind first, as two radios. A hire asks its package,
 * 4, 8 or 12 hours, and a drop-off only when it is ticked to end
 * elsewhere. The group's size is asked once for all the trips, beside the
 * send button and with the vehicle page's trips.
 */
const TRIP_FIELDS: FieldDef[] = [
  {
    key: "mode",
    kind: "choice",
    label: "Trip",
    options: TRIP_MODES.map((mode) => ({
      value: mode,
      label: TRIP_MODE_LABELS[mode],
    })),
  },
  {
    ...pickUp,
    tick: {
      key: "elsewhere",
      label: "Drop off elsewhere",
      shown: (v) => v.mode === "hourly",
    },
  },
  { ...dropOff, hidden: (v) => v.mode === "hourly" && !endsElsewhere(v) },
  {
    key: "duration",
    kind: "choice",
    label: "Duration",
    options: DURATION_CHOICES,
    hidden: (v) => v.mode !== "hourly",
  },
  { key: "date", timeKey: "time", kind: "when", label: "When" },
];

/**
 * The id of the element that holds the search card; filling a field from
 * elsewhere on the page scrolls to it. Kept out of the card's client
 * module: a server component importing a value from there gets a client
 * reference, not the string.
 */
export const SEARCH_CARD_ID = "booking";

export const PRODUCTS: Record<ProductKey, Product> = {
  "car-with-driver": {
    key: "car-with-driver",
    label: TRIP_CATEGORY_LABELS["car-with-driver"],
    note: "Sedan, MPV or van",
    cta: "Search",
    bookable: true,
    fields: TRIP_FIELDS,
  },
  "coach-charter": {
    key: "coach-charter",
    label: TRIP_CATEGORY_LABELS["coach-charter"],
    note: "Minibus or coach for groups",
    cta: "Search",
    bookable: true,
    fields: TRIP_FIELDS,
  },
  attraction: {
    key: "attraction",
    label: "Attractions",
    note: "Tickets and tours, skip the queue",
    cta: "Find Tickets",
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or Attraction",
        placeholder: "Langkawi cable car",
      },
      { key: "date", kind: "date", label: "Visit Date" },
      { key: "people", kind: "count", label: "Adults" },
      { key: "children", kind: "count", label: "Children", min: 0 },
    ],
  },
  hotel: {
    key: "hotel",
    label: "Hotels",
    note: "Stays picked by people who live here",
    cta: "Find Hotels",
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination or Hotel",
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
    label: "Car Rental",
    note: "Drive yourself, by the day or the week",
    cta: "Search Cars",
    bookable: false,
    fields: [
      {
        key: "from",
        kind: "place",
        label: "Pick-up Location",
        placeholder: "City, airport or address",
      },
      { key: "date", timeKey: "time", kind: "when", label: "Pick-up" },
      { key: "endDate", timeKey: "endTime", kind: "when", label: "Return" },
    ],
  },
  package: {
    key: "package",
    label: "Custom Packages",
    note: "Transport, stays and experiences in one plan",
    cta: "Plan My Package",
    bookable: false,
    fields: [
      {
        key: "place",
        kind: "place",
        label: "Destination",
        placeholder: "Where would you like to go?",
      },
      { key: "date", kind: "date", label: "Travel Date" },
      { key: "days", kind: "count", label: "Number of Days" },
      { key: "people", kind: "count", label: "Travellers" },
    ],
  },
};

/** The fields a product shows for the values typed so far. */
export function visibleFields(product: Product, values: SearchValues) {
  return product.fields.filter((f) => !f.hidden?.(values));
}

/** The values a field holds: one, or a day and a time. */
export function fieldKeys(def: FieldDef): FieldKey[] {
  return def.timeKey ? [def.key, def.timeKey] : [def.key];
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

/**
 * The values with one field changed. A place picked from the autocomplete
 * list comes with its id; typing into the field afterwards drops the id
 * again. An end date never comes before the start date.
 */
export function withValue(
  values: SearchValues,
  key: FieldKey,
  value: string,
  placeId?: string,
): SearchValues {
  const next = { ...values, [key]: value };
  if (isPlaceKey(key)) next.placeIds = { ...values.placeIds, [key]: placeId };
  if (next.date && next.endDate && next.endDate < next.date) next.endDate = "";
  return next;
}

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
  duration: String(HOURLY_PACKAGES[0]),
  elsewhere: "",
  people: "2",
  children: "0",
  rooms: "1",
  placeIds: {},
};
