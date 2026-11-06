import {
  isDay,
  isTripMode,
  searchTermOf,
  todayInMalaysia,
  isUrgentTrip,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import type { AssignRow } from "@repo/db/server";
import { serviceOf, type FilterClass } from "../../../_lib/trip-filters";

/**
 * What narrows the Assign page besides where the trips stand: a search,
 * the day they pick up on, and the Filters button's choices, read from
 * the address and matched against the trips already loaded, so a filter
 * costs no query. See `assignHref` for the address.
 */

/** The trips that need Operation first: the time in red (`isUrgentTrip`), or the row past its end. */
export const ASSIGN_ONLY = ["urgent", "overdue"] as const;
export type AssignOnly = (typeof ASSIGN_ONLY)[number];
export const ASSIGN_ONLY_LABELS: Record<AssignOnly, string> = {
  urgent: "Urgent",
  overdue: "Overdue",
};

export type AssignView = {
  q?: string;
  /** A pick-up day, "2026-11-05". */
  date?: string;
  /** Car with driver or coach charter. */
  service?: TripCategory;
  classId?: string;
  trip?: TripMode;
  only?: AssignOnly;
};

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

/** The view the address asks for; any value it does not know is no filter. */
export function assignViewOf(query: Record<string, unknown>): AssignView {
  const date = textOf(query.date);
  return {
    q: searchTermOf(query.q) ?? undefined,
    date: isDay(date) ? date : undefined,
    service: serviceOf(query.service),
    classId: textOf(query.class) || undefined,
    trip: isTripMode(query.trip) ? query.trip : undefined,
    only: ASSIGN_ONLY.includes(query.only as AssignOnly)
      ? (query.only as AssignOnly)
      : undefined,
  };
}

/** Whether a trip holds the search: its booking, customer, places, class, and who does it, from which vendor. */
function holds(row: AssignRow, term: string) {
  const needle = term.toLowerCase();
  return [
    row.label,
    row.bookingId,
    row.customer,
    row.job.pickup.label,
    row.job.dropoff?.label,
    row.className,
    ...row.parts.flatMap((part) => [part.name, part.vendorName]),
  ].some((text) => text?.toLowerCase().includes(needle));
}

/** The trips the view leaves, in their order. */
export function rowsInView(
  rows: readonly AssignRow[],
  view: AssignView,
  now: Date,
): AssignRow[] {
  return rows.filter((row) => {
    if (view.date && todayInMalaysia(row.startsAt) !== view.date) return false;
    if (view.service && row.category !== view.service) return false;
    if (view.classId && row.classId !== view.classId) return false;
    if (view.trip && (row.hours !== null) !== (view.trip === "hourly")) {
      return false;
    }
    if (view.only === "urgent" && !isUrgentTrip(row, now)) return false;
    if (view.only === "overdue" && !row.overdue) return false;
    return !view.q || holds(row, view.q);
  });
}

/** The vehicle classes the trips name, by name: what the Filters offer. */
export function classesOf(rows: readonly AssignRow[]): FilterClass[] {
  const classes = new Map<string, FilterClass>();
  for (const row of rows) {
    if (row.classId) {
      classes.set(row.classId, {
        id: row.classId,
        name: row.className,
        category: row.category ?? "",
      });
    }
  }
  return [...classes.values()].sort((a, b) => a.name.localeCompare(b.name));
}
