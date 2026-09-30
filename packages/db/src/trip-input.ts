import { BOOKING_RULES } from "./booking-rules";
import {
  isTripMode,
  offersChildSeats,
  type TripCategory,
  type TripMode,
} from "./booking-status";

/**
 * A trip as it travels between screens before it is a booking: the search
 * (mode, places, date, time, hours) and the options chosen after pricing
 * (class, passengers, child seats, flight, notes). The website carries it
 * in the URL from the search card to the confirm page; the console's manual
 * booking form posts the same names. One parser reads both, so a booking
 * can never be built from a trip the options list did not show.
 * Browser-safe: no database. See docs/260930-admin-teams-and-access.md,
 * "Step 9: Manual booking".
 */

export const TRIP_MAX_CHILD_SEATS = 4;
export const TRIP_MAX_FLIGHT_NUMBER_LENGTH = 12;
export const TRIP_MAX_NOTES_LENGTH = 500;

/**
 * Refuses nonsense in a head count. Not a seat number: whether a group fits
 * is decided by the vehicle class.
 */
const MAX_HEAD_COUNT = 999;

/** What the search asks. Place ids only; the server resolves them. */
export type TripSearch = {
  mode: TripMode;
  pickupId: string;
  /** One-way only. */
  dropoffId: string | null;
  /** "2026-10-03" */
  date: string;
  /** "09:30" */
  time: string;
  /** Hourly only. */
  hours: number | null;
};

/** What is chosen once the trip is priced. */
export type TripOptions = {
  vehicleClassId: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
};

/** The parameter and input names, the same in a URL and in a form. */
export const TRIP_PARAM = {
  mode: "mode",
  pickup: "pickup",
  dropoff: "dropoff",
  date: "date",
  time: "time",
  hours: "hours",
  passengers: "passengers",
  vehicleClass: "class",
  childSeats: "childSeats",
  flightNumber: "flight",
  notes: "notes",
} as const;

/** The input names an options form posts, so they match what is parsed. */
export const TRIP_OPTION_FIELDS = {
  vehicleClass: TRIP_PARAM.vehicleClass,
  passengers: TRIP_PARAM.passengers,
  childSeats: TRIP_PARAM.childSeats,
  flightNumber: TRIP_PARAM.flightNumber,
  notes: TRIP_PARAM.notes,
} as const;

export const isHeadCount = (n: number) =>
  Number.isInteger(n) && n >= 1 && n <= MAX_HEAD_COUNT;

/** A query string, Next's `searchParams`, or a posted form, as one shape. */
export type QueryInput =
  | URLSearchParams
  | FormData
  | string
  | Record<string, string | string[] | undefined>;

/** The first value of each key; files and repeats are dropped. */
export function toParams(input: QueryInput): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input);
  const params = new URLSearchParams();
  if (input instanceof FormData) {
    for (const [key, value] of input.entries()) {
      if (typeof value === "string" && !params.has(key)) {
        params.set(key, value);
      }
    }
    return params;
  }
  for (const [key, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const ID_RE = /^[\w:/ .-]{1,200}$/;

const intIn = (raw: string | null, min: number, max: number) => {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
};

/**
 * The search in a query or a form, or null when it is not a full search.
 * Hours run from the hourly floor to the maximum; the class's own minimum
 * is an availability state once the trip is priced.
 */
export function parseTripSearch(input: QueryInput): TripSearch | null {
  const params = toParams(input);
  const mode = params.get(TRIP_PARAM.mode);
  const pickupId = params.get(TRIP_PARAM.pickup);
  const dropoffId = params.get(TRIP_PARAM.dropoff);
  const date = params.get(TRIP_PARAM.date);
  const time = params.get(TRIP_PARAM.time);
  const hours = intIn(
    params.get(TRIP_PARAM.hours),
    BOOKING_RULES.hourlyFloorHours,
    BOOKING_RULES.maxHourlyHours,
  );

  if (!isTripMode(mode) || !pickupId || !ID_RE.test(pickupId)) return null;
  if (!date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) return null;
  if (mode === "oneway" && (!dropoffId || !ID_RE.test(dropoffId))) return null;
  if (mode === "hourly" && hours === null) return null;

  return {
    mode,
    pickupId,
    dropoffId: mode === "oneway" ? dropoffId : null,
    date,
    time,
    hours: mode === "hourly" ? hours : null,
  };
}

/** The passenger count in a query, or null when there is none to start from. */
export function parsePassengers(input: QueryInput): number | null {
  return intIn(toParams(input).get(TRIP_PARAM.passengers), 1, MAX_HEAD_COUNT);
}

const text = (raw: string | null, max: number) => {
  const value = (raw ?? "").trim().slice(0, max);
  return value === "" ? null : value;
};

/**
 * The choices made once the trip is priced, or null when a required one is
 * missing. Child seats for a category that does not offer them are dropped.
 */
export function parseTripOptions(
  category: TripCategory,
  input: QueryInput,
): TripOptions | null {
  const params = toParams(input);
  const vehicleClassId = params.get(TRIP_PARAM.vehicleClass);
  const passengers = parsePassengers(params);
  const childSeats = offersChildSeats(category)
    ? intIn(params.get(TRIP_PARAM.childSeats), 0, TRIP_MAX_CHILD_SEATS)
    : null;
  if (!vehicleClassId || !ID_RE.test(vehicleClassId)) return null;
  if (passengers === null) return null;
  return {
    vehicleClassId,
    passengers,
    childSeats: childSeats ?? 0,
    flightNumber:
      text(
        params.get(TRIP_PARAM.flightNumber),
        TRIP_MAX_FLIGHT_NUMBER_LENGTH,
      )?.toUpperCase() ?? null,
    notes: text(params.get(TRIP_PARAM.notes), TRIP_MAX_NOTES_LENGTH),
  };
}

/** The search alone as parameters, for links back to the options page. */
export function tripSearchParams(search: TripSearch) {
  const params = new URLSearchParams({
    [TRIP_PARAM.mode]: search.mode,
    [TRIP_PARAM.pickup]: search.pickupId,
    [TRIP_PARAM.date]: search.date,
    [TRIP_PARAM.time]: search.time,
  });
  if (search.dropoffId) params.set(TRIP_PARAM.dropoff, search.dropoffId);
  if (search.hours !== null) params.set(TRIP_PARAM.hours, String(search.hours));
  return params;
}

/** The search as name and value pairs, for the hidden inputs of a form. */
export function hiddenSearchFields(search: TripSearch) {
  return Array.from(tripSearchParams(search).entries());
}
