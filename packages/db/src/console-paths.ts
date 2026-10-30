/**
 * The console's addresses that other apps link to: the staff email's
 * "Open in console", the customer site's "Edit" on a preview. Every
 * console address starts with the location, `~` for every location the
 * person may see; these open under `~`, which holds every record. See
 * docs/261029-manage-signature-overhaul.md. Browser-safe.
 */

/** The first segment of a console address that means every location. */
export const ALL_LOCATIONS_SEGMENT = "~";

/** One booking in the console, under every location. */
export function consoleBookingPath(bookingId: string) {
  return `/${ALL_LOCATIONS_SEGMENT}/bookings/${bookingId}`;
}

/** One vendor in the console, under every location. */
export function consoleVendorPath(vendorId: string) {
  return `/${ALL_LOCATIONS_SEGMENT}/fleet/vendors/${vendorId}`;
}
