import {
  BOOKING_RULES,
  checkHours,
  isTripCategory,
  isTripMode,
  offersChildSeats,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import { PRODUCTS, type SearchValues } from "./search";

/**
 * The transportation booking flow keeps the whole trip in the URL: the
 * search card links to the options page with the search, the options page
 * links to the confirm page with the search plus the choices, and the confirm
 * page carries the same query through the sign-in redirect. Nothing is lost
 * on the way and every step can be shared or reopened. The category is a
 * path segment, the trip is the query. This module is the one place that
 * knows the paths and the parameter names. Browser-safe.
 */

export const TRIP_BOOKING_ROOT = "/booking/transportation";

/**
 * The category behind a path segment, or null unless it is a known category
 * whose search card tab is open. A category opens everywhere at once: the
 * tab and the pages read the same flag.
 */
export function bookableCategory(segment: unknown): TripCategory | null {
  return isTripCategory(segment) && PRODUCTS[segment].bookable ? segment : null;
}

export function tripBookingPath(category: TripCategory) {
  return `${TRIP_BOOKING_ROOT}/${category}`;
}

export function tripConfirmPath(category: TripCategory) {
  return `${tripBookingPath(category)}/confirm`;
}

export const TRIP_MAX_CHILD_SEATS = 4;
export const TRIP_MAX_FLIGHT_NUMBER_LENGTH = 12;
export const TRIP_MAX_NOTES_LENGTH = 500;

/**
 * Refuses nonsense in the URL. Not a seat number: whether a group fits is
 * decided by the vehicle class.
 */
const MAX_HEAD_COUNT = 999;

/** What the search card asks. Place ids only; the server resolves them. */
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

/** What the options page adds. */
export type TripOptions = {
  vehicleClassId: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
};

const PARAM = {
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

/** The input names the options form posts, so they match what is parsed. */
export const TRIP_OPTION_FIELDS = {
  vehicleClass: PARAM.vehicleClass,
  passengers: PARAM.passengers,
  childSeats: PARAM.childSeats,
  flightNumber: PARAM.flightNumber,
  notes: PARAM.notes,
} as const;

/** One message per field the search card cannot send yet. */
export type TripSearchIssue = {
  field: keyof SearchValues;
  message: string;
};

type TripSearchFromCard =
  | { ok: true; params: URLSearchParams }
  | { ok: false; issues: TripSearchIssue[] };

/**
 * The values of the search card, or of the trip editor, as the options page
 * query, or why they cannot be sent. A place field with text but no id was
 * typed freehand; the form asks for a pick from the list rather than
 * guessing which place was meant.
 */
export function tripSearchFromCard(values: SearchValues): TripSearchFromCard {
  const issues: TripSearchIssue[] = [];
  const mode = isTripMode(values.mode) ? values.mode : "oneway";

  if (!values.placeIds.from) {
    issues.push({
      field: "from",
      message: values.from
        ? "Choose the pick-up from the list."
        : "Enter a pick-up place.",
    });
  }
  if (mode === "oneway" && !values.placeIds.to) {
    issues.push({
      field: "to",
      message: values.to
        ? "Choose the drop-off from the list."
        : "Enter a drop-off place.",
    });
  }
  if (!values.date) issues.push({ field: "date", message: "Choose a date." });
  if (!values.time) {
    issues.push({ field: "time", message: "Choose a pick-up time." });
  }
  const hours = Number(values.hours);
  if (mode === "hourly" && !checkHours(hours).ok) {
    issues.push({ field: "hours", message: "Choose how many hours." });
  }
  if (issues.length > 0) return { ok: false, issues };

  const params = new URLSearchParams({
    [PARAM.mode]: mode,
    [PARAM.pickup]: values.placeIds.from!,
    [PARAM.date]: values.date,
    [PARAM.time]: values.time,
  });
  if (mode === "oneway") params.set(PARAM.dropoff, values.placeIds.to!);
  else params.set(PARAM.hours, String(hours));
  return { ok: true, params };
}

const isHeadCount = (n: number) =>
  Number.isInteger(n) && n >= 1 && n <= MAX_HEAD_COUNT;

/**
 * The options page for a search. `passengers` carries a count already typed
 * there over a changed trip; it is a starting value, not part of the search.
 */
export function tripBookingHref(
  category: TripCategory,
  search: URLSearchParams,
  passengers?: number,
) {
  const params = new URLSearchParams(search);
  if (passengers !== undefined && isHeadCount(passengers)) {
    params.set(PARAM.passengers, String(passengers));
  }
  return `${tripBookingPath(category)}?${params}`;
}

/** Next's `searchParams` prop, or a query string, as one shape. */
export type QueryInput =
  URLSearchParams | string | Record<string, string | string[] | undefined>;

export function toParams(input: QueryInput): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input);
  const params = new URLSearchParams();
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
 * The search behind a booking page URL, or null when it is not a full
 * search. Hours run from the hourly floor to the maximum; the class's own
 * minimum is an availability state on the options page.
 */
export function parseTripSearch(input: QueryInput): TripSearch | null {
  const params = toParams(input);
  const mode = params.get(PARAM.mode);
  const pickupId = params.get(PARAM.pickup);
  const dropoffId = params.get(PARAM.dropoff);
  const date = params.get(PARAM.date);
  const time = params.get(PARAM.time);
  const hours = intIn(
    params.get(PARAM.hours),
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

/** The passenger count in a URL, or null when there is none to start from. */
export function parsePassengers(input: QueryInput): number | null {
  return intIn(toParams(input).get(PARAM.passengers), 1, MAX_HEAD_COUNT);
}

const text = (raw: string | null, max: number) => {
  const value = (raw ?? "").trim().slice(0, max);
  return value === "" ? null : value;
};

/**
 * The choices made on the options page, or null when a required one is
 * missing. Child seats in the URL of a category that does not offer them are
 * dropped.
 */
export function parseTripOptions(
  category: TripCategory,
  input: QueryInput,
): TripOptions | null {
  const params = toParams(input);
  const vehicleClassId = params.get(PARAM.vehicleClass);
  const passengers = parsePassengers(params);
  const childSeats = offersChildSeats(category)
    ? intIn(params.get(PARAM.childSeats), 0, TRIP_MAX_CHILD_SEATS)
    : null;
  if (!vehicleClassId || !ID_RE.test(vehicleClassId)) return null;
  if (passengers === null) return null;
  return {
    vehicleClassId,
    passengers,
    childSeats: childSeats ?? 0,
    flightNumber:
      text(
        params.get(PARAM.flightNumber),
        TRIP_MAX_FLIGHT_NUMBER_LENGTH,
      )?.toUpperCase() ?? null,
    notes: text(params.get(PARAM.notes), TRIP_MAX_NOTES_LENGTH),
  };
}

/** The search parameters alone, for links back to the options page. */
export function tripSearchParams(search: TripSearch) {
  const params = new URLSearchParams({
    [PARAM.mode]: search.mode,
    [PARAM.pickup]: search.pickupId,
    [PARAM.date]: search.date,
    [PARAM.time]: search.time,
  });
  if (search.dropoffId) params.set(PARAM.dropoff, search.dropoffId);
  if (search.hours !== null) params.set(PARAM.hours, String(search.hours));
  return params;
}

/** The search parameters as hidden inputs, so a GET form carries them on. */
export function hiddenSearchFields(search: TripSearch) {
  return Array.from(tripSearchParams(search).entries());
}
