import type { ReactNode } from "react";
import { formatLocalDateTime, formatMyr } from "@repo/db";
import type { BookingWithItems } from "@repo/db/server";
import { Panel, Rows } from "../../_components/Page";
import { StatusBadge } from "./StatusBadge";
import { TripSummary, carDetailRows, tripViewOfItem } from "./TripSummary";

/** One line under the title, per booking status, as the customer reads it. */
export const BOOKING_STATUS_LINES: Record<string, string> = {
  received: "We have your request and will confirm it shortly by email.",
  confirmed: "Your booking is confirmed. See you at pick-up.",
  completed: "This trip is done. Thank you for travelling with us.",
  cancelled: "This booking was cancelled.",
};

/**
 * A booking as the customer sees it, on the success page and under My
 * bookings: each item's trip on the left, the reference, contact, status
 * and total on the right, followed by whatever the page wants to offer
 * (a way home, a cancel button).
 */
export function BookingDetail({
  booking,
  aside,
}: {
  booking: BookingWithItems;
  aside?: ReactNode;
}) {
  const trips = booking.items.flatMap((item) => {
    const trip = tripViewOfItem(item);
    return trip ? [{ item, trip }] : [];
  });

  const rows: [string, ReactNode][] = [
    ["Reference", <strong key="ref">{booking.reference}</strong>],
    ["Status", <StatusBadge key="status" status={booking.status} />],
    ["Name", booking.contactName],
    ["Phone", booking.contactPhone],
  ];
  if (booking.status === "cancelled") {
    // The stored total is the sum of live items, so it is zero here and
    // would read as a refund. The cancellation time says more.
    if (booking.cancelledAt) {
      rows.push(["Cancelled", formatLocalDateTime(booking.cancelledAt)]);
    }
  } else {
    rows.push([
      "Total",
      <span key="total" className="text-[1.15rem] font-bold text-[#073c36]">
        {formatMyr(booking.priceTotalSen)}
      </span>,
    ]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="grid gap-6">
        {trips.map(({ item, trip }) => (
          <Panel key={item.id}>
            <h2 className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
              Car with driver
            </h2>
            <TripSummary
              trip={trip}
              extra={item.carDetails ? carDetailRows(item.carDetails) : []}
            />
          </Panel>
        ))}
      </div>
      <Panel>
        <Rows rows={rows} />
        {aside}
      </Panel>
    </div>
  );
}
