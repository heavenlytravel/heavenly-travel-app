/**
 * The customer site's account and booking paths, so no page spells a URL
 * or the sign-in return parameter by hand. The car flow's own paths live
 * in car-booking.ts next to the query they carry.
 */

export const ACCOUNT_PATH = "/account";
export const ACCOUNT_BOOKINGS_PATH = `${ACCOUNT_PATH}/bookings`;

/** The page a customer lands on after booking, and the link in their emails. */
export function bookingHref(reference: string) {
  return `/booking/${reference}`;
}

/** The booking under My bookings, where it can be cancelled. */
export function accountBookingHref(reference: string) {
  return `${ACCOUNT_BOOKINGS_PATH}/${reference}`;
}

/** Sign-in that comes back to `returnTo` afterwards. Clerk reads `redirect_url`. */
export function signInHref(returnTo: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
}
