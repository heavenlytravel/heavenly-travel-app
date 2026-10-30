/**
 * What the console's search finds in the database, as `SEARCH_PATH`
 * answers it: the records of each kind the admin may open, a group each,
 * in this order. The pages, the actions and the locations are found in the
 * browser, from what the console already holds. See
 * docs/261029-manage-signature-overhaul.md.
 */

/** The kinds of record the search asks the database for, in the order the palette lists them. */
export const RECORD_KINDS = [
  "bookings",
  "vehicles",
  "drivers",
  "users",
  "vehicle-classes",
  "zones",
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

/** Each kind's heading in the palette. */
export const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  bookings: "Bookings",
  vehicles: "Vehicles",
  drivers: "Drivers",
  users: "Customers",
  "vehicle-classes": "Classes",
  zones: "Zones",
};

/** How many of each kind the search lists; the rest are on the kind's own list. */
export const SEARCH_LIMIT = 5;

/** One record found: its line, and its page. */
export type SearchHit = {
  href: string;
  title: string;
  /** The line under the title: a booking's customer and pick-up, a vehicle's model. */
  detail?: string;
  /** At the line's end: the record's location. */
  meta?: string;
  /** A booking's status, as `BookingStatusBadge` shows it. */
  status?: string;
};

/** What `SEARCH_PATH` answers: the kinds with something found, in order. */
export type SearchResponse = {
  groups: { kind: RecordKind; hits: SearchHit[] }[];
};
