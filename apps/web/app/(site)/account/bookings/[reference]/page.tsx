import type { Metadata } from "next";
import Link from "next/link";
import { checkCustomerCancel, checkCustomerTripCancel, isLive } from "@repo/db";
import { PageTitle } from "../../../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
} from "../../../../_lib/routes";
import {
  BOOKING_STATUS_LINES,
  BookingDetail,
} from "../../../booking/_components/BookingDetail";
import { requireOwnBooking } from "../../../booking/_lib/own-booking";
import { CancelBooking, CancelTrip } from "./CancelBooking";

export const metadata: Metadata = {
  title: "Booking | Heavenly Travel",
};

/**
 * Route: /account/bookings/HT-7K3QZM
 * One booking under My bookings, with the customer's cancel actions. The
 * booking's button is offered while it is received or confirmed, with the
 * deadline as a date under it; past the deadline it shows disabled with
 * the date it ended; afterwards it is gone. A booking with more than one
 * trip still to do also offers a cancel on each, under its own deadline,
 * the same way; the last one is the booking's own button.
 */
export default async function AccountBookingPage({
  params,
}: PageProps<"/account/bookings/[reference]">) {
  const { reference } = await params;
  const booking = await requireOwnBooking(reference, accountBookingHref);
  const cancel = checkCustomerCancel(booking);
  const severalLive = booking.items.filter(isLive).length > 1;

  return (
    <>
      <p className="mb-6 text-copy">
        <Link href={ACCOUNT_BOOKINGS_PATH} className="text-link">
          All bookings
        </Link>
      </p>
      <PageTitle eyebrow="My bookings" title={booking.reference}>
        {BOOKING_STATUS_LINES[booking.status]}
      </PageTitle>
      <BookingDetail
        booking={booking}
        tripAside={(item) => {
          if (!severalLive) return null;
          const trip = checkCustomerTripCancel(item);
          return trip.ok || trip.reason === "cutoff" ? (
            <div className="mt-5 sm:max-w-[320px]">
              <CancelTrip
                reference={booking.reference}
                itemId={item.id}
                position={item.position}
                blocked={!trip.ok}
                hint={trip.message}
              />
            </div>
          ) : null;
        }}
        aside={
          cancel.ok || cancel.reason === "cutoff" ? (
            <div className="mt-6">
              <CancelBooking
                reference={booking.reference}
                blocked={!cancel.ok}
                hint={cancel.message}
              />
            </div>
          ) : null
        }
      />
    </>
  );
}
