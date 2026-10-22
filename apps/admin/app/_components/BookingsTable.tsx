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
import { bookingHref } from "../_lib/routes";
import { BookingStatusBadge } from "./StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "./Table";

/** "Langkawi", or "Langkawi, Penang" for a booking whose items pick up in two. */
function locationsOf(booking: BookingWithItems) {
  const names = [
    ...new Set(
      booking.items.flatMap((item) =>
        item.location ? [item.location.name] : [],
      ),
    ),
  ];
  return names.join(", ");
}

/**
 * The bookings table, shared by the queue across locations and a location's
 * own lists. `showLocation` adds the column the queue needs and a
 * location's list does not; a location's list gives its `locationSlug`,
 * so a booking opens inside the location. `bare` is for the table inside
 * a `flush` card.
 */
export function BookingsTable({
  bookings,
  showLocation = false,
  locationSlug,
  bare = false,
  emptyMessage,
}: {
  bookings: BookingWithItems[];
  showLocation?: boolean;
  /** The location whose list this is; absent in the queue across locations. */
  locationSlug?: string;
  bare?: boolean;
  emptyMessage: string;
}) {
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
                    href={bookingHref(booking.id, locationSlug)}
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
                  <span className="block max-w-48 truncate text-xs text-slate-500">
                    {customerEmailOf(booking) ?? booking.contactPhone}
                  </span>
                </Td>
                <Td className="min-w-48 text-slate-600">
                  {trips.map(({ item, trip }) => (
                    <span key={item.id} className="block">
                      {tripHeadline(trip)}
                      <span className="block text-xs text-slate-500">
                        {itemSummary(item)}
                      </span>
                    </span>
                  ))}
                </Td>
                {showLocation ? (
                  <Td className="whitespace-nowrap text-slate-600">
                    {locationsOf(booking) || (
                      <span className="text-slate-500">—</span>
                    )}
                  </Td>
                ) : null}
                <Td className="whitespace-nowrap text-slate-600 tabular-nums">
                  <span className="block">
                    {formatLocalDate(booking.startsAt)}
                  </span>
                  <span className="block text-xs text-slate-500">
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
