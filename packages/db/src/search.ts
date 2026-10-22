/**
 * What a list's search box typed, read the way the lists match it: the
 * bookings by reference, customer and contact, the vehicles by plate and
 * model, the drivers by name and phone, the admins by name and email.
 * Pure and browser-safe; the readers build their queries from these.
 */

/** The longest search a list reads; the rest is ignored. */
export const SEARCH_MAX_LENGTH = 60;

/** A search as the lists read it, its spaces squashed; null for none. */
export function searchTermOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const term = value.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  return term || null;
}

/**
 * The digits of a search as a phone number holds them, without the 60 or
 * the 0 a Malaysian number may start with, so "012-345 6789" finds both
 * "+60123456789" and "0123456789"; null for fewer than three digits.
 */
export function phoneDigitsOf(term: string): string | null {
  const digits = term.replace(/\D/g, "").replace(/^(60|0)/, "");
  return digits.length >= 3 ? digits : null;
}

/** A search as plates are kept: capitals and digits only, "vle 12" as "VLE12"; null for none. */
export function plateTermOf(term: string): string | null {
  const plate = term.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return plate || null;
}
