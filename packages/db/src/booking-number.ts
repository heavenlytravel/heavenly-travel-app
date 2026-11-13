/**
 * The numbers a booking and its bills are known by, one letter per
 * document type, four digits that grow to five, no year: HTB-1042 a
 * booking, HTQ-0012 a booking received and not yet confirmed (a
 * quotation), HTI-0001 an invoice, HTC-0001 a credit note. Each is one
 * running count that never starts again (`BookingNumberCounter`,
 * ./booking-counter gives them). A booking's number, its HTQ until it is
 * confirmed and its HTB from then, is its id everywhere, staff's and the
 * customer's; an invoice number never is. See also
 * docs/261111-catalogue-booking-flow-and-ops.md, part F. The formats live here alone, so the team may
 * change them in one place. Pure and browser-safe. See
 * docs/261108-billing-and-revisions.md, "Decisions".
 */

const DIGITS = 4;

export const DOCUMENT_KINDS = [
  "booking",
  "invoice",
  "credit",
  "quote",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const PREFIX: Record<DocumentKind, string> = {
  booking: "HTB",
  invoice: "HTI",
  credit: "HTC",
  quote: "HTQ",
};

/** "HTB-0042", "HTI-1308", "HTC-10001". */
export function formatDocumentNumber(kind: DocumentKind, number: number) {
  return `${PREFIX[kind]}-${String(number).padStart(DIGITS, "0")}`;
}

/** An invoice's or a credit note's number as read: HTI-0012, HTC-0003; "Open Invoice" until it is issued. */
export function documentLabelOf(doc: { type: string; number: number | null }) {
  if (doc.number === null) return "Open Invoice";
  return formatDocumentNumber(
    doc.type === "credit" ? "credit" : "invoice",
    doc.number,
  );
}

/** What a query selects to name a booking (`bookingLabelOf`). */
export const BOOKING_NUMBER_SELECT = {
  id: true,
  number: true,
  quoteNumber: true,
} as const;

/**
 * The numbers that name a booking: its HTB once confirmed, its HTQ while
 * received. Left out only where every booking read is confirmed already
 * (its bills, its trips' work), so it has its HTB.
 */
export type BookingNumbers = {
  id: string;
  number: number | null;
  quoteNumber?: number | null;
};

/**
 * What a booking is called on every screen and in every email: its
 * number, HTB-1042 once confirmed, HTQ-0012 while it is received. A row
 * from before booking numbers is called by the end of its id, so it can
 * still be told apart.
 */
export function bookingLabelOf(booking: BookingNumbers) {
  return booking.number !== null
    ? formatDocumentNumber("booking", booking.number)
    : booking.quoteNumber != null
      ? formatDocumentNumber("quote", booking.quoteNumber)
      : `Booking ${booking.id.slice(-6).toUpperCase()}`;
}

/** Where a booking's number is in a query: its HTB, or its HTQ. */
export type BookingRef = { kind: "booking" | "quote"; number: number };

/** The query that finds a booking by its HTB or its HTQ. */
export function bookingWhereOf(ref: BookingRef) {
  return ref.kind === "booking"
    ? { number: ref.number }
    : { quoteNumber: ref.number };
}

const TYPED_RE = /^(HT([BICQ]))?[-\s]?(\d{1,7})$/i;

/**
 * A number as typed: "HTB-1042", "htb1042", "HTI 0001", or digits alone,
 * any kind ("1042"). Null when it is none, such as a legacy number with a
 * line (HTI-1295-03), which search finds as text.
 */
export function parseDocumentNumber(
  text: string,
): { kind: DocumentKind | null; number: number } | null {
  const match = TYPED_RE.exec(text.trim());
  if (!match) return null;
  const number = Number(match[3]);
  if (number === 0) return null;
  const letter = match[2]?.toUpperCase();
  const kind =
    letter === undefined
      ? null
      : (DOCUMENT_KINDS.find((k) => PREFIX[k] === `HT${letter}`) ?? null);
  return { kind, number };
}

/**
 * The booking a website address names, "HTB-1042" or "HTQ-0012", exactly
 * as the site writes it; null for anything else, an old reference
 * (HT-7K3QZM) included, which no longer opens a booking.
 */
export function bookingRefOfPath(segment: string): BookingRef | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null; // "%E0": not an address of ours.
  }
  const match = /^HT([BQ])-(\d{4,7})$/.exec(decoded);
  if (!match) return null;
  return {
    kind: match[1] === "B" ? "booking" : "quote",
    number: Number(match[2]),
  };
}

/** The longest legacy invoice number staff may type. */
export const LEGACY_INVOICE_MAX = 40;

/**
 * A legacy invoice number as typed: free text, trimmed, upper case, for
 * admin's reference; null for an empty box. An error past
 * `LEGACY_INVOICE_MAX` characters.
 */
export function parseLegacyInvoiceNumber(
  typed: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = typed.trim().replace(/\s+/g, " ").toUpperCase();
  if (value === "") return { ok: true, value: null };
  if (value.length > LEGACY_INVOICE_MAX) {
    return {
      ok: false,
      error: `Keep the old invoice number to ${LEGACY_INVOICE_MAX} characters.`,
    };
  }
  return { ok: true, value };
}
