import type { Metadata } from "next";
import Link from "next/link";
import { formatLocalDateTime, formatMyr } from "@repo/db";
import { getAccess, listBookingsForUser } from "@repo/db/server";
import { redirect } from "next/navigation";
import { PageTitle, Stop, focus, panel } from "../../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
  signInHref,
} from "../../../_lib/routes";
import { StatusBadge } from "../../booking/_components/StatusBadge";
import {
  tripHeadline,
  tripViewOfItem,
} from "../../booking/_components/TripSummary";

export const metadata: Metadata = {
  title: "My bookings | Heavenly Travel",
};

/** Route: /account/bookings. The customer's bookings, newest first. */
export default async function BookingsPage() {
  const access = await getAccess("user");
  if (access.status === "signed-out") {
    redirect(signInHref(ACCOUNT_BOOKINGS_PATH));
  }

  const bookings = await listBookingsForUser(access.user.id);

  return (
    <>
      <PageTitle eyebrow="Account" title="My bookings.">
        Every trip you have booked with us, newest first.
      </PageTitle>
      {bookings.length === 0 ? (
        <Stop
          title="No bookings yet"
          message="Your bookings will appear here once you have made one."
          linkLabel="Book a car with driver"
        />
      ) : (
        <ul className="grid gap-4">
          {bookings.map((booking) => {
            const trips = booking.items.flatMap((item) => {
              const trip = tripViewOfItem(item);
              return trip ? [trip] : [];
            });
            return (
              <li key={booking.id}>
                <Link
                  href={accountBookingHref(booking.reference)}
                  className={`${panel} block transition-shadow hover:shadow-[0_16px_40px_rgba(9,43,39,0.14)] ${focus}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-(family-name:--font-display) text-[1.35rem]">
                      {booking.reference}
                    </span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-[0.95rem] sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      {trips.map((trip, index) => (
                        <p key={index} className="font-medium">
                          {tripHeadline(trip)}
                        </p>
                      ))}
                      <p className="text-[#67726f]">
                        Pick-up {formatLocalDateTime(booking.startsAt)}
                      </p>
                    </div>
                    <p className="font-bold text-[#073c36]">
                      {formatMyr(booking.priceTotalSen)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
