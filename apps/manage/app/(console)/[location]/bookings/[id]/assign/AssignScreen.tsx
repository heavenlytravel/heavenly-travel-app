import { rolesToAsk } from "@repo/db";
import { getBookingFulfilment } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card } from "@repo/console/Card";
import { PageHeader, RecordLink } from "@repo/console/PageHeader";
import { FormSkeleton, HeaderSkeleton } from "@repo/console/Skeleton";
import { bookingHref } from "../../../../../_lib/routes";
import type { ConsoleScope } from "../../../../../_lib/scope";
import { scopedBooking } from "../../_lib/scoped-booking";
import { loadAssignChoices } from "../fulfil-actions";
import { AssignForm, type AssignTrip } from "./AssignForm";

/** What stands where the page is loading: the header and the form. */
export function AssignSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <FormSkeleton fields={6} />
    </>
  );
}

/**
 * A booking's trips still to assign, each with the roles it still needs,
 * and the vehicles, drivers and vendors to choose from; or why there is
 * nothing to assign. In a location, a booking with no trip picking up
 * there is not found.
 */
export async function assignScreen({
  id,
  scope,
}: {
  id: string;
  scope: ConsoleScope;
}) {
  const [booking, fulfilment, choices] = await Promise.all([
    scopedBooking(id, scope),
    getBookingFulfilment(id),
    loadAssignChoices(id),
  ]);
  if (!choices) notFound();
  const back = bookingHref(scope.slug, booking.id);
  const header = (
    <PageHeader
      title="Assign"
      meta={<RecordLink href={back}>{booking.reference}</RecordLink>}
    />
  );

  const trips = fulfilment.flatMap((trip): AssignTrip[] => {
    const roles = rolesToAsk(trip);
    if (roles.length === 0) return [];
    const { pickup, dropoff } = trip.job;
    return [
      {
        id: trip.id,
        position: trip.position,
        startsAt: trip.startsAt,
        route: dropoff ? `${pickup.label} → ${dropoff.label}` : pickup.label,
        roles,
      },
    ];
  });

  if (trips.length === 0) {
    const received = fulfilment.some((t) => t.status === "received");
    return (
      <>
        {header}
        <Card>
          <p className="text-sm text-body">
            {received
              ? "Nothing to assign yet: a trip is assigned once it is confirmed."
              : "Every trip has its vehicle and driver asked for. Release one on the booking to ask again."}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      <AssignForm
        bookingId={booking.id}
        back={back}
        trips={trips}
        choices={choices}
      />
    </>
  );
}
