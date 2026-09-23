import type { BookingStatus } from "@repo/db";

/** The console's booking paths, so no page spells a URL by hand. */

export const BOOKINGS_PATH = "/bookings";

/** The list, optionally narrowed to one status. */
export function bookingsHref(status?: BookingStatus) {
  return status ? `${BOOKINGS_PATH}?status=${status}` : BOOKINGS_PATH;
}

/** One booking, by id. The customer site uses the reference; ops uses the id. */
export function bookingHref(id: string) {
  return `${BOOKINGS_PATH}/${id}`;
}
