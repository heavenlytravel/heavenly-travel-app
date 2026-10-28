import { RecordHistorySkeleton } from "../../../../_components/RecordHistory";
import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { bookingHistory } from "../BookingHistory";

/** Route: /bookings/[id]/history. One booking's history, opened from the booking across locations. */
export default async function BookingHistoryPage({
  params,
}: PageProps<"/bookings/[id]/history">) {
  await requireAdmin("bookings.view");
  const { id } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {() => bookingHistory({ id, place: null })}
    </Streamed>
  );
}
