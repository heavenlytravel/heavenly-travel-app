/**
 * The customer site's account and booking paths, so no page spells a URL
 * or the sign-in return parameter by hand. The builders live in `@repo/db`
 * (`site-paths.ts`), because the emails link to the same pages; this module
 * is the site's name for them. The transportation flow's own paths live in
 * transportation-booking.ts next to the query they carry.
 */

export {
  ACCOUNT_PATH,
  ACCOUNT_BOOKINGS_PATH,
  bookingPath as bookingHref,
  receivedPath as receivedHref,
  accountBookingPath as accountBookingHref,
  signInPath as signInHref,
  signUpPath as signUpHref,
} from "@repo/db";
