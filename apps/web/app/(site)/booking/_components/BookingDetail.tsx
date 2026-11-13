import type { ReactNode } from "react";
import {
  bookingLabelOf,
  formatLocalDate,
  formatLocalDateTime,
  formatMyr,
  itemHeading,
  tripDetailRows,
  tripViewOfItem,
  type CustomerChange,
} from "@repo/db";
import type { BookingItemWithDetails, BookingWithItems } from "@repo/db/server";
import {
  BookingStatusBadge,
  ItemStatusBadge,
} from "@repo/console/StatusBadges";
import { Rows } from "@repo/ui/rows";
import { Panel } from "../../_components/Page";
import { TripSummary } from "./TripSummary";

/** One line under the title, per booking status, as the customer reads it. */
export const BOOKING_STATUS_LINES: Record<string, string> = {
  received: "We have your request and will confirm it shortly by email.",
  confirmed: "Your booking is confirmed. See you at pick-up.",
  completed: "This trip is done. Thank you for travelling with us.",
  cancelled: "This booking was cancelled.",
};

/**
 * A booking as the customer sees it, on the success page and under My
 * bookings: each item's trip on the left, the booking number, contact,
 * status, charges and total on the right, followed by whatever the page
 * wants to offer (a way home, a cancel button), and the changes made
 * since it was booked: when, what, by how much and the new total, never
 * why. A booking of several trips numbers them as they were booked, each
 * with its own status, and `tripAside` adds to each, such as its own
 * cancel button.
 */
export function BookingDetail({
  booking,
  changes = [],
  aside,
  tripAside,
}: {
  booking: BookingWithItems;
  /** The changes since it was booked, oldest first (`customerChangesOf`). */
  changes?: readonly CustomerChange[];
  aside?: ReactNode;
  tripAside?: (item: BookingItemWithDetails) => ReactNode;
}) {
  const trips = booking.items.flatMap((item) => {
    const trip = tripViewOfItem(item);
    return trip ? [{ item, trip }] : [];
  });
  const several = trips.length > 1;

  const rows: [string, ReactNode][] = [
    ["Booking Number", <strong key="ref">{bookingLabelOf(booking)}</strong>],
    ["Status", <BookingStatusBadge key="status" status={booking.status} />],
    ["Name", booking.contactName],
    ["Phone", booking.contactPhone],
  ];
  for (const charge of booking.charges)
    rows.push([charge.label, formatMyr(charge.amountSen)]);
  rows.push([
    "Total",
    <span key="total" className="text-lg font-bold text-brand">
      {formatMyr(booking.priceTotalSen)}
    </span>,
  ]);
  if (booking.cancelledAt) {
    rows.push(["Cancelled", formatLocalDateTime(booking.cancelledAt)]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="grid gap-6">
        {trips.map(({ item, trip }) => (
          <Panel key={item.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="font-serif text-2xl">
                {several
                  ? `Trip ${item.position} · ${itemHeading(item)}`
                  : itemHeading(item)}
              </h2>
              {several ? <ItemStatusBadge status={item.status} /> : null}
            </div>
            <TripSummary
              trip={trip}
              extra={item.tripDetails ? tripDetailRows(item.tripDetails) : []}
            />
            {tripAside?.(item)}
          </Panel>
        ))}
        {changes.length > 0 ? (
          <Panel>
            <h2 className="mb-3 font-serif text-2xl">Changes</h2>
            <ol className="grid gap-3">
              {changes.map((change, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-body">{change.summary}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {change.differenceSen === 0
                      ? "No change"
                      : `${change.differenceSen > 0 ? "+" : "−"}${formatMyr(Math.abs(change.differenceSen))}`}
                  </span>
                  <span className="text-caption text-muted">
                    {formatLocalDate(change.at)}
                  </span>
                  <span className="text-right text-caption text-muted tabular-nums">
                    New Total {formatMyr(change.totalSen)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </div>
      <Panel>
        <Rows rows={rows} />
        {aside}
      </Panel>
    </div>
  );
}
