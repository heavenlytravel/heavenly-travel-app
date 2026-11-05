import { bookingLabelOf, entriesSeenBy } from "@repo/db";
import { listActivityFor } from "@repo/db/server";
import { Streamed } from "@repo/console/Skeleton";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../_components/RecordHistory";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import { bookingHref } from "../../../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../../../_lib/scope";
import { scopedBooking } from "../../_lib/scoped-booking";

/**
 * Route: /[location]/bookings/[id]/history. One booking's history, from
 * "History" in its header: every action on it, the customer's and the
 * system's too, newest first, of the areas the admin holds (a driver's
 * look at the customer's details is SUPER's, as on Activity). Opens
 * wherever the booking does; under a location no trip picks up in, it is
 * not found.
 */
export default async function BookingHistoryPage({
  params,
}: PageProps<"/[location]/bookings/[id]/history">) {
  await requireAdmin("bookings.view");
  const scope = await scopeOf(params);
  const { id } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {() => bookingHistory(id, scope)}
    </Streamed>
  );
}

async function bookingHistory(id: string, scope: ConsoleScope) {
  const [booking, entries, permissions] = await Promise.all([
    scopedBooking(id, scope),
    listActivityFor("booking", id),
    getPermissions(),
  ]);
  return (
    <RecordHistory
      record={{
        href: bookingHref(scope.slug, booking.id),
        label: bookingLabelOf(booking),
      }}
      entries={entriesSeenBy(entries, permissions)}
      emptyMessage="No activity recorded. This booking predates the log."
    />
  );
}
