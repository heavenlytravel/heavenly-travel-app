/**
 * The numbers a booking and its bills are known by, one letter per
 * document type, four digits that grow to five, no year: HTB-1042 a
 * booking, HTI-0001 an invoice, HTC-0001 a credit note, HTQ for the
 * quotations to come. Each is one running count that never starts again
 * (`BookingNumberCounter`, ./booking-counter gives them). The booking
 * number is the booking's id everywhere, staff's and the customer's; an
 * invoice number never is. The formats live here alone, so the team may
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

/** An invoice's or a credit note's number as read: HTI-0012, HTC-0003; "Draft" while it has none. */
export function documentLabelOf(doc: { type: string; number: number | null }) {
  if (doc.number === null) return "Draft";
  return formatDocumentNumber(
    doc.type === "credit" ? "credit" : "invoice",
    doc.number,
  );
}

/** What a query selects to name a booking (`bookingLabelOf`). */
export const BOOKING_NUMBER_SELECT = { id: true, number: true } as const;

/**
 * What a booking is called on every screen and in every email: its
 * number, HTB-1042. A row from before booking numbers, not yet numbered by
 * db:set-billing, is called by the end of its id, so it can still be told
 * apart.
 */
export function bookingLabelOf(booking: { id: string; number: number | null }) {
  return booking.number !== null
    ? formatDocumentNumber("booking", booking.number)
    : `Booking ${booking.id.slice(-6).toUpperCase()}`;
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
 * The booking a website address names, "HTB-1042", exactly as the site
 * writes it; null for anything else, an old reference (HT-7K3QZM)
 * included, which no longer opens a booking.
 */
export function bookingNumberOfPath(segment: string): number | null {
  const match = /^HTB-(\d{4,7})$/.exec(decodeURIComponent(segment));
  return match ? Number(match[1]) : null;
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
      error: `Keep the legacy invoice number to ${LEGACY_INVOICE_MAX} characters.`,
    };
  }
  return { ok: true, value };
}
