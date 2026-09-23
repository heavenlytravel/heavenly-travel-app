import { BOOKING_RULES, checkHours, isCarMode, type CarMode } from "@repo/db";
import type { SearchValues } from "./search";

/**
 * The car-with-driver booking flow keeps the whole trip in the URL: the
 * search card links to the options page with the search, the options page
 * links to the confirm page with the search plus the choices, and the confirm
 * page carries the same query through the sign-in redirect. Nothing is lost
 * on the way and every step can be shared or reopened. This module is the
 * one place that knows the parameter names. Browser-safe.
 */

export const CAR_BOOKING_PATH = "/booking/car-with-driver";
export const CAR_CONFIRM_PATH = `${CAR_BOOKING_PATH}/confirm`;

export const MAX_PASSENGERS = 99;
export const MAX_CHILD_SEATS = 4;
export const MAX_FLIGHT_NUMBER_LENGTH = 12;
export const MAX_NOTES_LENGTH = 500;

/** What the search card asks. Place ids only; the server resolves them. */
export type CarSearch = {
  mode: CarMode;
  pickupId: string;
  /** One-way only. */
  dropoffId: string | null;
  /** "2026-10-03" */
  date: string;
  /** "09:30" */
  time: string;
  /** Hourly only. */
  hours: number | null;
  passengers: number;
};

/** What the options page adds. */
export type CarOptions = {
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
export const CAR_OPTION_FIELDS = {
  vehicleClass: PARAM.vehicleClass,
  passengers: PARAM.passengers,
  childSeats: PARAM.childSeats,
  flightNumber: PARAM.flightNumber,
  notes: PARAM.notes,
} as const;

/** One message per field the search card cannot send yet. */
export type CarSearchIssue = {
  field: keyof SearchValues;
  message: string;
};

type CarSearchFromCard =
  | { ok: true; params: URLSearchParams }
  | { ok: false; issues: CarSearchIssue[] };

/**
 * The search card's values as the options page query, or why they cannot be
 * sent. A place field with text but no id was typed freehand; the card asks
 * for a pick from the list rather than guessing which place was meant.
 */
export function carSearchFromCard(values: SearchValues): CarSearchFromCard {
  const issues: CarSearchIssue[] = [];
  const mode = isCarMode(values.mode) ? values.mode : "oneway";

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
  const passengers = Number(values.people);
  if (!Number.isInteger(passengers) || passengers < 1) {
    issues.push({ field: "people", message: "How many passengers?" });
  }
  if (issues.length > 0) return { ok: false, issues };

  const params = new URLSearchParams({
    [PARAM.mode]: mode,
    [PARAM.pickup]: values.placeIds.from!,
    [PARAM.date]: values.date,
    [PARAM.time]: values.time,
    [PARAM.passengers]: String(Math.min(passengers, MAX_PASSENGERS)),
  });
  if (mode === "oneway") params.set(PARAM.dropoff, values.placeIds.to!);
  else params.set(PARAM.hours, String(hours));
  return { ok: true, params };
}

export function carBookingHref(params: URLSearchParams) {
  return `${CAR_BOOKING_PATH}?${params}`;
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

/** The search behind a booking page URL, or null when it is not a full search. */
export function parseCarSearch(input: QueryInput): CarSearch | null {
  const params = toParams(input);
  const mode = params.get(PARAM.mode);
  const pickupId = params.get(PARAM.pickup);
  const dropoffId = params.get(PARAM.dropoff);
  const date = params.get(PARAM.date);
  const time = params.get(PARAM.time);
  const hours = intIn(params.get(PARAM.hours), 1, BOOKING_RULES.maxHourlyHours);
  const passengers = intIn(params.get(PARAM.passengers), 1, MAX_PASSENGERS);

  if (!isCarMode(mode) || !pickupId || !ID_RE.test(pickupId)) return null;
  if (!date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) return null;
  if (passengers === null) return null;
  if (mode === "oneway" && (!dropoffId || !ID_RE.test(dropoffId))) return null;
  if (mode === "hourly" && hours === null) return null;

  return {
    mode,
    pickupId,
    dropoffId: mode === "oneway" ? dropoffId : null,
    date,
    time,
    hours: mode === "hourly" ? hours : null,
    passengers,
  };
}

const text = (raw: string | null, max: number) => {
  const value = (raw ?? "").trim().slice(0, max);
  return value === "" ? null : value;
};

/** The choices made on the options page, or null when a required one is missing. */
export function parseCarOptions(input: QueryInput): CarOptions | null {
  const params = toParams(input);
  const vehicleClassId = params.get(PARAM.vehicleClass);
  const passengers = intIn(params.get(PARAM.passengers), 1, MAX_PASSENGERS);
  const childSeats = intIn(params.get(PARAM.childSeats), 0, MAX_CHILD_SEATS);
  if (!vehicleClassId || !ID_RE.test(vehicleClassId)) return null;
  if (passengers === null) return null;
  return {
    vehicleClassId,
    passengers,
    childSeats: childSeats ?? 0,
    flightNumber:
      text(
        params.get(PARAM.flightNumber),
        MAX_FLIGHT_NUMBER_LENGTH,
      )?.toUpperCase() ?? null,
    notes: text(params.get(PARAM.notes), MAX_NOTES_LENGTH),
  };
}

/** The search parameters alone, for links back to the options page. */
export function carSearchParams(search: CarSearch) {
  const params = new URLSearchParams({
    [PARAM.mode]: search.mode,
    [PARAM.pickup]: search.pickupId,
    [PARAM.date]: search.date,
    [PARAM.time]: search.time,
    [PARAM.passengers]: String(search.passengers),
  });
  if (search.dropoffId) params.set(PARAM.dropoff, search.dropoffId);
  if (search.hours !== null) params.set(PARAM.hours, String(search.hours));
  return params;
}

/** The search parameters as hidden inputs, so a GET form carries them on. */
export function hiddenSearchFields(search: CarSearch) {
  return Array.from(carSearchParams(search).entries()).filter(
    // The options form asks passengers again, with its own input.
    ([name]) => name !== PARAM.passengers,
  );
}
