import { localDateTimeInputs } from "./booking-rules";

/**
 * A booking's numbers, the ones staff and Finance know it by, each counted
 * per year in Malaysia from the last one given (`BookingNumberCounter`).
 * A quotation number, HTQ-26-00042, when staff make the booking; an
 * invoice number, HTI-26-00017, when it is first confirmed, kept beside
 * the quotation's: a quotation never confirmed is a lead lost. A website
 * booking has an invoice number only, once confirmed (paid, when the
 * gateway comes). The random reference (HT-7K3QZM) stays the booking's id
 * in links and emails, so a guest cannot guess another's. Pure and
 * browser-safe; ./booking-counter gives the numbers. See
 * docs/261102-booking-ops.md, "5. Quotation and invoice numbers".
 */

const BOOKING_NUMBER_DIGITS = 5;

export type BookingNumberKind = "quote" | "invoice";

const PREFIX: Record<BookingNumberKind, string> = {
  quote: "HTQ",
  invoice: "HTI",
};

/** The year a number given at this instant is counted in: 26 for 2026, in Malaysia. */
export function bookingNumberYear(instant: Date): number {
  return Number(localDateTimeInputs(instant).date.slice(2, 4));
}

/** "HTQ-26-00042" or "HTI-26-00042". */
export function formatBookingNumber(
  kind: BookingNumberKind,
  year: number,
  number: number,
): string {
  const yy = String(year).padStart(2, "0");
  const digits = String(number).padStart(BOOKING_NUMBER_DIGITS, "0");
  return `${PREFIX[kind]}-${yy}-${digits}`;
}

export type BookingNumberFields = {
  quoteYear: number | null;
  quoteNumber: number | null;
  invoiceYear: number | null;
  invoiceNumber: number | null;
};

/** What a query selects to name a booking by its numbers (`bookingLabelOf`). */
export const BOOKING_NUMBER_SELECT = {
  reference: true,
  quoteYear: true,
  quoteNumber: true,
  invoiceYear: true,
  invoiceNumber: true,
} as const;

/** A booking's quotation and invoice numbers, each null until given. */
export function bookingNumbersOf(booking: BookingNumberFields): {
  quote: string | null;
  invoice: string | null;
} {
  return {
    quote:
      booking.quoteYear !== null && booking.quoteNumber !== null
        ? formatBookingNumber("quote", booking.quoteYear, booking.quoteNumber)
        : null,
    invoice:
      booking.invoiceYear !== null && booking.invoiceNumber !== null
        ? formatBookingNumber(
            "invoice",
            booking.invoiceYear,
            booking.invoiceNumber,
          )
        : null,
  };
}

/**
 * What a booking is called on a screen: its invoice number once it has
 * one, else its quotation number, else its reference (a website booking
 * not yet confirmed, or one from before numbers).
 */
export function bookingLabelOf(
  booking: BookingNumberFields & { reference: string },
): string {
  const { quote, invoice } = bookingNumbersOf(booking);
  return invoice ?? quote ?? booking.reference;
}

/**
 * A number as typed in a search: "HTQ-26-00042", "hti-26-42", or "26-42"
 * and "26/00042" for either kind. Null when it is not one.
 */
export function parseBookingNumber(text: string): {
  kind: BookingNumberKind | null;
  year: number;
  number: number;
} | null {
  const match = /^(?:HT([QI])?[-\s]?)?(\d{2})[-/\s](\d{1,6})$/i.exec(
    text.trim(),
  );
  if (!match) return null;
  const number = Number(match[3]);
  if (number === 0) return null;
  const letter = match[1]?.toUpperCase();
  return {
    kind: letter === "Q" ? "quote" : letter === "I" ? "invoice" : null,
    year: Number(match[2]),
    number,
  };
}
