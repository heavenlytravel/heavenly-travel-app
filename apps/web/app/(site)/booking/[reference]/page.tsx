import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, primaryButton, textLink } from "../../_components/Page";
import { ACCOUNT_BOOKINGS_PATH, bookingHref } from "../../../_lib/routes";
import {
  BOOKING_STATUS_LINES,
  BookingDetail,
} from "../_components/BookingDetail";
import { requireOwnBooking } from "../_lib/own-booking";

export const metadata: Metadata = {
  title: "Your booking | Heavenly Travel",
};

/**
 * Route: /booking/HT-7K3QZM
 * The page a customer lands on after booking, and the link in their emails.
 * Owner only. Managing the booking happens under My bookings.
 */
export default async function BookingPage({
  params,
}: PageProps<"/booking/[reference]">) {
  const { reference } = await params;
  const booking = await requireOwnBooking(reference, bookingHref);

  return (
    <>
      <PageTitle
        eyebrow={`Booking ${booking.reference}`}
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
        aside={
          <>
            <p className="mt-4 text-[0.85rem] text-[#67726f]">
              Keep this reference. Quote it when you contact us about the trip.
            </p>
            <Link href="/" className={`${primaryButton} mt-6 w-full`}>
              Back to Heavenly Travel
            </Link>
            <p className="mt-4 text-center text-[0.9rem]">
              <Link href={ACCOUNT_BOOKINGS_PATH} className={textLink}>
                See all your bookings
              </Link>
            </p>
          </>
        }
      />
    </>
  );
}
