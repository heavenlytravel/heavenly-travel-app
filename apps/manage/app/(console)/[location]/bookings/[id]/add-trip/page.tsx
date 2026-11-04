import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { AddTripSkeleton, addTripScreen } from "./AddTripScreen";

/**
 * Route: /[location]/bookings/[id]/add-trip. One more trip for a booking,
 * in the manual booking's steps, priced as New booking prices. Opens
 * under `~` and under any location a trip of the booking picks up in.
 * Reservation and Sales, behind `bookings.manage`.
 */
export default async function AddTripPage({
  params,
}: PageProps<"/[location]/bookings/[id]/add-trip">) {
  await requireAdmin("bookings.manage");
  const scope = await scopeOf(params);
  const { id } = await params;

  return (
    <Streamed fallback={<AddTripSkeleton />}>
      {() => addTripScreen({ id, scope })}
    </Streamed>
  );
}
