import type { Metadata } from "next";
import Link from "next/link";
import { checkCustomerCancel } from "@repo/db";
import { PageTitle, textLink } from "../../../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
} from "../../../_lib/routes";
import {
  BOOKING_STATUS_LINES,
  BookingDetail,
} from "../../../booking/_components/BookingDetail";
import { requireOwnBooking } from "../../../booking/_lib/own-booking";
import { CancelBooking } from "./CancelBooking";

export const metadata: Metadata = {
  title: "Booking | Heavenly Travel",
};

/**
 * Route: /account/bookings/HT-7K3QZM
 * One booking under My bookings, with the customer's cancel action. The
 * button is offered while the booking is received or confirmed; inside
 * the cutoff it shows disabled with the reason; afterwards it is gone.
 */
export default async function AccountBookingPage({
  params,
}: PageProps<"/account/bookings/[reference]">) {
  const { reference } = await params;
  const booking = await requireOwnBooking(reference, accountBookingHref);
  const cancel = checkCustomerCancel(booking);

  return (
    <>
      <p className="mb-6 text-[0.9rem]">
        <Link href={ACCOUNT_BOOKINGS_PATH} className={textLink}>
          All bookings
        </Link>
      </p>
      <PageTitle eyebrow="My bookings" title={booking.reference}>
        {BOOKING_STATUS_LINES[booking.status]}
      </PageTitle>
      <BookingDetail
        booking={booking}
        aside={
          cancel.ok || cancel.reason === "cutoff" ? (
            <div className="mt-6">
              <CancelBooking
                reference={booking.reference}
                blocked={cancel.ok ? null : cancel.message}
              />
            </div>
          ) : null
        }
      />
    </>
  );
}
