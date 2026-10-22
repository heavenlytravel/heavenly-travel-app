import { formatLocalDate, formatLocalTime, searchTermOf } from "@repo/db";
import { listBookings } from "@repo/db/server";
import { getAdmin } from "../../../_lib/access";
import { FORBIDDEN_MESSAGE } from "../../../_lib/action-state";
import { bookingLocations } from "../../../_lib/booking-locations";
import {
  BOOKING_SEARCH_LIMIT,
  type BookingSearchResponse,
} from "../../../_lib/booking-search";
import { SEARCH_PARAM, bookingHref } from "../../../_lib/routes";

/**
 * GET /api/bookings/search?q=…: the bookings the console header's search
 * lists as the admin types, newest first, across every location whatever
 * the picker is on, so a caller's booking is found from anywhere. The
 * search is the Bookings list's own: part of the reference, or of the
 * customer's name, phone or email. Each opens inside the location it
 * picks up in; one across two opens on its own page. For an admin who may
 * open the bookings.
 */
export async function GET(request: Request) {
  if (!(await getAdmin("bookings.view"))) {
    return Response.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }
  const search = searchTermOf(
    new URL(request.url).searchParams.get(SEARCH_PARAM),
  );
  if (!search) {
    return Response.json({ matches: [] } satisfies BookingSearchResponse);
  }
  const bookings = await listBookings(
    { search },
    { take: BOOKING_SEARCH_LIMIT },
  );
  return Response.json({
    matches: bookings.map((booking) => {
      const locations = bookingLocations(booking);
      return {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        customer: booking.contactName,
        locations: locations.map((location) => location.name).join(", "),
        pickup: `${formatLocalDate(booking.startsAt)}, ${formatLocalTime(booking.startsAt)}`,
        href: bookingHref(
          booking.id,
          locations.length === 1 ? locations[0]!.slug : undefined,
        ),
      };
    }),
  } satisfies BookingSearchResponse);
}
