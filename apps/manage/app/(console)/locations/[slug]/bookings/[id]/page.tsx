import Link from "next/link";
import { Streamed } from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationBookingsHref } from "../../../../../_lib/routes";
import {
  BookingSkeleton,
  bookingScreen,
} from "../../../../bookings/[id]/BookingScreen";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/bookings/[id]. One booking inside the location
 * it picks up in, as the location's overview and its Bookings tab open
 * it: the location's header above it and its sections in the sidebar,
 * Bookings marked, and the way back to the location's bookings. The same booking
 * as /bookings/[id], behind the same `bookings.view`. See
 * docs/261018-location-work-and-class-catalogue.md.
 */
export default async function LocationBookingPage({
  params,
}: PageProps<"/locations/[slug]/bookings/[id]">) {
  await requireAdmin("bookings.view");
  const { slug, id: bookingId } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationBookingsHref(slug)}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All bookings here
        </Link>
      </p>
      <Streamed fallback={<BookingSkeleton />}>
        {() => bookingScreen({ id: bookingId, place: { id, slug } })}
      </Streamed>
    </>
  );
}
