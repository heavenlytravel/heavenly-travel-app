import type { Prisma } from "./generated/prisma/client";
import { bookingNumberYear, type BookingNumberKind } from "./booking-number";

/**
 * Gives the next quotation or invoice number of the year an instant falls
 * in (./booking-number). One statement takes it and moves the year's
 * counter on, locking the counter's row until the transaction ends, so two
 * bookings at once never share a number, and a booking rolled back gives
 * its number back: no gaps.
 */
export async function nextBookingNumber(
  tx: Prisma.TransactionClient,
  kind: BookingNumberKind,
  at: Date,
): Promise<{ year: number; number: number }> {
  const year = bookingNumberYear(at);
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "BookingNumberCounter" (kind, year, last)
    VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year)
    DO UPDATE SET last = "BookingNumberCounter".last + 1
    RETURNING last`;
  if (!row) throw new Error("The booking number counter gave no number.");
  return { year, number: row.last };
}
