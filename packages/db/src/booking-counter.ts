import type { Prisma } from "./generated/prisma/client";
import {
  formatBookingNumber,
  formatInvoiceNumber,
  invoicePeriodLabel,
  invoicePeriodStart,
  isInvoicePeriod,
  type BookingNumberKind,
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

/**
 * Why an old invoice's number, typed by staff, cannot be a new invoice's;
 * null when it can. It must be one the counter has passed already, so the
 * counter never comes to give it again, and no invoice's yet. Called with
 * the counter's row locked, so two bookings cannot both take it.
 */
async function oldInvoiceNumberIssue(
  client: Client,
  number: number,
): Promise<string | null> {
  const last = await lastBookingNumber(client, "invoice");
  const typed = formatBookingNumber("invoice", number);
  if (number > last) {
    return last === 0
      ? `The running invoice number is not set yet, so ${typed} cannot be an old one. Ask the developer to set it.`
      : `${typed} is not given yet: the last given is ${formatBookingNumber("invoice", last)}. Leave the box empty for the next one.`;
  }
  const taken = await client.invoice.findUnique({
    where: { number },
    select: { id: true },
  });
  return taken ? `${typed} is another invoice's already.` : null;
}

/** Why a booking cannot take the invoice asked for: its message is for staff. */
export class InvoiceRefusal extends Error {}

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
 */
export async function invoiceFor(
  tx: Client,
  booking: { agentId: string | null; startsAt: Date },
  oldNumber: number | null = null,
): Promise<InvoicePlace> {
  await lockInvoices(tx);
  const agent = booking.agentId
    ? await tx.vendor.findUniqueOrThrow({
        where: { id: booking.agentId },
        select: { id: true, name: true, invoicePeriod: true },
      })
    : null;
  const period =
    agent && isInvoicePeriod(agent.invoicePeriod)
      ? agent.invoicePeriod
      : "month";
  const periodStart = agent
    ? invoicePeriodStart(booking.startsAt, period)
    : null;

  if (agent && periodStart) {
    const open = await tx.invoice.findUnique({
      where: {
        agentId_periodStart: {
          agentId: agent.id,
          periodStart: new Date(`${periodStart}T00:00:00Z`),
        },
      },
      select: { id: true, number: true },
    });
    if (open) {
      if (oldNumber !== null && oldNumber !== open.number) {
        throw new InvoiceRefusal(
          `${agent.name}'s invoice for ${invoicePeriodLabel(periodStart, period)} is ${formatInvoiceNumber(open.number, null)} already. Leave the box empty to add this booking to it.`,
        );
      }
      const { _max } = await tx.booking.aggregate({
        where: { invoiceId: open.id },
        _max: { invoiceLine: true },
      });
      return { invoiceId: open.id, invoiceLine: (_max.invoiceLine ?? 0) + 1 };
    }
  }

  if (oldNumber !== null) {
    const issue = await oldInvoiceNumberIssue(tx, oldNumber);
    if (issue) throw new InvoiceRefusal(issue);
  }
  const invoice = await tx.invoice.create({
    data: {
      number: oldNumber ?? (await nextBookingNumber(tx, "invoice")),
      agentId: agent?.id ?? null,
      periodStart: periodStart ? new Date(`${periodStart}T00:00:00Z`) : null,
    },
    select: { id: true },
  });
  return { invoiceId: invoice.id, invoiceLine: agent ? 1 : null };
}
