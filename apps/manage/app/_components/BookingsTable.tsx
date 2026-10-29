import Link from "next/link";
import {
  customerEmailOf,
  formatLocalDate,
  formatLocalTime,
  formatMyr,
  itemSummary,
  tripHeadline,
  tripViewOfItem,
} from "@repo/db";
import type { BookingWithItems } from "@repo/db/server";
import { bookingLocations } from "../_lib/booking-locations";
import { bookingHref, type ScopeSlug } from "../_lib/routes";
import { BookingStatusBadge } from "@repo/console/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "@repo/console/Table";

/** "Langkawi", or "Langkawi, Penang" for a booking whose items pick up in two. */
function locationsOf(booking: BookingWithItems) {
  return bookingLocations(booking)
    .map((location) => location.name)
    .join(", ");
}

/**
 * The bookings table, in the scope on screen: under `~` it has the
 * column of locations, and a booking opens in the scope it was listed in.
 * `bare` is for the table inside a `flush` card.
 */
export function BookingsTable({
  bookings,
  scope,
  bare = false,
  emptyMessage,
}: {
  bookings: BookingWithItems[];
  scope: ScopeSlug;
  bare?: boolean;
  emptyMessage: string;
}) {
  const showLocation = scope === null;
  const columns = showLocation ? 6 : 5;
  return (
    <Table bare={bare}>
      <THead>
        <Th>Booking</Th>
        <Th>Customer</Th>
        <Th>Trip</Th>
        {showLocation ? <Th>Location</Th> : null}
        <Th>Pick-up</Th>
        <Th align="right">Total</Th>
      </THead>
      <TBody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          bookings.map((booking) => {
            const trips = booking.items.flatMap((item) => {
              const trip = tripViewOfItem(item);
              return trip ? [{ item, trip }] : [];
            });
            return (
              <tr key={booking.id}>
                <Td className="font-medium whitespace-nowrap tabular-nums">
                  <Link
                    href={bookingHref(scope, booking.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {booking.reference}
                  </Link>
                  <span className="mt-1 block">
                    <BookingStatusBadge status={booking.status} />
                  </span>
                </Td>
                <Td>
                  <span className="block">{booking.contactName}</span>
                  <span className="block max-w-48 truncate text-xs text-muted">
                    {customerEmailOf(booking) ?? booking.contactPhone}
                  </span>
                </Td>
                <Td className="min-w-48 text-body">
                  {trips.map(({ item, trip }) => (
                    <span key={item.id} className="block">
                      {tripHeadline(trip)}
                      <span className="block text-xs text-muted">
                        {itemSummary(item)}
                      </span>
                    </span>
                  ))}
                </Td>
                {showLocation ? (
                  <Td className="whitespace-nowrap text-body">
                    {locationsOf(booking) || (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                ) : null}
                <Td className="whitespace-nowrap text-body tabular-nums">
                  <span className="block">
                    {formatLocalDate(booking.startsAt)}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatLocalTime(booking.startsAt)}
                  </span>
                </Td>
                <Td className="text-right font-medium whitespace-nowrap tabular-nums">
                  {formatMyr(booking.priceTotalSen)}
                </Td>
              </tr>
            );
          })
        )}
      </TBody>
    </Table>
  );
}
