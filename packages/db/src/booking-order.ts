import { guardFor } from "./const-enum";

/**
 * How an admin list of bookings is ordered: by when it was made, newest
 * or oldest first, or by when it picks up, earliest or latest first. The
 * first is the list's own order.
 */
export const BOOKING_ORDERS = [
  "newest",
  "oldest",
  "soonest",
  "latest",
] as const;
export type BookingOrder = (typeof BOOKING_ORDERS)[number];
export const isBookingOrder = guardFor(BOOKING_ORDERS);
/** The columns a list of bookings sorts by from its heading, each with its two orders. */
export const BOOKING_SORT_COLUMNS = {
  made: { ascending: "oldest", descending: "newest" },
  pickup: { ascending: "soonest", descending: "latest" },
} as const satisfies Record<
  string,
  { ascending: BookingOrder; descending: BookingOrder }
>;
export type BookingSortColumn = keyof typeof BOOKING_SORT_COLUMNS;

/**
 * Where a column's heading stands in the order in force: sorted by it one
 * way or the other, or not by it.
 */
export function sortDirectionOf(
  column: BookingSortColumn,
  order: BookingOrder,
): "ascending" | "descending" | null {
  const orders = BOOKING_SORT_COLUMNS[column];
  return order === orders.ascending
    ? "ascending"
    : order === orders.descending
      ? "descending"
      : null;
}

/**
 * The order a click on a column's heading turns to: the other way while
 * it sorts by it, else its first way, the newest made first and the
 * earliest pick-up first.
 */
export function nextSortOf(
  column: BookingSortColumn,
  order: BookingOrder,
): BookingOrder {
  const orders = BOOKING_SORT_COLUMNS[column];
  const direction = sortDirectionOf(column, order);
  if (direction === "ascending") return orders.descending;
  if (direction === "descending") return orders.ascending;
  return column === "made" ? orders.descending : orders.ascending;
}
