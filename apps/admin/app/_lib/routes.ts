import type { BookingStatus, LocationPageKey } from "@repo/db";

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

export const LOCATIONS_PATH = "/locations";

/** One location's page, by id. */
export function locationHref(id: string) {
  return `${LOCATIONS_PATH}/${id}`;
}
export const NEW_LOCATION_PATH = `${LOCATIONS_PATH}/new`;

/** The id of the saved addresses card on a location's page, and the link that lands on it. */
export const SAVED_ADDRESSES_ID = "saved-addresses";
export function locationAddressesHref(id: string) {
  return `${locationHref(id)}#${SAVED_ADDRESSES_ID}`;
}

/** What Marketing sets on the customer site's home page: the top choices. */
export const HOME_PAGE_PATH = "/home-page";

/** The editor of one page of a location: its landing page or a product's. */
export function locationPageHref(id: string, page: LocationPageKey) {
  return `${locationHref(id)}/pages/${page}`;
}

/** What one publish in a location's history put on a page, by the log entry's id. */
export function locationPublishHref(id: string, entryId: string) {
  return `${locationHref(id)}/history/${entryId}`;
}

/** Where the page editor posts an image; answers the stored file. */
export const LOCATION_IMAGE_UPLOAD_PATH = "/api/uploads/location-image";

/** The form that amends one item of a booking: its trip, vehicle and details. */
export function amendItemHref(bookingId: string, itemId: string) {
  return `${bookingHref(bookingId)}/amend/${itemId}`;
}
