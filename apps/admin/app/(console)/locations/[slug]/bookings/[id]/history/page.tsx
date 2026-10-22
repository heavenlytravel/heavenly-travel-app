import { RecordHistorySkeleton } from "../../../../../../_components/RecordHistory";
import { Streamed } from "../../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { bookingHistory } from "../../../../../bookings/[id]/BookingHistory";
import { locationKey } from "../../../../_lib/location-data";

/** Route: /locations/[slug]/bookings/[id]/history. One booking's history, inside the location it picks up in. */
export default async function LocationBookingHistoryPage({
  params,
}: PageProps<"/locations/[slug]/bookings/[id]/history">) {
  await requireAdmin("bookings.view");
  const { slug, id: bookingId } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {() => bookingHistory({ id: bookingId, place: { id, slug } })}
    </Streamed>
  );
}
