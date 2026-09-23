import { BOOKING_RULES, isBeforeCancellationCutoff } from "./booking-rules";
import { guardFor } from "./const-enum";

/**
 * Booking vocabulary shared by both apps. Browser-safe: no database access.
 * See docs/car-with-driver.md, "Booking lifecycle".
 */

export const PRODUCTS = ["car-with-driver"] as const;
export type Product = (typeof PRODUCTS)[number];
export const isProduct = guardFor(PRODUCTS);

export const CAR_MODES = ["oneway", "hourly"] as const;
export type CarMode = (typeof CAR_MODES)[number];
export const isCarMode = guardFor(CAR_MODES);
export const CAR_MODE_LABELS: Record<CarMode, string> = {
  oneway: "One-way",
  hourly: "By the hour",
};

/** received -> confirmed -> assigned -> completed, or cancelled from any of them. */
export const ITEM_STATUSES = [
  "received",
  "confirmed",
  "assigned",
  "completed",
  "cancelled",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export const isItemStatus = guardFor(ITEM_STATUSES);
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  received: "Received",
  confirmed: "Confirmed",
  assigned: "Driver assigned",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Summary of a booking's items, stored on the booking for list filtering. */
export const BOOKING_STATUSES = [
  "received",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const isBookingStatus = guardFor(BOOKING_STATUSES);
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  received: "Received",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CANCELLERS = ["customer", "admin"] as const;
export type Canceller = (typeof CANCELLERS)[number];
export const isCanceller = guardFor(CANCELLERS);

/** A live item is one that has not been cancelled. */
export function isLive(item: { status: string }) {
  return item.status !== "cancelled";
}

/**
 * The booking status implied by its items. Cancelled when no item is live,
 * received while any live item is still received, completed when every live
 * item is completed, otherwise confirmed (assigned counts as confirmed or
 * beyond). A booking always has at least one item.
 */
export function bookingStatusOf(
  items: readonly { status: string }[],
): BookingStatus {
  const live = items.filter(isLive);
  if (live.length === 0) return "cancelled";
  if (live.some((i) => i.status === "received")) return "received";
  if (live.every((i) => i.status === "completed")) return "completed";
  return "confirmed";
}

/** The forward step an admin may take from each item status, one at a time. */
export const NEXT_ITEM_STATUS = {
  received: "confirmed",
  confirmed: "assigned",
  assigned: "completed",
} as const satisfies Partial<Record<ItemStatus, ItemStatus>>;

/** Statuses a customer may still cancel from; the cutoff is checked separately. */
export const CUSTOMER_CANCELLABLE: readonly BookingStatus[] = [
  "received",
  "confirmed",
];

export type CustomerCancelCheck =
  { ok: true } | { ok: false; reason: "status" | "cutoff"; message: string };

/**
 * Whether the customer may cancel this booking right now: only while it is
 * received or confirmed, and only before the cancellation cutoff measured
 * from the earliest live item's start. The page uses this to decide what
 * the cancel button says; the transition uses it to refuse.
 */
export function checkCustomerCancel(
  booking: { status: string; startsAt: Date },
  now: Date = new Date(),
): CustomerCancelCheck {
  if (!CUSTOMER_CANCELLABLE.includes(booking.status as BookingStatus)) {
    return {
      ok: false,
      reason: "status",
      message: `Booking is already ${booking.status}.`,
    };
  }
  if (!isBeforeCancellationCutoff(booking.startsAt, now)) {
    return {
      ok: false,
      reason: "cutoff",
      message: `Cannot cancel within ${BOOKING_RULES.cancellationCutoffHours} hours of pickup.`,
    };
  }
  return { ok: true };
}
