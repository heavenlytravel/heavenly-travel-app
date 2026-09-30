import type { BookingStatus } from "@repo/db";

/** The console's paths, so no page spells a URL by hand. */

export const ADMINS_PATH = "/admins";

export const ACTIVITY_PATH = "/activity";

/** The full log, or the page of it older than the entry with this id. */
export function activityHref(before?: string) {
  return before ? `${ACTIVITY_PATH}?before=${before}` : ACTIVITY_PATH;
}
/** Where an admin lands when a screen belongs to another team. */
export const RESTRICTED_PATH = "/restricted";

export const BOOKINGS_PATH = "/bookings";

/** The list, optionally narrowed to one status. */
export function bookingsHref(status?: BookingStatus) {
  return status ? `${BOOKINGS_PATH}?status=${status}` : BOOKINGS_PATH;
}

/** One booking, by id. The customer site uses the reference; ops uses the id. */
export function bookingHref(id: string) {
  return `${BOOKINGS_PATH}/${id}`;
}
