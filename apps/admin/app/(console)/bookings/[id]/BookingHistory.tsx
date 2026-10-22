import { getBooking, listActivityFor } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { RecordHistory } from "../../../_components/RecordHistory";
import { bookingHref, recordHistoryHref } from "../../../_lib/routes";
import type { BookingPlace } from "./BookingScreen";

/**
 * One booking's history, from the "History" in its header: every action on
 * it, the customer's and the system's too, newest first. From the queue it
 * is the page's own; inside a location, under the location's header, and
 * its way back stays in the location. A booking with no item picking up in
 * that location opens from the queue instead, as the booking does.
 */
export async function bookingHistory({
  id,
  place,
}: {
  id: string;
  place: BookingPlace;
}) {
  const [booking, entries] = await Promise.all([
    getBooking(id),
    listActivityFor("booking", id),
  ]);
  if (!booking) notFound();
  if (place && !booking.items.some((item) => item.locationId === place.id)) {
    redirect(recordHistoryHref(bookingHref(booking.id)));
  }
  return (
    <RecordHistory
      level={place ? 2 : 1}
      back={{
        href: bookingHref(booking.id, place?.slug),
        label: booking.reference,
      }}
      description={`Every action on ${booking.reference}, newest first: who took it and when.`}
      entries={entries}
      emptyMessage="No activity recorded. This booking predates the log."
    />
  );
}
