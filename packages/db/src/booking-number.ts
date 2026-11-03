import { localDateTimeInputs } from "./booking-rules";

/**
 * A booking's running number, the one staff and Finance know it by:
 * counted per year in Malaysia, from 1, each booking taking the highest of
 * its year + 1 when made. It reads as a quotation, HTQ-26-00042, until the
 * booking is first confirmed, then as its invoice, HTI-26-00042: the same
 * digits, so a quotation and its invoice match at a glance. The random
 * reference (HT-7K3QZM) stays the booking's id in links and emails, so a
 * guest cannot guess another's. Pure and browser-safe. See
 * docs/261102-booking-ops.md, "5. Quotation and invoice numbers".
 */

export const BOOKING_NUMBER_DIGITS = 5;

/** The year a booking made at this instant is counted in: 26 for 2026, in Malaysia. */
export function bookingNumberYear(instant: Date): number {
  return Number(localDateTimeInputs(instant).date.slice(2, 4));
}

/** "HTQ-26-00042", or "HTI-26-00042" once confirmed; null for a booking from before numbers. */
export function bookingNumberOf(booking: {
  numberYear: number | null;
  number: number | null;
  confirmedAt: Date | null;
}): string | null {
  const { numberYear, number } = booking;
  if (numberYear === null || number === null) return null;
  const kind = booking.confirmedAt ? "HTI" : "HTQ";
  const year = String(numberYear).padStart(2, "0");
  const digits = String(number).padStart(BOOKING_NUMBER_DIGITS, "0");
  return `${kind}-${year}-${digits}`;
}

/** What a booking is called on a screen: its number, or its reference before numbers. */
export function bookingLabelOf(booking: {
  reference: string;
  numberYear: number | null;
  number: number | null;
  confirmedAt: Date | null;
}): string {
  return bookingNumberOf(booking) ?? booking.reference;
}

/**
 * A number as typed in a search: "HTQ-26-00042", "HTI-26-42", "26-42" or
 * "26/00042", either kind, any case. Null when it is not one.
 */
export function parseBookingNumber(
  text: string,
): { numberYear: number; number: number } | null {
  const match = /^(?:HT[QI]?[-\s]?)?(\d{2})[-/\s](\d{1,6})$/i.exec(text.trim());
  if (!match) return null;
  const number = Number(match[2]);
  return number > 0 ? { numberYear: Number(match[1]), number } : null;
}
