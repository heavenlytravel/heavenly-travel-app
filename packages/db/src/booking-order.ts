import { guardFor } from "./const-enum";

/**
 * How an admin list of bookings is ordered: by when it was made, newest
 * first, or by when it picks up, earliest or latest first.
 */
export const BOOKING_ORDERS = ["newest", "soonest", "latest"] as const;
export type BookingOrder = (typeof BOOKING_ORDERS)[number];
export const isBookingOrder = guardFor(BOOKING_ORDERS);
export const BOOKING_ORDER_LABELS: Record<BookingOrder, string> = {
  newest: "Newest made",
  soonest: "Pick-up, earliest first",
  latest: "Pick-up, latest first",
};
