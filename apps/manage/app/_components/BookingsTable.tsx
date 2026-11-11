import Link from "next/link";
import {
  bookingLabelOf,
  customerEmailOf,
  documentLabelOf,
  formatLocalDate,
  formatLocalTime,
  formatMyr,
  itemSummary,
  tripAddOns,
  tripHeadline,
  tripViewOfItem,
  nextSortOf,
  sortDirectionOf,
  type BookingOrder,
  type BookingSortColumn,
} from "@repo/db";
import type { BookingWithItems } from "@repo/db/server";
import { bookingLocations } from "../_lib/booking-locations";
import { bookingHref, type ScopeSlug } from "../_lib/routes";
import { BookingStatusBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  SortTh,
  Table,
  TBody,
  Td,
  Th,
  THead,
} from "@repo/console/Table";

/** "Langkawi", or "Langkawi, Penang" for a booking whose items pick up in two. */
function locationsOf(booking: BookingWithItems) {
  return bookingLocations(booking)
    .map((location) => location.name)
    .join(", ");
}

const none = <span className="text-muted">—</span>;

/**
 * The bookings table, in the scope on screen, in the columns Reservation
 * and Finance read it by: the booking's number (HTB-1042) and status,
 * its invoices (HTI numbers, or the legacy one it was billed on outside
 * the system), the agent and the customer, each trip with its add-ons,
 * the pick-up and the total. Where each invoice stands is on Invoices. Under `~` it has the column
 * of locations, and a booking opens in the scope it was listed in.
 * `bare` is for the table inside a `flush` card. With `sort`, the
 * Booking ID heading sorts by when a booking was made and the Pick-up one
 * by when it picks up, each a click the other way.
 */
export function BookingsTable({
  bookings,
  scope,
  bare = false,
  emptyMessage,
  sort,
}: {
  bookings: BookingWithItems[];
  scope: ScopeSlug;
  bare?: boolean;
  emptyMessage: string;
  /** The order in force and the list in another; none for a table that does not sort. */
  sort?: { order: BookingOrder; hrefOf: (order: BookingOrder) => string };
}) {
  const heading = (column: BookingSortColumn, label: string) =>
    sort ? (
      <SortTh
        href={sort.hrefOf(nextSortOf(column, sort.order))}
        direction={sortDirectionOf(column, sort.order)}
      >
        {label}
      </SortTh>
    ) : (
      <Th>{label}</Th>
    );
  const showLocation = scope === null;
  const columns = showLocation ? 9 : 8;
  return (
    <Table bare={bare}>
      <THead>
        {heading("made", "Booking ID")}
        <Th>Invoice No</Th>
        <Th>Agent Name</Th>
        <Th>Customer Name</Th>
        <Th>Trip</Th>
        {showLocation ? <Th>Location</Th> : null}
        <Th>Add On</Th>
        {heading("pickup", "Pick-up")}
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
            const addOns = trips.map(({ item }) =>
              item.tripDetails ? tripAddOns(item.tripDetails) : [],
            );
            return (
              <tr key={booking.id}>
                <Td className="font-medium whitespace-nowrap tabular-nums">
                  <Link
                    href={bookingHref(scope, booking.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {bookingLabelOf(booking)}
                  </Link>
                  <span className="mt-1 block">
                    <BookingStatusBadge status={booking.status} />
                  </span>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {booking.legacyInvoiceNumber ? (
                    <>
                      <span className="block">
                        {booking.legacyInvoiceNumber}
                      </span>
                      <span className="block text-xs text-muted">Legacy</span>
                    </>
                  ) : booking.invoiceLines.length > 0 ? (
                    booking.invoiceLines.map(({ invoice }) => (
                      <span key={invoice.id} className="block">
                        {documentLabelOf(invoice)}
                      </span>
                    ))
                  ) : (
                    none
                  )}
                </Td>
                <Td>
                  {booking.business ? (
                    <>
                      <span className="block">{booking.business.name}</span>
                      <span className="block max-w-48 truncate text-xs text-muted">
                        {booking.business.contactEmail}
                      </span>
                    </>
                  ) : (
                    none
                  )}
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
                <Td className="text-body">
                  {addOns.some((list) => list.length > 0)
                    ? addOns.map((list, index) => (
                        // One line per trip, beside the trip's own.
                        <span key={index} className="block">
                          {list.join(", ") || none}
                        </span>
                      ))
                    : none}
                </Td>
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
