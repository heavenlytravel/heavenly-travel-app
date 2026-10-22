/** How many bookings the console header's search lists under its box; the rest are on the Bookings list. */
export const BOOKING_SEARCH_LIMIT = 6;

/** One booking as the console header's search lists it. */
export type BookingMatch = {
  id: string;
  reference: string;
  /** The booking's status, as `BookingStatusBadge` shows it. */
  status: string;
  customer: string;
  /** "Langkawi", or "Langkawi, Penang" for a booking whose items pick up in two; "" for none. */
  locations: string;
  /** When it first picks up: "Sat, 24 Oct 2026, 11:00 AM". */
  pickup: string;
  /** The booking's page, inside its location when it has one. */
  href: string;
};

/** What `BOOKING_SEARCH_PATH` answers. */
export type BookingSearchResponse = { matches: BookingMatch[] };
