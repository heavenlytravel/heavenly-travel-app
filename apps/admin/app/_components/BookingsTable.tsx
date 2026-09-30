import Link from "next/link";
import {
  customerEmailOf,
  formatLocalDateTime,
  formatMyr,
  itemSummary,
  tripHeadline,
  tripViewOfItem,
} from "@repo/db";
import type { BookingWithItems } from "@repo/db/server";
import { bookingHref } from "../_lib/routes";
import { BookingStatusBadge } from "./StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "./Table";

/** The bookings table, shared by the dashboard and the bookings list. */
export function BookingsTable({
  bookings,
  emptyMessage,
}: {
  bookings: BookingWithItems[];
  emptyMessage: string;
}) {
  return (
    <Table>
      <THead>
        <Th>Ref</Th>
        <Th>Customer</Th>
        <Th>Trip</Th>
        <Th>Pick-up</Th>
        <Th align="right">Total</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={6}>{emptyMessage}</EmptyRow>
        ) : (
          bookings.map((booking) => {
            const trips = booking.items.flatMap((item) => {
              const trip = tripViewOfItem(item);
              return trip ? [{ item, trip }] : [];
            });
            return (
              <tr key={booking.id}>
                <Td className="font-medium tabular-nums">
                  <Link
                    href={bookingHref(booking.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {booking.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block">{booking.contactName}</span>
                  <span className="block text-xs text-neutral-500">
                    {customerEmailOf(booking) ?? booking.contactPhone}
                  </span>
                </Td>
                <Td className="text-neutral-600">
                  {trips.map(({ item, trip }) => (
                    <span key={item.id} className="block">
                      {tripHeadline(trip)}
                      <span className="block text-xs text-neutral-500">
                        {itemSummary(item)}
                      </span>
                    </span>
                  ))}
                </Td>
                <Td className="text-neutral-600 tabular-nums">
                  {formatLocalDateTime(booking.startsAt)}
                </Td>
                <Td className="text-right font-medium tabular-nums">
                  {formatMyr(booking.priceTotalSen)}
                </Td>
                <Td>
                  <BookingStatusBadge status={booking.status} />
                </Td>
              </tr>
            );
          })
        )}
      </TBody>
    </Table>
  );
}
