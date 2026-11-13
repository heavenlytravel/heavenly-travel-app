import type { Metadata } from "next";
import Link from "next/link";
import { bookingLabelOf, customerChangesOf } from "@repo/db";
import { listRevisions } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PageTitle } from "../../_components/Page";
import { ACCOUNT_BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";
import {
  BOOKING_STATUS_LINES,
  BookingDetail,
} from "../_components/BookingDetail";
import { requireOwnBooking } from "../_lib/own-booking";

export const metadata: Metadata = {
  title: "Your Booking | Heavenly Travel",
};

/**
 * Route: /booking/HTB-1042
 * The page a customer lands on after booking, and the link in their emails.
 * Owner only. Managing the booking happens under My bookings.
 */
export default async function BookingPage({
  params,
}: PageProps<"/booking/[number]">) {
  const { number } = await params;
  const booking = await requireOwnBooking(number, bookingHref);
  const changes = customerChangesOf(await listRevisions(booking.id));

  return (
    <>
      <PageTitle
        eyebrow={`Booking ${bookingLabelOf(booking)}`}
        title={
          booking.status === "received"
            ? "Request received."
            : `Booking ${booking.status}.`
        }
      >
        {BOOKING_STATUS_LINES[booking.status]}
      </PageTitle>
      <BookingDetail
        booking={booking}
        changes={changes}
        aside={
          <>
            <p className="mt-4 text-caption text-muted">
              Keep this booking number. Quote it when you contact us about your
              booking.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/">Back to Heavenly Travel</Link>
            </Button>
            <p className="mt-4 text-center text-copy">
              <Link href={ACCOUNT_BOOKINGS_PATH} className="text-link">
                See All Your Bookings
              </Link>
            </p>
          </>
        }
      />
    </>
  );
}
