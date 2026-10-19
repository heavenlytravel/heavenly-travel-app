import { localDateTimeInputs } from "./booking-rules";
import type { Parsed } from "./fields";

/**
 * The expiry dates of the documents a vehicle or a driver must keep valid:
 * road tax, insurance, a licence. Each is a calendar day, stored as a
 * `@db.Date` (midnight UTC of that day) and handled here as its date
 * input's value, "2027-03-12", which compares and logs as it reads. A
 * document is valid through its day, due within `EXPIRY_WARNING_DAYS` of
 * today in Malaysia, and expired after. Browser-safe. See
 * docs/261019-vehicles-and-drivers.md.
 */

/** How many days ahead a document shows as due. */
export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryState = "valid" | "due" | "expired";

/** One document that needs a look: due soon or expired. */
export type DocumentDue = {
  label: string;
  /** "2027-03-12" */
  expiresOn: string;
  state: Exclude<ExpiryState, "valid">;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A stored date as its date input's value, "2027-03-12"; null for none. */
export function dayOf(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** A day as the date to store; null for none. */
export function dateOfDay(day: string | null): Date | null {
  return day ? new Date(`${day}T00:00:00Z`) : null;
}

/** Whether the text is a real calendar day: "2027-02-31" is not. */
export function isDay(text: string): boolean {
  if (!DATE_RE.test(text)) return false;
  const date = dateOfDay(text)!;
  return !Number.isNaN(date.getTime()) && dayOf(date) === text;
}

/** A date input's value, read: null when empty. */
export function parseDay(value: unknown, label: string): Parsed<string | null> {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return { ok: true, value: null };
  return isDay(text)
    ? { ok: true, value: text }
    : {
        ok: false,
        error: `Enter the ${label.toLowerCase()} expiry as a date.`,
      };
}

/** Today in Malaysia, "2026-10-19". */
export function todayInMalaysia(now: Date = new Date()): string {
  return localDateTimeInputs(now).date;
}

/** The day `days` after this one. */
function addDays(day: string, days: number): string {
  return dayOf(new Date(dateOfDay(day)!.getTime() + days * DAY_MS))!;
}

/** Whether a document expiring on this day is valid, due soon, or expired, today in Malaysia. */
export function expiryStateOf(
  day: string,
  now: Date = new Date(),
): ExpiryState {
  const today = todayInMalaysia(now);
  if (day < today) return "expired";
  return day <= addDays(today, EXPIRY_WARNING_DAYS) ? "due" : "valid";
}

/** The documents of a record that are due or expired, soonest first. */
export function documentsDue<K extends string>(
  days: Record<K, string | null>,
  labels: Record<K, string>,
  now: Date = new Date(),
): DocumentDue[] {
  const due: DocumentDue[] = [];
  for (const key of Object.keys(labels) as K[]) {
    const expiresOn = days[key];
    if (!expiresOn) continue;
    const state = expiryStateOf(expiresOn, now);
    if (state !== "valid") due.push({ label: labels[key], expiresOn, state });
  }
  return due.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}

/** The last day a document may expire on and count as due, as a query compares it: today plus the warning. */
export function dueByDate(now: Date = new Date()): Date {
  return dateOfDay(addDays(todayInMalaysia(now), EXPIRY_WARNING_DAYS))!;
}

const dayFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** A day as people read it: "12 Mar 2027". */
export function formatDay(day: string): string {
  return dayFormat.format(dateOfDay(day)!);
}

/** How far off a day is, as a badge says it: "Expired 3 days ago", "Expires today", "Expires in 12 days". */
export function expiryText(day: string, now: Date = new Date()): string {
  const today = todayInMalaysia(now);
  const days = Math.round(
    (dateOfDay(day)!.getTime() - dateOfDay(today)!.getTime()) / DAY_MS,
  );
  if (days === 0) return "Expires today";
  if (days < 0) {
    return days === -1 ? "Expired yesterday" : `Expired ${-days} days ago`;
  }
  return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
}
