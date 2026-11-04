import { bookingLabelOf, BOOKING_RULES, isTripCategory } from "@repo/db";
import { hasGooglePlaces } from "@repo/places/server";
import { InfoTip } from "@repo/ui/info-tip";
import { Card } from "@repo/console/Card";
import { PageHeader, RecordLink } from "@repo/console/PageHeader";
import { FormSkeleton, HeaderSkeleton } from "@repo/console/Skeleton";
import { getPermissions } from "../../../../../_lib/access";
import { bookingHref } from "../../../../../_lib/routes";
import type { ConsoleScope } from "../../../../../_lib/scope";
import { TripItemForm } from "../../_components/TripItemForm";
import { scopedBooking } from "../../_lib/scoped-booking";
import { newItemDraft, newTripDraft } from "../../_lib/trip-form";
import { addTripAction } from "../actions";

/** What stands where the booking is loading: the header and the form. */
export function AddTripSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <FormSkeleton fields={6} />
    </>
  );
}

/**
 * One more trip for a booking, blank but for the category of its last
 * trip, in the manual booking's steps; or why the booking takes no more:
 * cancelled, or holding the most trips a booking may. In a location, a
 * booking with no trip picking up there is not found.
 */
export async function addTripScreen({
  id,
  scope,
}: {
  id: string;
  scope: ConsoleScope;
}) {
  const [booking, permissions] = await Promise.all([
    scopedBooking(id, scope),
    getPermissions(),
  ]);
  const back = bookingHref(scope.slug, booking.id);
  const title = `Add Trip ${booking.items.length + 1}`;
  const meta = <RecordLink href={back}>{bookingLabelOf(booking)}</RecordLink>;

  const full = booking.items.length >= BOOKING_RULES.maxTripsPerBooking;
  if (booking.status === "cancelled" || full) {
    return (
      <>
        <PageHeader title={title} meta={meta} />
        <Card>
          <p className="text-sm text-body">
            {full
              ? `This booking holds ${BOOKING_RULES.maxTripsPerBooking} trips, the most a booking takes. Enter the next as a booking of its own.`
              : "This booking is cancelled, so it takes no more trips. Enter a new booking."}
          </p>
        </Card>
      </>
    );
  }

  const category = booking.items.at(-1)?.tripDetails?.vehicleClassCategory;
  const draft = {
    ...newItemDraft(),
    trip: newTripDraft(isTripCategory(category) ? category : undefined),
  };

  return (
    <>
      <PageHeader
        title={title}
        meta={meta}
        badge={
          <InfoTip text="The trip is priced with today's rates and joins the booking's invoice. The customer gets a “Booking updated” email." />
        }
      />
      <TripItemForm
        action={addTripAction}
        target={{ name: "bookingId", value: booking.id }}
        done="Trip added. The customer gets a “Booking updated” email."
        bookingHref={back}
        scope={scope.slug}
        draft={draft}
        startOpen
        hasGoogle={hasGooglePlaces}
        canPrice={permissions.includes("bookings.create")}
      />
    </>
  );
}
