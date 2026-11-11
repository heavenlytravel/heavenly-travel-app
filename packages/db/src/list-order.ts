import { guardFor } from "./const-enum";

/**
 * A list sorted by when its rows were made, from a column's heading: the
 * newest first or the oldest. Lists of bookings have their own, with
 * pick-up too (./booking-order).
 */
export const MADE_ORDERS = ["newest", "oldest"] as const;
export type MadeOrder = (typeof MADE_ORDERS)[number];
export const isMadeOrder = guardFor(MADE_ORDERS);

/**
 * Where the heading that sorts by when rows were made stands: one way or
 * the other, or not sorted by it (`order` none, a list by its own order,
 * by name say). `fallback` is the list's own order where that is by when
 * they were made.
 */
export function madeDirectionOf(
  order: MadeOrder | undefined,
  fallback?: MadeOrder,
): "ascending" | "descending" | null {
  const shown = order ?? fallback;
  return shown === "oldest"
    ? "ascending"
    : shown === "newest"
      ? "descending"
      : null;
}

/** The order a click on that heading turns to: the other way while sorted by it, else the newest first. */
export function nextMadeOrder(
  order: MadeOrder | undefined,
  fallback?: MadeOrder,
): MadeOrder {
  return madeDirectionOf(order, fallback) === "descending"
    ? "oldest"
    : "newest";
}

/** How a reader orders rows by when they were made, the order's way; the id breaks a tie, so a page never repeats a row. */
export function madeOrderBy(
  order: MadeOrder,
): [{ createdAt: "asc" | "desc" }, { id: "asc" }] {
  return [{ createdAt: order === "oldest" ? "asc" : "desc" }, { id: "asc" }];
}
