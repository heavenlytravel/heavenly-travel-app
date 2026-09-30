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

/** Where staff enter a booking that arrived by phone, WhatsApp or email. */
export const NEW_BOOKING_PATH = `${BOOKINGS_PATH}/new`;

export const COVERAGE_PATH = "/coverage";

/** One state's page, by its ISO code. */
export function stateHref(code: string) {
  return `${COVERAGE_PATH}/${code}`;
}

export const VEHICLE_CLASSES_PATH = "/vehicle-classes";

/** One class's page, by id; "new" for the add page. */
export function vehicleClassHref(id: string) {
  return `${VEHICLE_CLASSES_PATH}/${id}`;
}
export const NEW_VEHICLE_CLASS_PATH = vehicleClassHref("new");

/** The form that amends one item of a booking: its trip, vehicle and details. */
export function amendItemHref(bookingId: string, itemId: string) {
  return `${bookingHref(bookingId)}/amend/${itemId}`;
}
