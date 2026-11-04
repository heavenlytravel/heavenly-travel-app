import { localDateTimeInputs } from "./booking-rules";
import {
  isTripMode,
  offersChildSeats,
  type TripCategory,
  type TripMode,
} from "./booking-status";
import {
  hourlyChoiceOf,
  hourlyChoiceOfHours,
  HOURLY_LIMITS,
  isHourlyPackage,
  type HourlyChoice,
} from "./hourly-input";
import { GUIDE_LANGUAGES } from "./guide-input";
import type { TripView } from "./trip-view";

/**
 * A trip as it travels between screens before it is a booking: the search
 * (mode, places, date, time, the hourly package and extra hours) and the options chosen after pricing
 * (class, the model chosen, passengers, child seats, flight, notes). The website carries it
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
  /** Hourly only: the package and the hours past it. */
  hourly: HourlyChoice | null;
};

/** What is chosen once the trip is priced. */
export type TripOptions = {
  vehicleClassId: string;
  /** The model the customer chose, at the class's charge; null when any will do. */
  vehicleModelId: string | null;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
  /** The tour guide's language, paid for; null without a guide. */
  guideLanguage: string | null;
  /** Another language asked for, free, not on sale; null when none. */
  guideRequest: string | null;
};

/**
 * The tour guide as a booking form holds it and a trip keeps it: the
 * language paid for, one on sale for every trip (./guide-rates-input),
 * and another the customer asks Operation to look for. Either may be
 * null; the two are never the same. The website's confirm page and the
 * console's booking forms keep it so. See docs/261103-tour-guide.md.
 */
export type GuideChoice = { language: string | null; request: string | null };

export const NO_GUIDE: GuideChoice = { language: null, request: null };

const knownLanguage = (value: unknown) =>
  typeof value === "string" &&
  (GUIDE_LANGUAGES as readonly string[]).includes(value)
    ? value
    : null;

/** A choice made of any two values: unknown languages dropped, and a request the same as the language. */
export function guideChoiceOf(values: {
  language: unknown;
  request: unknown;
}): GuideChoice {
  const language = knownLanguage(values.language);
  const request = knownLanguage(values.request);
  return { language, request: request === language ? null : request };
}

/** A stored trip's guide as a form starts from it. */
export function storedGuideChoice(details: {
  guideLanguage: string | null;
  guideRequest: string | null;
}): GuideChoice {
  return guideChoiceOf({
    language: details.guideLanguage,
    request: details.guideRequest,
  });
}

/** The guide as a form posts it, `TRIP_PARAM.guide` and `guideRequest`; nothing for none. */
export function guideEntries(guide: GuideChoice): [string, string][] {
  return [
    ...(guide.language
      ? [[TRIP_PARAM.guide, guide.language] as [string, string]]
      : []),
    ...(guide.request
      ? [[TRIP_PARAM.guideRequest, guide.request] as [string, string]]
      : []),
  ];
}

/** The parameter and input names, the same in a URL and in a form. */
export const TRIP_PARAM = {
  mode: "mode",
  pickup: "pickup",
  dropoff: "dropoff",
  date: "date",
  time: "time",
  packageHours: "duration",
  extraHours: "extra",
  passengers: "passengers",
  vehicleClass: "class",
  vehicleModel: "model",
  childSeats: "childSeats",
  flightNumber: "flight",
  notes: "notes",
  /** The tour guide's language, paid for. */
  guide: "guide",
  /** A language asked for, not on sale. */
  guideRequest: "guideRequest",
} as const;

/** The input names an options form posts, so they match what is parsed. */
export const TRIP_OPTION_FIELDS = {
  vehicleClass: TRIP_PARAM.vehicleClass,
  vehicleModel: TRIP_PARAM.vehicleModel,
  passengers: TRIP_PARAM.passengers,
  childSeats: TRIP_PARAM.childSeats,
  flightNumber: TRIP_PARAM.flightNumber,
  notes: TRIP_PARAM.notes,
} as const;

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

/** Whether the value is an id as a trip's address carries one: a place's, a class's or a model's. */
export function isTripId(value: unknown): value is string {
  return typeof value === "string" && ID_RE.test(value);
}

const intIn = (raw: string | null, min: number, max: number) => {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
};

/**
 * The hourly choice in a query or a form: a package size, and extra hours
 * (none when left out). Null when the package is not one there is.
 */
export function parseHourlyChoice(input: QueryInput): HourlyChoice | null {
  const params = toParams(input);
  // A link from before durations names its hours alone: `hours=6` reads
  // as the biggest duration it fills and the rest as extra hours.
  if (params.get(TRIP_PARAM.packageHours) === null) {
    const hours = intIn(params.get("hours"), 1, 24);
    return hours === null ? null : hourlyChoiceOfHours(hours);
  }
  const packageHours = intIn(params.get(TRIP_PARAM.packageHours), 1, 99);
  const rawExtra = params.get(TRIP_PARAM.extraHours);
  const extraHours =
    rawExtra === null || rawExtra === ""
      ? 0
      : intIn(rawExtra, 0, HOURLY_LIMITS.maxExtraHours);
  if (!isHourlyPackage(packageHours) || extraHours === null) return null;
  return { packageHours, extraHours };
}

/**
 * The search in a query or a form, or null when it is not a full search.
 * Whether the pickup's area sells the package is the quote's to say.
 */
export function parseTripSearch(input: QueryInput): TripSearch | null {
  const params = toParams(input);
  const mode = params.get(TRIP_PARAM.mode);
  const pickupId = params.get(TRIP_PARAM.pickup);
  const dropoffId = params.get(TRIP_PARAM.dropoff);
  const date = params.get(TRIP_PARAM.date);
  const time = params.get(TRIP_PARAM.time);
  const hourly = parseHourlyChoice(params);

  if (!isTripMode(mode) || !pickupId || !ID_RE.test(pickupId)) return null;
  if (!date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) return null;
  if (mode === "oneway" && (!dropoffId || !ID_RE.test(dropoffId))) return null;
  if (mode === "hourly" && hourly === null) return null;

  return {
    mode,
    pickupId,
    dropoffId: mode === "oneway" ? dropoffId : null,
    date,
    time,
    hourly: mode === "hourly" ? hourly : null,
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

/** A flight number as typed, in capitals; null for none. */
export function parseFlightNumber(raw: string | null): string | null {
  return text(raw, TRIP_MAX_FLIGHT_NUMBER_LENGTH)?.toUpperCase() ?? null;
}

/**
 * The choices made once the trip is priced, or null when a required one is
 * missing. Child seats for a category that does not offer them are dropped.
 * A model is optional; whether the class lets the customer choose it is
 * the pricing's to check, as is whether the guide's language is on sale.
 * An unknown language is dropped.
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
  const vehicleModelId = params.get(TRIP_PARAM.vehicleModel) || null;
  if (!vehicleClassId || !ID_RE.test(vehicleClassId)) return null;
  if (vehicleModelId !== null && !ID_RE.test(vehicleModelId)) return null;
  if (passengers === null) return null;
  return {
    vehicleClassId,
    vehicleModelId,
    passengers,
    childSeats: childSeats ?? 0,
    flightNumber: parseFlightNumber(params.get(TRIP_PARAM.flightNumber)),
    notes: text(params.get(TRIP_PARAM.notes), TRIP_MAX_NOTES_LENGTH),
    ...tripGuideFields(
      guideChoiceOf({
        language: params.get(TRIP_PARAM.guide),
        request: params.get(TRIP_PARAM.guideRequest),
      }),
    ),
  };
}

/** A choice as a trip's fields: `guideLanguage` and `guideRequest`. */
function tripGuideFields(guide: GuideChoice) {
  return { guideLanguage: guide.language, guideRequest: guide.request };
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
  if (search.hourly) {
    params.set(TRIP_PARAM.packageHours, String(search.hourly.packageHours));
    if (search.hourly.extraHours > 0) {
      params.set(TRIP_PARAM.extraHours, String(search.hourly.extraHours));
    }
  }
  return params;
}

/** The search a stored trip was made from, for a form that amends it. */
export function tripSearchOf(trip: TripView): TripSearch {
  const { date, time } = localDateTimeInputs(trip.startsAt);
  return {
    mode: trip.mode,
    pickupId: trip.pickup.placeId,
    dropoffId: trip.mode === "oneway" ? (trip.dropoff?.placeId ?? null) : null,
    date,
    time,
    hourly: trip.mode === "hourly" ? hourlyChoiceOf(trip) : null,
  };
}

/**
 * A form that carries several items names each one's inputs "item2.mode",
 * "item2.pickup", so one parser reads every item: the console's manual
 * booking, one item per vehicle, and the website's confirm page, one per
 * trip. See docs/261027-multi-trip-booking.md.
 */
const ITEM_FIELD_RE = /^item(\d+)\.(.+)$/;

/** The input name of one field of one item. */
export function tripItemField(index: number, name: string) {
  return `item${index}.${name}`;
}

/** The indexes of the items a form carries, in order, each once. */
export function tripItemIndexes(input: QueryInput): number[] {
  const indexes = new Set<number>();
  for (const key of toParams(input).keys()) {
    const match = ITEM_FIELD_RE.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes].sort((a, b) => a - b);
}

/** One item's fields under their plain names, as the parsers read them. */
export function tripItemParams(
  input: QueryInput,
  index: number,
): URLSearchParams {
  const prefix = `item${index}.`;
  const params = new URLSearchParams();
  for (const [key, value] of toParams(input).entries()) {
    if (key.startsWith(prefix)) params.set(key.slice(prefix.length), value);
  }
  return params;
}
