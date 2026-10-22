import Link from "next/link";
import { Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { BOOKINGS_PATH } from "../../../_lib/routes";
import { BookingSkeleton, bookingScreen } from "./BookingScreen";

/**
 * Route: /bookings/[id]. One booking, opened from the queue across
 * locations, an email or the activity log. A location's lists open the
 * same booking inside the location, at /locations/[slug]/bookings/[id].
 */
export default async function BookingPage({
  params,
}: PageProps<"/bookings/[id]">) {
  await requireAdmin("bookings.view");
  const { id } = await params;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={BOOKINGS_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All bookings
        </Link>
      </p>
      <Streamed fallback={<BookingSkeleton />}>
        {() => bookingScreen({ id, place: null })}
      </Streamed>
    </>
  );
}
