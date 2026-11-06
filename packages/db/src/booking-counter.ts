import type { Prisma } from "./generated/prisma/client";
import {
  formatBookingNumber,
  formatInvoiceNumber,
  invoicePeriodEnd,
  invoicePeriodLabel,
  invoicePeriodStart,
  isInvoicePeriod,
  type BookingNumberKind,
  type InvoicePeriod,
  type InvoicePreview,
} from "./booking-number";

type Client = Prisma.TransactionClient;

/**
 * Gives the next quotation or invoice number (./booking-number). One
 * statement takes it and moves the counter on, locking the counter's row
 * until the transaction ends, so two bookings at once never share a
 * number, and a booking rolled back gives its number back: no gaps.
 */
export async function nextBookingNumber(
  tx: Client,
  kind: BookingNumberKind,
): Promise<number> {
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "BookingNumberCounter" (kind, last)
    VALUES (${kind}, 1)
    ON CONFLICT (kind)
    DO UPDATE SET last = "BookingNumberCounter".last + 1
    RETURNING last`;
  if (!row) throw new Error("The booking number counter gave no number.");
  return row.last;
}

/** The last number of a kind given, 0 before any. */
export async function lastBookingNumber(
  client: Client,
  kind: BookingNumberKind,
): Promise<number> {
  const row = await client.bookingNumberCounter.findUnique({
    where: { kind },
  });
  return row?.last ?? 0;
}

/** Holds the invoice counter's row until the transaction ends: invoices are given one at a time. */
async function lockInvoices(tx: Client) {
  await tx.$executeRaw`SELECT kind FROM "BookingNumberCounter" WHERE kind = 'invoice' FOR UPDATE`;
}

/** Why a booking cannot take the invoice asked for: its message is for staff. */
export class InvoiceRefusal extends Error {}

/** What a booking is invoiced by: its agent, if any, and the day its first trip starts. */
type Invoiced = { agentId: string | null; startsAt: Date };

/** An agent's booking's invoice: the agent's for the period its first trip is in. */
type AgentPeriod = {
  agent: { id: string; name: string };
  period: InvoicePeriod;
  /** The period's first day, "2026-11-01". */
  start: string;
};

/** The agent's period a booking is invoiced in; null for a customer of ours, who gets an invoice of their own. */
async function agentPeriodOf(
  client: Client,
  booking: Invoiced,
): Promise<AgentPeriod | null> {
  if (!booking.agentId) return null;
  const agent = await client.vendor.findUnique({
    where: { id: booking.agentId },
    select: { id: true, name: true, invoicePeriod: true },
  });
  if (!agent) {
    throw new InvoiceRefusal(
      "This agent was deleted meanwhile. Choose another.",
    );
  }
  const period = isInvoicePeriod(agent.invoicePeriod)
    ? agent.invoicePeriod
    : "month";
  return {
    agent: { id: agent.id, name: agent.name },
    period,
    start: invoicePeriodStart(booking.startsAt, period),
  };
}

/** The agent's invoice for the period, once its first booking opened it. */
function periodInvoiceOf(client: Client, place: AgentPeriod) {
  return client.invoice.findUnique({
    where: {
      agentId_periodStart: {
        agentId: place.agent.id,
        periodStart: new Date(`${place.start}T00:00:00Z`),
      },
    },
    select: { id: true, number: true },
  });
}

/** The line a booking joining an invoice takes: after its last. */
async function nextLineOf(client: Client, invoiceId: string) {
  const { _max } = await client.booking.aggregate({
    where: { invoiceId },
    _max: { invoiceLine: true },
  });
  return (_max.invoiceLine ?? 0) + 1;
}

/**
 * Why an old invoice's number, typed by staff, cannot be this booking's;
 * null when it can. Joining the agent's invoice for the period, it must
 * be that invoice's. Opening an invoice, it must be one the counter has
 * passed already, so the counter never comes to give it again, and no
 * invoice's yet. Called with the counter's row locked when giving the
 * invoice, so two bookings cannot both take it.
 */
async function typedNumberIssue(
  client: Client,
  place: AgentPeriod | null,
  open: { number: number } | null,
  number: number,
): Promise<string | null> {
  if (place && open) {
    return number === open.number
      ? null
      : `${place.agent.name}'s invoice for ${invoicePeriodLabel(place.start, place.period)} is ${formatInvoiceNumber(open.number, null)} already, so this booking joins it. Cancel the change.`;
  }
  const last = await lastBookingNumber(client, "invoice");
  const typed = formatBookingNumber("invoice", number);
  if (number > last) {
    return last === 0
      ? `The running invoice number is not set yet, so ${typed} cannot be an old one. Ask the developer to set it.`
      : `${typed} is not given yet: the last given is ${formatBookingNumber("invoice", last)}. Cancel the change for the next one.`;
  }
  const taken = await client.invoice.findUnique({
    where: { number },
    select: { id: true },
  });
  return taken ? `${typed} is another invoice's already.` : null;
}

/** Where a booking's invoice puts it: the invoice, and its line on an agent's. */
export type InvoicePlace = { invoiceId: string; invoiceLine: number | null };

/**
 * Gives a booking being confirmed its invoice, inside its transaction.
 * A customer of ours gets an invoice of their own: the next number, or
 * `oldNumber`, an old invoice's, typed by staff. An agent's booking joins
 * the agent's invoice for the period its first trip is in, as its next
 * line; the period's first booking opens it, with the next number or
 * `oldNumber`, in whatever order the periods come. A number typed for a
 * period already invoiced must be that invoice's. The counter's row is
 * locked first, so two bookings at once never open the same period twice
 * or share a line. A refusal is thrown as an `InvoiceRefusal`.
 * `previewInvoice` answers the same without giving anything.
 */
export async function invoiceFor(
  tx: Client,
  booking: Invoiced,
  oldNumber: number | null = null,
): Promise<InvoicePlace> {
  await lockInvoices(tx);
  const place = await agentPeriodOf(tx, booking);
  const open = place ? await periodInvoiceOf(tx, place) : null;
  if (oldNumber !== null) {
    const issue = await typedNumberIssue(tx, place, open, oldNumber);
    if (issue) throw new InvoiceRefusal(issue);
  }
  if (open) {
    return { invoiceId: open.id, invoiceLine: await nextLineOf(tx, open.id) };
  }
  const invoice = await tx.invoice.create({
    data: {
      number: oldNumber ?? (await nextBookingNumber(tx, "invoice")),
      agentId: place?.agent.id ?? null,
      periodStart: place ? new Date(`${place.start}T00:00:00Z`) : null,
    },
    select: { id: true },
  });
  return { invoiceId: invoice.id, invoiceLine: place ? 1 : null };
}

/** The invoice a booking would get were it confirmed now (`InvoicePreview`), read without the counter's lock: a refusal is thrown as an `InvoiceRefusal`. */
export async function previewInvoice(
  client: Client,
  booking: Invoiced,
  oldNumber: number | null = null,
): Promise<InvoicePreview> {
  const place = await agentPeriodOf(client, booking);
  const open = place ? await periodInvoiceOf(client, place) : null;
  const refusal =
    oldNumber === null
      ? null
      : await typedNumberIssue(client, place, open, oldNumber);
  const number =
    open?.number ??
    (oldNumber !== null && refusal === null
      ? oldNumber
      : (await lastBookingNumber(client, "invoice")) + 1);
  return {
    number,
    line: open ? await nextLineOf(client, open.id) : place ? 1 : null,
    joins: open !== null,
    agent: place?.agent.name ?? null,
    period: place
      ? {
          label: invoicePeriodLabel(place.start, place.period),
          from: place.start,
          to: invoicePeriodEnd(place.start, place.period),
        }
      : null,
    refusal,
  };
}
