/**
 * A booking's numbers, the ones staff and Finance know it by, each one
 * running count that never starts again (`BookingNumberCounter`): no year
 * in them, since an invoice is often made long before its trip, in
 * another year. An invoice number, HTI-1308, carrying on the old system's
 * series (HT1307 and before), when a booking is first confirmed; staff
 * may give one an old invoice's own number instead. A quotation number,
 * HTQ-0001, for the quotations to come; none is given yet. The random
 * reference (HT-7K3QZM) stays the booking's id in links and emails, so a
 * guest cannot guess another's. Pure and browser-safe; ./booking-counter
 * gives the numbers. See docs/261102-booking-ops.md, "5. Quotation and
 * invoice numbers".
 */

const BOOKING_NUMBER_DIGITS = 4;

export type BookingNumberKind = "quote" | "invoice";

const PREFIX: Record<BookingNumberKind, string> = {
  quote: "HTQ",
  invoice: "HTI",
};

/** "HTQ-0042" or "HTI-1308". */
export function formatBookingNumber(
  kind: BookingNumberKind,
  number: number,
): string {
  return `${PREFIX[kind]}-${String(number).padStart(BOOKING_NUMBER_DIGITS, "0")}`;
}

export type BookingNumberFields = {
  quoteNumber: number | null;
  invoiceNumber: number | null;
};

/** What a query selects to name a booking by its numbers (`bookingLabelOf`). */
export const BOOKING_NUMBER_SELECT = {
  reference: true,
  quoteNumber: true,
  invoiceNumber: true,
} as const;

/** A booking's quotation and invoice numbers, each null until given. */
export function bookingNumbersOf(booking: BookingNumberFields): {
  quote: string | null;
  invoice: string | null;
} {
  return {
    quote:
      booking.quoteNumber !== null
        ? formatBookingNumber("quote", booking.quoteNumber)
        : null,
    invoice:
      booking.invoiceNumber !== null
        ? formatBookingNumber("invoice", booking.invoiceNumber)
        : null,
  };
}

/**
 * The numbers as rows of a booking's summary, staff's and the
 * customer's alike: "Quotation" and "Invoice", each once given.
 */
export function bookingNumberRows(
  booking: BookingNumberFields,
): [label: string, value: string][] {
  const { quote, invoice } = bookingNumbersOf(booking);
  return [
    ...(quote ? [["Quotation", quote] as [string, string]] : []),
    ...(invoice ? [["Invoice", invoice] as [string, string]] : []),
  ];
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
 * A number as typed: "HTI-1308", "HT1223" (the old system's invoices),
 * "htq-0042", or "1308" for either kind. Null when it is not one, such as
 * a reference (HT-7K3QZM).
 */
export function parseBookingNumber(text: string): {
  kind: BookingNumberKind | null;
  number: number;
} | null {
  const match = /^(HT([QI])?[-\s]?)?(\d{1,7})$/i.exec(text.trim());
  if (!match) return null;
  const number = Number(match[3]);
  if (number === 0) return null;
  // HT and digits alone is how the old system wrote its invoices.
  const kind = !match[1]
    ? null
    : match[2]?.toUpperCase() === "Q"
      ? "quote"
      : "invoice";
  return { kind, number };
}
