import { BOOKING_RULES } from "./booking-rules";
import { guardFor } from "./const-enum";
import { formatMyr } from "./money";

/**
 * Billing's rules, pure and browser-safe, so every screen and ./billing
 * agree: a business's payment terms and its periods, who a booking is
 * billed to, what saving a change bills (`billingPlanOf`), and where an
 * invoice's payment stands (`paymentStateOf`). Money is never worked out
 * anywhere else. See docs/261108-billing-and-revisions.md, "Billing rules
 * in code".
 */

/* Businesses and their terms */

/** A business we sell to on account. Corporates and Biz members come with Biz. */
export const BUSINESS_KINDS = ["agent"] as const;
export type BusinessKind = (typeof BUSINESS_KINDS)[number];
export const isBusinessKind = guardFor(BUSINESS_KINDS);

export const BUSINESS_STATUSES = ["active", "inactive"] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];
export const isBusinessStatus = guardFor(BUSINESS_STATUSES);
export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

/**
 * How a business pays: "none", each booking billed on its own open
 * invoice, as a customer of ours is; or on credit, its bookings billed together
 * for each period by the month-end run, a month or half of one.
 */
export const PAYMENT_TERMS = ["none", "month", "half-month"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];
export const isPaymentTerms = guardFor(PAYMENT_TERMS);
export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  none: "No credit",
  month: "Monthly",
  "half-month": "Twice a month",
};
export const PAYMENT_TERMS_HINTS: Record<PaymentTerms, string> = {
  none: "Each booking is billed to the agent on its own invoice, issued when the trip is done or by Finance.",
  month: "Bookings are billed together after each month, by first pick-up.",
  "half-month":
    "Bookings are billed together for the 1st to the 15th, then the 16th to the month's end.",
};

/** Whether terms are credit: billed by the run, not per booking. */
export function isCredit(terms: string): terms is "month" | "half-month" {
  return terms === "month" || terms === "half-month";
}

/** The most days to pay a business may be given. */
export const MAX_DAYS_TO_PAY = 180;

/* Periods, by Malaysia's calendar */

/** The day an instant falls on in Malaysia, "2026-11-15": a trip at 23:30 on the 15th is the 15th's. */
export function localDayOf(instant: Date): string {
  return new Date(instant.getTime() + BOOKING_RULES.utcOffsetHours * 3_600_000)
    .toISOString()
    .slice(0, 10);
}

/** The instant a Malaysian day starts, from "2026-11-01". */
export function localDayStart(day: string): Date {
  return new Date(
    new Date(`${day}T00:00:00Z`).getTime() -
      BOOKING_RULES.utcOffsetHours * 3_600_000,
  );
}

/** The day after, "2026-11-30" to "2026-12-01". */
function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

type Period = "month" | "half-month";

/** A run's period: its first and last day, inclusive. */
export type BillingPeriod = { start: string; end: string };

/** The period a day is in: its month, or its half of the month. */
export function periodOf(day: string, period: Period): BillingPeriod {
  const month = day.slice(0, 7);
  const date = Number(day.slice(8, 10));
  const lastOfMonth = new Date(
    Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  if (period === "month") return { start: `${month}-01`, end: lastOfMonth };
  return date <= 15
    ? { start: `${month}-01`, end: `${month}-15` }
    : { start: `${month}-16`, end: lastOfMonth };
}

/** Whether a period is over in Malaysia, so its month-end invoice may be issued. */
export function periodHasEnded(period: BillingPeriod, now: Date) {
  return localDayOf(now) > period.end;
}

const monthFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "November 2026", or "1–15 November 2026" for part of a month. */
export function periodLabel(period: BillingPeriod): string {
  const month = monthFormat.format(new Date(`${period.start}T00:00:00Z`));
  const from = Number(period.start.slice(8, 10));
  const to = Number(period.end.slice(8, 10));
  const whole = from === 1 && nextDay(period.end).endsWith("-01");
  return whole ? month : `${from}–${to} ${month}`;
}

/* Who is billed */

/**
 * Who an invoice is billed to, frozen at issue: the business for a
 * booking sold through one, the booking's contact otherwise.
 */
export type BillTo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  registrationNo: string;
  /** The business's id; null for a customer of ours. */
  businessId: string | null;
};

/** A stored `billTo`, read safely; empty fields for anything missing. */
export function billToOf(stored: unknown): BillTo {
  const value =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof value[key] === "string" ? (value[key] as string) : "";
  return {
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    registrationNo: text("registrationNo"),
    businessId: typeof value.businessId === "string" ? value.businessId : null,
  };
}

/* Documents */

export const INVOICE_TYPES = ["invoice", "credit"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];
export const isInvoiceType = guardFor(INVOICE_TYPES);
export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  invoice: "Invoice",
  credit: "Credit note",
};

export const INVOICE_STATUSES = ["open", "issued", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const isInvoiceStatus = guardFor(INVOICE_STATUSES);
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: "Open",
  issued: "Issued",
  void: "Void",
};

/** Who an invoice bills, for Finance's list: a customer's booking, an agent's booking, an agent's month-end run. */
export const INVOICE_BILLED = ["customer", "agent", "month-end"] as const;
export type InvoiceBilled = (typeof INVOICE_BILLED)[number];
export const isInvoiceBilled = guardFor(INVOICE_BILLED);
export const INVOICE_BILLED_LABELS: Record<InvoiceBilled, string> = {
  customer: "Customer",
  agent: "Agent, per booking",
  "month-end": "Agent, month-end",
};

export const INVOICE_ISSUED_WHEN = [
  "this-month",
  "last-month",
  "this-year",
] as const;
export type InvoiceIssuedWhen = (typeof INVOICE_ISSUED_WHEN)[number];
export const isInvoiceIssuedWhen = guardFor(INVOICE_ISSUED_WHEN);
export const INVOICE_ISSUED_LABELS: Record<InvoiceIssuedWhen, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
};

/** The longest reason a void, a reversal or a terms change may give. */
export const BILLING_REASON_MAX = 300;

/** A reason as typed, trimmed; an error when empty or too long. */
export function parseReason(
  typed: unknown,
  what: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = typeof typed === "string" ? typed.trim() : "";
  if (value === "") return { ok: false, error: `Say why ${what}.` };
  if (value.length > BILLING_REASON_MAX) {
    return {
      ok: false,
      error: `Keep the reason to ${BILLING_REASON_MAX} characters.`,
    };
  }
  return { ok: true, value };
}

/**
 * When an invoice is due: a business's, its days to pay after issue; a
 * customer's, by the first pick-up (pay before the trip), or at issue
 * when that has passed.
 */
export function dueAtOf(
  issuedAt: Date,
  billed: { daysToPay: number } | { firstPickup: Date },
): Date {
  if ("daysToPay" in billed) {
    return new Date(issuedAt.getTime() + billed.daysToPay * 86_400_000);
  }
  return billed.firstPickup > issuedAt ? billed.firstPickup : issuedAt;
}

/* Payments */

export const PAYMENT_METHODS = [
  "transfer",
  "cash",
  "cash-to-driver",
  "card",
  "cheque",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = guardFor(PAYMENT_METHODS);
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: "Bank transfer",
  cash: "Cash",
  "cash-to-driver": "Cash to driver",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

/**
 * Where an invoice's money stands, worked out from its payments, never set
 * by hand. A booking's alone may read Pay later instead of Pending or
 * Overdue (`withPayLater`): nothing paid yet, and that agreed.
 */
export const PAYMENT_STATES = [
  "unpaid",
  "pay-later",
  "overdue",
  "partially-paid",
  "paid",
  "nothing-due",
  "refund-due",
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];
export const isPaymentState = guardFor(PAYMENT_STATES);
export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  unpaid: "Pending",
  "pay-later": "Pay later",
  overdue: "Overdue",
  "partially-paid": "Partially paid",
  paid: "Paid",
  "nothing-due": "Nothing due",
  "refund-due": "Refund due",
};

/** An invoice's money: what it nets after its credit notes, what came in net of refunds, what is left. */
export type InvoiceMoney = {
  netSen: number;
  paidSen: number;
  balanceSen: number;
  state: PaymentState;
  /** Something is still owed past the due date. */
  overdue: boolean;
};

/**
 * Where an invoice stands: its total plus its credit notes' (negative),
 * against its live payments and its credit notes' refunds (negative).
 * Owed and nothing paid: Unpaid, or Overdue past its due date; some paid:
 * Partially paid; nothing left: Paid, or Nothing due when nothing was owed
 * or paid; paid more than it nets: Refund due.
 */
export function invoiceMoneyOf(input: {
  totalSen: number;
  creditSen: number;
  paidSen: number;
  dueAt: Date | null;
  now: Date;
}): InvoiceMoney {
  const netSen = input.totalSen + input.creditSen;
  const balanceSen = netSen - input.paidSen;
  const overdue =
    balanceSen > 0 && input.dueAt !== null && input.now > input.dueAt;
  const state: PaymentState =
    balanceSen < 0
      ? "refund-due"
      : balanceSen === 0
        ? netSen === 0 && input.paidSen === 0
          ? "nothing-due"
          : "paid"
        : input.paidSen > 0
          ? "partially-paid"
          : overdue
            ? "overdue"
            : "unpaid";
  return { netSen, paidSen: input.paidSen, balanceSen, state, overdue };
}

/**
 * Whether a booking is agreed to be paid later: a credit agent's booking
 * on its month-end invoice always is, and staff say so of any other
 * (`Booking.payLaterDueOn`) while nothing is paid.
 */
export function paysLater(input: {
  /** The day staff agreed it is paid by; null when they have not. */
  payLaterDueOn: Date | null;
  /** On its agent's month-end invoice, credit terms. */
  monthly: boolean;
}): boolean {
  return input.monthly || input.payLaterDueOn !== null;
}

/**
 * A booking's money, Pay later in place of Pending or Overdue while
 * nothing is paid: its due date is for reference and marks nothing
 * overdue. The first payment ends it, and from then on it follows the
 * payments; one reversed back to nothing paid brings it back.
 */
export function withPayLater(
  money: InvoiceMoney,
  payLater: boolean,
): InvoiceMoney {
  return payLater &&
    money.paidSen === 0 &&
    (money.state === "unpaid" || money.state === "overdue")
    ? { ...money, state: "pay-later", overdue: false }
    : money;
}

/** Many invoices' money as one: a booking's, or a business's. */
export function sumMoney(
  parts: readonly InvoiceMoney[],
  now: Date,
): InvoiceMoney | null {
  if (parts.length === 0) return null;
  const totalSen = parts.reduce((sum, p) => sum + p.netSen, 0);
  const paidSen = parts.reduce((sum, p) => sum + p.paidSen, 0);
  const money = invoiceMoneyOf({
    totalSen,
    creditSen: 0,
    paidSen,
    dueAt: null,
    now,
  });
  const overdue = parts.some((p) => p.overdue);
  return {
    ...money,
    overdue,
    state: money.state === "unpaid" && overdue ? "overdue" : money.state,
  };
}

/**
 * One transfer for an agent's month-end invoice, split over its bookings
 * in the order given (the oldest pick-up first): each booking still owing
 * gets what it owes until the money runs out. Paid more than all of them
 * owe, the rest goes on the last booking, to refund. Never a part of
 * nothing; `owedSen` at or below nothing takes none.
 */
export function spreadPayment(
  amountSen: number,
  bookings: readonly { bookingId: string; owedSen: number }[],
): { bookingId: string; amountSen: number }[] {
  const parts: { bookingId: string; amountSen: number }[] = [];
  let left = amountSen;
  for (const booking of bookings) {
    if (left <= 0) break;
    const share = Math.min(left, Math.max(0, booking.owedSen));
    if (share > 0) {
      parts.push({ bookingId: booking.bookingId, amountSen: share });
      left -= share;
    }
  }
  const last = bookings.at(-1);
  if (left > 0 && last) {
    const own = parts.find((part) => part.bookingId === last.bookingId);
    if (own) own.amountSen += left;
    else parts.push({ bookingId: last.bookingId, amountSen: left });
  }
  return parts;
}

/* What a change bills */

/** One issued invoice a booking is on, with what it nets for that booking after its credit notes. */
export type BilledInvoice = {
  invoiceId: string;
  label: string;
  netSen: number;
};

/**
 * What saving a booking as it now stands bills. Not confirmed yet: its
 * total changes, nothing is billed. On credit terms (`credit`), more to
 * pay goes on the agent's open month-end invoice, issued when its period
 * ends. Otherwise, while the booking is live, the difference goes on its
 * own open invoice, numbered when the booking is confirmed, paid against
 * as the money comes in, and issued in full when the booking ends or by
 * Finance; once ended (completed or cancelled), it is issued at once: the
 * open invoice, or a new invoice for more to pay. Less to pay, at once or
 * when the open invoice is issued, is credit notes against its invoices,
 * newest first, each no more than that invoice nets for it, so no invoice
 * goes below nothing. See docs/261108-billing-and-revisions.md, "Open
 * invoices, month-end too, and amendments".
 */
export type BillingPlan =
  | { kind: "not-confirmed" }
  | { kind: "none" }
  /** The open invoice's amount after the save: what is not invoiced yet, negative for a credit. */
  | { kind: "open"; amountSen: number }
  | { kind: "invoice"; amountSen: number }
  | {
      kind: "credit";
      notes: { invoiceId: string; label: string; amountSen: number }[];
    };

/** Credit notes for `amountSen` less (a positive number), newest invoice first. */
export function creditNotesFor(
  amountSen: number,
  billed: readonly BilledInvoice[],
): { invoiceId: string; label: string; amountSen: number }[] {
  let left = amountSen;
  const notes: { invoiceId: string; label: string; amountSen: number }[] = [];
  for (const invoice of billed) {
    if (left === 0) break;
    const take = Math.min(left, invoice.netSen);
    if (take <= 0) continue;
    notes.push({
      invoiceId: invoice.invoiceId,
      label: invoice.label,
      amountSen: -take,
    });
    left -= take;
  }
  return notes;
}

export function billingPlanOf(input: {
  confirmed: boolean;
  /** On the agent's month-end invoice: more waits on it, ended or not. */
  credit: boolean;
  /** Completed or cancelled: nothing waits on its own open invoice any more. */
  ended: boolean;
  chargedSen: number;
  /** Newest first. */
  billed: readonly BilledInvoice[];
}): BillingPlan {
  if (!input.confirmed) return { kind: "not-confirmed" };
  const billedSen = input.billed.reduce((sum, b) => sum + b.netSen, 0);
  const difference = input.chargedSen - billedSen;
  if (difference === 0) return { kind: "none" };
  if (difference > 0) {
    return input.ended && !input.credit
      ? { kind: "invoice", amountSen: difference }
      : { kind: "open", amountSen: difference };
  }
  if (!input.credit && !input.ended) {
    return { kind: "open", amountSen: difference };
  }
  const notes = creditNotesFor(-difference, input.billed);
  return notes.length > 0 ? { kind: "credit", notes } : { kind: "none" };
}

/** The plan in a sentence for the save dialog: "Saving issues HTI-0012 for RM 90.00." */
export function billingPlanSentence(
  plan: BillingPlan,
  next: {
    /** The number an invoice it issues takes: the next one. */
    invoice: string;
    credit: (index: number) => string;
    /** The booking has its open invoice already. */
    opened?: boolean;
    /**
     * It goes on the agent's month-end invoice: the period ("Nov 2026"),
     * or "" when it is not known yet.
     */
    period?: string;
  },
  /** What the move is called: "Saving", "Confirming". */
  verb = "Saving",
): string {
  switch (plan.kind) {
    case "not-confirmed":
      return "Not confirmed yet: only its total changes. Its invoice opens when it is confirmed.";
    case "none":
      return "Nothing to bill: the total billed stays the same.";
    case "open":
      if (next.period !== undefined && plan.amountSen > 0) {
        const which = next.period
          ? `the agent's ${next.period} invoice`
          : "the agent's month-end invoice";
        return `${verb} puts ${formatMyr(plan.amountSen)} on ${which}: numbered and issued when the period ends.`;
      }
      return plan.amountSen > 0
        ? next.opened
          ? `${verb} moves the booking's open invoice to ${formatMyr(plan.amountSen)}: the same invoice, numbered and issued when the booking is completed.`
          : `${verb} opens the booking's invoice for ${formatMyr(plan.amountSen)}: payments go on it, and it is numbered and issued when the booking is completed.`
        : `${verb} leaves ${formatMyr(-plan.amountSen)} to credit: a credit note is issued when the booking is completed.`;
    case "invoice":
      return `${verb} issues ${next.invoice} for ${formatMyr(plan.amountSen)}.`;
    case "credit":
      return plan.notes
        .map(
          (note, index) =>
            `${verb} issues credit note ${next.credit(index)} for ${formatMyr(-note.amountSen)} against ${note.label}.`,
        )
        .join(" ");
  }
}

/* Suggested prices */

/**
 * The price rule: what the customer pays now, moved by what the quote
 * moved. Staff may agree another number, with a reason. Never below
 * nothing.
 */
export function suggestedPriceOf(input: {
  chargedSen: number;
  oldQuoteSen: number;
  newQuoteSen: number;
}): number {
  return Math.max(0, input.chargedSen + input.newQuoteSen - input.oldQuoteSen);
}
