import {
  checkHours,
  isTripCategory,
  isTripMode,
  TRIP_PARAM,
  type TripCategory,
} from "@repo/db";
import { PRODUCTS, type SearchValues } from "./search";

/**
 * The transportation booking flow's paths, which categories the website
 * sells, and how the search card's values become a trip's search. The
 * trips themselves travel in the browser's storage (./trip-plan-store),
 * each as the search parameters of `trip-input.ts` in `@repo/db`, which
 * the console's manual booking shares; the category is the path segment.
 * Browser-safe.
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
