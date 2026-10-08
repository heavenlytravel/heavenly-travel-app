/**
 * The customer site's account and booking paths, so neither the site's
 * pages nor the emails spell a URL or the sign-in return parameter by
 * hand. Relative; the emails put `SITE_URL` in front. Browser-safe.
 */

export const ACCOUNT_PATH = "/account";
export const ACCOUNT_BOOKINGS_PATH = `${ACCOUNT_PATH}/bookings`;

/** The page an account holder lands on after booking, and the link in their emails. */
export function bookingPath(reference: string) {
  return `/booking/${reference}`;
}

/**
 * The page a guest lands on after booking: the reference and where the
 * emails went, nothing else. `to` is the masked email, shown if present.
 */
export function receivedPath(reference: string, to?: string) {
  const path = `/booking/received/${reference}`;
  return to ? `${path}?to=${encodeURIComponent(to)}` : path;
}

/** The booking under My bookings, where it can be cancelled. */
export function accountBookingPath(reference: string) {
  return `${ACCOUNT_BOOKINGS_PATH}/${reference}`;
}

/** Sign-in that comes back to `returnTo` afterwards. Clerk reads `redirect_url`. */
export function signInPath(returnTo: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
}

/**
 * Sign-up coming back to `returnTo` afterwards, with the email filled in
 * when the caller knows it: the "Manage booking online" link a guest's
 * emails carry, and the offer on the received page, which does not.
 */
export function signUpPath(email: string | null, returnTo: string) {
  const params = new URLSearchParams(email ? { email } : {});
  params.set("redirect_url", returnTo);
  return `/sign-up?${params}`;
}
