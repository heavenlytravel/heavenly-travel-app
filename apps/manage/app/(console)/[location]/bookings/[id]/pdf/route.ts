import {
  getBooking,
  getBookingFulfilment,
  getCompanyDetails,
} from "@repo/db/server";
import { bookingPdf } from "../../../../../_pdf/booking-pdf";
import { BOOKING_PDF_STATUSES } from "../../../../../_pdf/statuses";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";

/**
 * Route: /[location]/bookings/[id]/pdf. The booking's PDF, for staff who
 * read bookings, once it is confirmed or completed; under a location only
 * a booking with a trip there, as its page. See ../../../../../_pdf.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[location]/bookings/[id]/pdf">,
) {
  await requireAdmin("bookings.view");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  const booking = await getBooking(id);
  const here =
    booking &&
    (!scope.location ||
      booking.items.some((item) => item.locationId === scope.location!.id));
  if (!booking || !here) {
    return new Response("This booking is not here.", { status: 404 });
  }
  if (!BOOKING_PDF_STATUSES.includes(booking.status)) {
    return new Response(
      "A booking's PDF is made once it is confirmed. Confirm it first.",
      { status: 409 },
    );
  }
  const [trips, company] = await Promise.all([
    getBookingFulfilment(id),
    getCompanyDetails(),
  ]);
  return bookingPdf(booking, trips, company);
}
