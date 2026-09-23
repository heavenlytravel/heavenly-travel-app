import Link from "next/link";
import {
  formatLocalDateTime,
  formatMyr,
  tripHeadline,
  tripViewOfItem,
} from "@repo/db";
import type { BookingWithItems } from "@repo/db/server";
import { bookingHref } from "../_lib/routes";
import { BookingStatusBadge } from "./StatusBadges";

/** The bookings table, shared by the dashboard and the bookings list. */
export function BookingsTable({
  bookings,
  emptyMessage,
}: {
  bookings: BookingWithItems[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Ref</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Trip</th>
            <th className="px-4 py-3 font-medium">Pick-up</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {bookings.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-neutral-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            bookings.map((booking) => {
              const headlines = booking.items.flatMap((item) => {
                const trip = tripViewOfItem(item);
                return trip ? [tripHeadline(trip)] : [];
              });
              return (
                <tr key={booking.id}>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    <Link
                      href={bookingHref(booking.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{booking.contactName}</span>
                    <span className="block text-xs text-neutral-500">
                      {booking.user.email}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {headlines.map((headline, index) => (
                      <span key={index} className="block">
                        {headline}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 tabular-nums">
                    {formatLocalDateTime(booking.startsAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatMyr(booking.priceTotalSen)}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
