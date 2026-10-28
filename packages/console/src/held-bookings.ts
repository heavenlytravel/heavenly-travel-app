import { andList, formatLocalDateTime, plural } from "@repo/db";
import type { HeldBooking } from "@repo/db/server";

/**
 * What suspending a vendor, or taking a vehicle or a driver out of
 * service, takes it off, said before it is done: "Pulau Coach has 2
 * accepted bookings: HT-7K3QZM Fri, 6 Nov 2026, 8:00 AM and …". Those
 * trips go back to To assign. Browser-safe. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Vendors".
 */
export function heldBookingsSentence(
  name: string,
  held: readonly HeldBooking[],
  takes: string,
): string {
  const list = held.map(
    (booking) =>
      `${booking.reference} ${formatLocalDateTime(booking.startsAt)}`,
  );
  return `${name} has ${plural(held.length, "accepted booking")} still to come: ${andList(list)}. ${takes} Those trips go back to To assign.`;
}
