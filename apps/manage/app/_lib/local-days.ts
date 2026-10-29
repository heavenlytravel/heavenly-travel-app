import { BOOKING_RULES, localDateTimeInputs } from "@repo/db";

/**
 * Days as the console's headings name them, in Malaysian time: the date
 * over the dashboard's greeting, and the day over each group of a
 * history's changes.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const longDate = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const longDateWithYear = new Intl.DateTimeFormat("en-MY", {
  timeZone: BOOKING_RULES.timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** The Malaysian day an instant falls in, "2026-10-29": what a history groups its changes by. */
export function localDayOf(instant: Date): string {
  return localDateTimeInputs(instant).date;
}

/** A day in full, "Thursday, 29 October", with its year when it is not this year's. */
export function formatLongDate(instant: Date, now: Date = new Date()): string {
  const sameYear =
    localDayOf(instant).slice(0, 4) === localDayOf(now).slice(0, 4);
  return (sameYear ? longDate : longDateWithYear).format(instant);
}

/** The day over a group of changes: "Today · Thursday, 29 October", "Yesterday · …", or the day in full. */
export function dayHeadingOf(instant: Date, now: Date = new Date()): string {
  const day = localDayOf(instant);
  const long = formatLongDate(instant, now);
  if (day === localDayOf(now)) return `Today · ${long}`;
  if (day === localDayOf(new Date(now.getTime() - DAY_MS))) {
    return `Yesterday · ${long}`;
  }
  return long;
}
