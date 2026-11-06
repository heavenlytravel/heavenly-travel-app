import { BOOKING_RULES } from "./booking-rules";
import { guardFor } from "./const-enum";

/**
 * A booking's numbers, the ones staff and Finance know it by, each one
 * running count that never starts again (`BookingNumberCounter`): no year
 * in them, since an invoice is often made long before its trip, in
 * another year. An invoice number, HTI-1308, carrying on the old system's
 * series (HT1307 and before), when a booking is first confirmed: the
 * booking's own, or its agent's for the period its first trip is in, where
 * the booking is a line of it, HTI-1295-03. Staff may give one an old
 * invoice's own number instead. A quotation number, HTQ-0001, for the
 * quotations to come; none is given yet. The random reference (HT-7K3QZM)
 * stays the booking's id in links and emails, so a guest cannot guess
 * another's. Pure and browser-safe; ./booking-counter gives the numbers. See
 * docs/261102-booking-ops.md, "5. Quotation and invoice numbers".
 */

const BOOKING_NUMBER_DIGITS = 4;
const LINE_DIGITS = 2;

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

/** "HTI-1308", or "HTI-1295-03" for the third line of an agent's invoice. */
export function formatInvoiceNumber(number: number, line: number | null) {
  const invoice = formatBookingNumber("invoice", number);
  return line === null
    ? invoice
    : `${invoice}-${String(line).padStart(LINE_DIGITS, "0")}`;
}

export type BookingNumberFields = {
  quoteNumber: number | null;
  invoiceLine: number | null;
  invoice: { number: number } | null;
};

/** What a query selects to name a booking by its numbers (`bookingLabelOf`). */
export const BOOKING_NUMBER_SELECT = {
  reference: true,
  quoteNumber: true,
  invoiceLine: true,
  invoice: { select: { number: true } },
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
    invoice: booking.invoice
      ? formatInvoiceNumber(booking.invoice.number, booking.invoiceLine)
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
 * "htq-0042", "1308" for either kind, or an agent's invoice line,
 * "HTI-1295-03" or "1295-03". Null when it is not one, such as a reference
 * (HT-7K3QZM).
 */
export function parseBookingNumber(text: string): {
  kind: BookingNumberKind | null;
  number: number;
  line: number | null;
} | null {
  const match = /^(HT([QI])?[-\s]?)?(\d{1,7})(?:-(\d{1,3}))?$/i.exec(
    text.trim(),
  );
  if (!match) return null;
  const number = Number(match[3]);
  if (number === 0) return null;
  const line = match[4] === undefined ? null : Number(match[4]);
  if (line === 0) return null;
  // HT and digits alone is how the old system wrote its invoices; only an
  // invoice has lines.
  const kind =
    line !== null
      ? "invoice"
      : !match[1]
        ? null
        : match[2]?.toUpperCase() === "Q"
          ? "quote"
          : "invoice";
  if (line !== null && match[2]?.toUpperCase() === "Q") return null;
  return { kind, number, line };
}

/**
 * An old invoice's number as staff type it, "HT1223", "HTI-1223" or
 * "1223"; null for an empty box, the next number. An error for anything
 * else, a quotation's or an invoice line's.
 */
export function parseOldInvoiceNumber(
  typed: string,
): { ok: true; number: number | null } | { ok: false; error: string } {
  const text = typed.trim();
  if (text === "") return { ok: true, number: null };
  const parsed = parseBookingNumber(text);
  if (!parsed || parsed.kind === "quote" || parsed.line !== null) {
    return {
      ok: false,
      error: `"${text}" is not an invoice number. Type it as HT1223, HTI-1223 or 1223.`,
    };
  }
  return { ok: true, number: parsed.number };
}

/**
 * How often an agent is invoiced: once a month, or twice, the 1st to the
 * 15th and the 16th to the month's end. An agent's bookings join its
 * invoice for the period their first trip is in.
 */
export const INVOICE_PERIODS = ["month", "half-month"] as const;
export type InvoicePeriod = (typeof INVOICE_PERIODS)[number];
export const isInvoicePeriod = guardFor(INVOICE_PERIODS);
export const INVOICE_PERIOD_LABELS: Record<InvoicePeriod, string> = {
  month: "Monthly",
  "half-month": "Twice a month (1st to 15th, 16th to end)",
};

/**
 * The first day of the period an instant is in, by Malaysia's calendar,
 * as the invoice keeps it: "2026-11-01", or "2026-11-16" for the second
 * half of a month. A trip at 00:30 on 1 November in Malaysia is November's.
 */
export function invoicePeriodStart(
  instant: Date,
  period: InvoicePeriod,
): string {
  const local = new Date(
    instant.getTime() + BOOKING_RULES.utcOffsetHours * 3_600_000,
  ).toISOString();
  const month = local.slice(0, 7);
  const day = Number(local.slice(8, 10));
  return period === "half-month" && day > 15 ? `${month}-16` : `${month}-01`;
}

const periodMonth = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/**
 * The last day of the period starting `start` ("2026-11-01"), as a day of
 * the same form: "2026-11-30", or "2026-11-15" for the first half of a
 * month. A booking whose first trip is on a day from `start` to this one
 * joins the period's invoice.
 */
export function invoicePeriodEnd(start: string, period: InvoicePeriod) {
  const day = new Date(`${start}T00:00:00Z`);
  if (period === "half-month" && day.getUTCDate() === 1) {
    return `${start.slice(0, 7)}-15`;
  }
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

/** "November 2026", or "1–15 November 2026" for half a month. */
export function invoicePeriodLabel(start: string, period: InvoicePeriod) {
  const month = periodMonth.format(new Date(`${start}T00:00:00Z`));
  if (period === "month") return month;
  const from = Number(start.slice(8, 10));
  const to = Number(invoicePeriodEnd(start, period).slice(8, 10));
  return `${from}–${to} ${month}`;
}

/**
 * The invoice a booking would get were it confirmed now, for the form to
 * show before it is: as `invoiceFor` would give it, and nothing given. The
 * next number may still go to a booking confirmed first; the save checks
 * again.
 */
export type InvoicePreview = {
  /** The invoice's number: the agent's for the period, the number typed, or the next. */
  number: number;
  /** The booking's line on the agent's invoice; null on an invoice of its own. */
  line: number | null;
  /** The agent's invoice for the period exists already: the booking joins it, and its number cannot change. */
  joins: boolean;
  /** The agent's name; null for a customer of ours. */
  agent: string | null;
  /**
   * The agent's period, its days from and to, inclusive ("2026-11-01" and
   * "2026-11-30"): any first trip from one to the other has the same
   * invoice. Null for a customer of ours, whose invoice no day changes.
   */
  period: { label: string; from: string; to: string } | null;
  /** Why the number typed cannot be given, as the save would refuse it; null when it can, or none was typed. */
  refusal: string | null;
};

/**
 * Where an invoice's payment stands, set by staff until payments are their
 * own records: waiting for it, part of it in, all of it in, or agreed to
 * come later (an agent on credit).
 */
export const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "pay-later",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const isPaymentStatus = guardFor(PAYMENT_STATUSES);
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  partial: "Partially paid",
  paid: "Fully paid",
  "pay-later": "Pay later",
};
