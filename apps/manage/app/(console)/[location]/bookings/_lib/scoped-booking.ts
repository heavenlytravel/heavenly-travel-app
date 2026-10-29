import "server-only";
import { getBooking, type BookingWithItems } from "@repo/db/server";
import { notFound } from "next/navigation";
import type { ConsoleScope } from "../../../../_lib/scope";

/**
 * A booking as its pages open it: under `~` any booking, under a location
 * only one with a trip picking up there. Any other is a page not found.
 */
export async function scopedBooking(
  id: string,
  scope: ConsoleScope,
): Promise<BookingWithItems> {
  const booking = await getBooking(id);
  const here =
    booking &&
    (!scope.location ||
      booking.items.some((item) => item.locationId === scope.location!.id));
  if (!here) notFound();
  return booking;
}
