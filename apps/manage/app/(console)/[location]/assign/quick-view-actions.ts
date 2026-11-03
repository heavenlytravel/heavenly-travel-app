"use server";

import {
  bookingLabelOf,
  BOOKING_STATUS_LABELS,
  formatMyr,
  isBookingStatus,
  ITEM_STATUS_LABELS,
  isItemStatus,
  itemSummary,
  tripDetailRows,
  tripRows,
  tripViewOfItem,
} from "@repo/db";
import { getBooking } from "@repo/db/server";
import { getAdmin } from "../../../_lib/access";

/** A booking at a glance, as Assign's quick view shows it. Plain data. */
export type BookingQuickView = {
  id: string;
  reference: string;
  status: string;
  customer: { name: string; phone: string; email: string | null };
  total: string;
  trips: {
    id: string;
    position: number;
    heading: string;
    status: string;
    /** The trip and what was chosen, label and value, as the booking page reads them. */
    rows: [string, string][];
  }[];
};

/**
 * The booking behind a trip under Assign, for its quick view: the
 * customer, each trip and the total. For Operation (`bookings.fulfil`),
 * who works the page. Null when the booking is gone or the admin may not.
 */
export async function loadBookingQuickView(
  bookingId: unknown,
): Promise<BookingQuickView | null> {
  const admin = await getAdmin("bookings.fulfil");
  if (!admin || typeof bookingId !== "string" || !bookingId) return null;
  const booking = await getBooking(bookingId);
  if (!booking) return null;
  return {
    id: booking.id,
    reference: bookingLabelOf(booking),
    status: isBookingStatus(booking.status)
      ? BOOKING_STATUS_LABELS[booking.status]
      : booking.status,
    customer: {
      name: booking.contactName,
      phone: booking.contactPhone,
      email: booking.contactEmail,
    },
    total: formatMyr(booking.priceTotalSen),
    trips: booking.items.map((item) => {
      const trip = tripViewOfItem(item);
      const rows: [string, string][] = trip
        ? tripRows(trip).map(([label, value]) => [
            label,
            typeof value === "string" ? value : value.label,
          ])
        : [];
      if (item.tripDetails) rows.push(...tripDetailRows(item.tripDetails));
      return {
        id: item.id,
        position: item.position,
        heading: itemSummary(item),
        status: isItemStatus(item.status)
          ? ITEM_STATUS_LABELS[item.status]
          : item.status,
        rows,
      };
    }),
  };
}
