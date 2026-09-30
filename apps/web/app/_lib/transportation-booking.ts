import {
  checkHours,
  isHeadCount,
  isTripCategory,
  isTripMode,
  TRIP_PARAM,
  type TripCategory,
} from "@repo/db";
import { PRODUCTS, type SearchValues } from "./search";

/**
 * The transportation booking flow keeps the whole trip in the URL: the
 * search card links to the options page with the search, the options page
 * links to the confirm page with the search plus the choices, and the confirm
 * page carries the same query through the sign-in redirect. Nothing is lost
 * on the way and every step can be shared or reopened. The category is a
 * path segment, the trip is the query. The query's names and parsers are
 * `trip-input.ts` in `@repo/db`, shared with the console's manual booking;
 * this module is the website's part: its paths, which categories it sells
 * and how the search card's values become the query. Browser-safe.
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
    [TRIP_PARAM.mode]: mode,
    [TRIP_PARAM.pickup]: values.placeIds.from!,
    [TRIP_PARAM.date]: values.date,
    [TRIP_PARAM.time]: values.time,
  });
  if (mode === "oneway") params.set(TRIP_PARAM.dropoff, values.placeIds.to!);
  else params.set(TRIP_PARAM.hours, String(hours));
  return { ok: true, params };
}

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
    params.set(TRIP_PARAM.passengers, String(passengers));
  }
  return `${tripBookingPath(category)}?${params}`;
}
