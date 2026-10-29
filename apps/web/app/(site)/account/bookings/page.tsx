import type { Metadata } from "next";
import Link from "next/link";
import {
  formatLocalDateTime,
  formatMyr,
  isLive,
  itemSummary,
  tripHeadline,
  tripViewOfItem,
} from "@repo/db";
import { getAccess, listBookingsForUser } from "@repo/db/server";
import { BookingStatusBadge } from "@repo/console/StatusBadges";
import { redirect } from "next/navigation";
import { PageTitle, Stop, panel } from "../../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  accountBookingHref,
  signInHref,
} from "../../../_lib/routes";

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
        Every booking you have made with us, newest first.
      </PageTitle>
      {bookings.length === 0 ? (
        <Stop
          title="No bookings yet"
          message="Your bookings will appear here once you have made one."
          linkLabel="Book a trip"
        />
      ) : (
        <ul className="grid gap-4">
          {bookings.map((booking) => {
            const trips = booking.items.flatMap((item) => {
              const trip = tripViewOfItem(item);
              return trip ? [{ item, trip }] : [];
            });
            return (
              <li key={booking.id}>
                <Link
                  href={accountBookingHref(booking.reference)}
                  className={`${panel} block transition-shadow hover:shadow-raised focus-ring`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-serif text-xl">
                      {booking.reference}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-copy sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      {trips.map(({ item, trip }) => {
                        // A trip cancelled from a booking that lives on.
                        const dropped =
                          !isLive(item) && booking.status !== "cancelled";
                        return (
                          <div key={item.id} className="[&+&]:mt-2">
                            <p
                              className={`font-medium ${dropped ? "text-muted line-through" : ""}`}
                            >
                              {tripHeadline(trip)}
                            </p>
                            <p className="text-muted">
                              {itemSummary(item)} · Pick-up{" "}
                              {formatLocalDateTime(item.startsAt)}
                              {dropped ? " · Cancelled" : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="font-bold text-brand">
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
