import type { Prisma } from "./generated/prisma/client";
import { formatBookingNumber, type BookingNumberKind } from "./booking-number";

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

/**
 * Why an old invoice's number, typed for a booking staff enter, cannot be
 * its own; null when it can. It must be one the counter has passed
 * already, so the counter never comes to give it again, and on no other
 * booking. Inside a booking's transaction, the counter's row is locked
 * first, so two bookings cannot both take it.
 */
export async function oldInvoiceNumberIssue(
  client: Client,
  number: number,
  options: { lock?: boolean } = {},
): Promise<string | null> {
  if (options.lock) {
    await client.$executeRaw`SELECT kind FROM "BookingNumberCounter" WHERE kind = 'invoice' FOR UPDATE`;
  }
  const last = await lastBookingNumber(client, "invoice");
  const typed = formatBookingNumber("invoice", number);
  if (number > last) {
    return last === 0
      ? `The running invoice number is not set yet, so ${typed} cannot be an old one. Ask the developer to set it.`
      : `${typed} is not given yet: the last given is ${formatBookingNumber("invoice", last)}. Leave the box empty for the next one.`;
  }
  const taken = await client.booking.findUnique({
    where: { invoiceNumber: number },
    select: { id: true },
  });
  return taken ? `${typed} is another booking's already.` : null;
}
