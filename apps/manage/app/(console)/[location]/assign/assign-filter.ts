import {
  addDays,
  isDay,
  isTripMode,
  searchTermOf,
  todayInMalaysia,
  untilPickup,
  type TripMode,
} from "@repo/db";
import type { AssignRow } from "@repo/db/server";

/**
 * What narrows the Assign page besides where the trips stand: a search,
 * the days they pick up on, and the Filters button's choices, read from
 * the address and matched against the trips already loaded, so a filter
 * costs no query. See `assignHref` for the address.
 */

/** The days a chip names: today, tomorrow, or today and the six after it. */
export const ASSIGN_DAYS = ["today", "tomorrow", "week"] as const;
export type AssignDay = (typeof ASSIGN_DAYS)[number];
export const ASSIGN_DAY_LABELS: Record<AssignDay, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  week: "Next 7 days",
};
const isAssignDay = (value: string): value is AssignDay =>
  ASSIGN_DAYS.includes(value as AssignDay);

export const GUIDE_CHOICES = ["with", "without"] as const;
export type GuideChoice = (typeof GUIDE_CHOICES)[number];
export const GUIDE_CHOICE_LABELS: Record<GuideChoice, string> = {
  with: "With guide",
  without: "No guide",
};

/** The trips that need Operation first: picking up within the day while not yet assigned, or past their end. */
export const ASSIGN_ONLY = ["urgent", "overdue"] as const;
export type AssignOnly = (typeof ASSIGN_ONLY)[number];
export const ASSIGN_ONLY_LABELS: Record<AssignOnly, string> = {
  urgent: "Urgent",
  overdue: "Overdue",
};

export type AssignView = {
  q?: string;
  /** An `AssignDay`, or a day, "2026-11-05", as the address has it. */
  date?: string;
  vendor?: string;
  classId?: string;
  trip?: TripMode;
  guide?: GuideChoice;
  only?: AssignOnly;
};

const textOf = (value: unknown) => (typeof value === "string" ? value : "");
const oneOf = <T extends string>(values: readonly T[], value: unknown) =>
  values.includes(value as T) ? (value as T) : undefined;

/** The view the address asks for; any value it does not know is no filter. */
export function assignViewOf(query: Record<string, unknown>): AssignView {
  const date = textOf(query.date);
  return {
    q: searchTermOf(query.q) ?? undefined,
    date: isAssignDay(date) || isDay(date) ? date : undefined,
    vendor: textOf(query.vendor) || undefined,
    classId: textOf(query.class) || undefined,
    trip: isTripMode(query.trip) ? query.trip : undefined,
    guide: oneOf(GUIDE_CHOICES, query.guide),
    only: oneOf(ASSIGN_ONLY, query.only),
  };
}

/** The first and last day, counted in, of the days the view names. */
function daysOf(date: string, now: Date): { from: string; to: string } {
  const today = todayInMalaysia(now);
  if (date === "today") return { from: today, to: today };
  if (date === "tomorrow") {
    const tomorrow = addDays(today, 1);
    return { from: tomorrow, to: tomorrow };
  }
  if (date === "week") return { from: today, to: addDays(today, 6) };
  return { from: date, to: date };
}

/** Picking up within the day while it is still to assign or waits for an answer: its time in red. */
export function isUrgent(row: AssignRow, now: Date) {
  return (
    untilPickup(row.startsAt, now).soon &&
    (row.state === "to-assign" || row.state === "waiting")
  );
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
  const days = view.date ? daysOf(view.date, now) : null;
  return rows.filter((row) => {
    if (days) {
      const day = todayInMalaysia(row.startsAt);
      if (day < days.from || day > days.to) return false;
    }
    if (view.vendor && !row.parts.some((p) => p.vendorId === view.vendor)) {
      return false;
    }
    if (view.classId && row.classId !== view.classId) return false;
    if (view.trip && (row.hours !== null) !== (view.trip === "hourly")) {
      return false;
    }
    if (view.guide && row.withGuide !== (view.guide === "with")) return false;
    if (view.only === "urgent" && !isUrgent(row, now)) return false;
    if (view.only === "overdue" && !row.overdue) return false;
    return !view.q || holds(row, view.q);
  });
}

/** The vendors and classes the trips name, by name: what the Filters offer. */
export function choicesOf(rows: readonly AssignRow[]) {
  const vendors = new Map<string, string>();
  const classes = new Map<string, string>();
  for (const row of rows) {
    for (const part of row.parts) vendors.set(part.vendorId, part.vendorName);
    if (row.classId) classes.set(row.classId, row.className);
  }
  const sorted = (map: Map<string, string>) =>
    [...map]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  return { vendors: sorted(vendors), classes: sorted(classes) };
}
