import { cancellationDeadline, formatLocalDateTime } from "./booking-rules";
import { guardFor } from "./const-enum";

/**
 * Booking vocabulary shared by both apps. Browser-safe: no database access.
 * See docs/car-with-driver.md, "Booking lifecycle", and docs/coach-charter.md.
 */

export const PRODUCTS = ["transportation"] as const;
export type Product = (typeof PRODUCTS)[number];
export const isProduct = guardFor(PRODUCTS);

/**
 * The kinds of transportation, decided by the vehicle class. Spelled the
 * same in `VehicleClass.category`, the URL, the booking snapshot and the
 * search card tab.
 */
export const TRIP_CATEGORIES = ["car-with-driver", "coach-charter"] as const;
export type TripCategory = (typeof TRIP_CATEGORIES)[number];
export const isTripCategory = guardFor(TRIP_CATEGORIES);
export const TRIP_CATEGORY_LABELS: Record<TripCategory, string> = {
  "car-with-driver": "Car with driver",
  "coach-charter": "Coach charter",
};

/** Child seats are fitted in a car. They are never asked for a coach. */
export const offersChildSeats = (category: TripCategory) =>
  category === "car-with-driver";

export const TRIP_MODES = ["oneway", "hourly"] as const;
export type TripMode = (typeof TRIP_MODES)[number];
export const isTripMode = guardFor(TRIP_MODES);
export const TRIP_MODE_LABELS: Record<TripMode, string> = {
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

/** What the cancel rule reads of an item: its start and its snapshot cutoff. */
export type CancellableItem = {
  status: string;
  startsAt: Date;
  cancellationCutoffHours: number;
};

/**
 * The last instant the customer may cancel: the earliest of each live item's
 * start minus that item's cutoff. Null when no item is live.
 */
export function customerCancelDeadline(
  items: readonly CancellableItem[],
): Date | null {
  return items
    .filter(isLive)
    .map((i) => cancellationDeadline(i.startsAt, i.cancellationCutoffHours))
    .reduce<Date | null>(
      (min, deadline) => (min === null || deadline < min ? deadline : min),
      null,
    );
}

export type CustomerCancelCheck =
  | { ok: true; deadline: Date; message: string }
  | { ok: false; reason: "status"; message: string }
  | { ok: false; reason: "cutoff"; deadline: Date; message: string };

/**
 * Whether the customer may cancel this booking right now: only while it is
 * received or confirmed, and only before the deadline set by its items'
 * cutoffs. The page uses this to decide what the cancel button says; the
 * transition uses it to refuse. The message names the deadline as a date,
 * never a number of hours, so it reads the same with one item or several.
 */
export function checkCustomerCancel(
  booking: { status: string; items: readonly CancellableItem[] },
  now: Date = new Date(),
): CustomerCancelCheck {
  const deadline = customerCancelDeadline(booking.items);
  if (
    !CUSTOMER_CANCELLABLE.includes(booking.status as BookingStatus) ||
    deadline === null
  ) {
    return {
      ok: false,
      reason: "status",
      message: `Booking is already ${booking.status}.`,
    };
  }
  if (now.getTime() >= deadline.getTime()) {
    return {
      ok: false,
      reason: "cutoff",
      deadline,
      message: `Free cancellation ended on ${formatLocalDateTime(deadline)}.`,
    };
  }
  return {
    ok: true,
    deadline,
    message: `Free cancellation until ${formatLocalDateTime(deadline)}.`,
  };
}
