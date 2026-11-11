import type { Prisma } from "./generated/prisma/client";
import type { DocumentKind } from "./booking-number";

type Client = Prisma.TransactionClient;

/**
 * Gives the next number of a kind (./booking-number): a booking's, an
 * invoice's, a credit note's. One statement takes it and moves the
 * counter on, locking the counter's row until the transaction ends, so
 * two at once never share a number, and one rolled back gives its number
 * back: no gaps.
 */
export async function nextBookingNumber(
  tx: Client,
  kind: DocumentKind,
): Promise<number> {
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "BookingNumberCounter" (kind, last)
    VALUES (${kind}, 1)
    ON CONFLICT (kind)
    DO UPDATE SET last = "BookingNumberCounter".last + 1
    RETURNING last`;
  if (!row) throw new Error("The number counter gave no number.");
  return row.last;
}

/** The last number of a kind given, 0 before any: the next is one more, unless another takes it first. */
export async function lastBookingNumber(
  client: Client,
  kind: DocumentKind,
): Promise<number> {
  const row = await client.bookingNumberCounter.findUnique({
    where: { kind },
  });
  return row?.last ?? 0;
}
