import type { Metadata } from "next";
import Link from "next/link";
import { formatMyr, isReference, normalizeReference } from "@repo/db";
import { getAccess, getBookingForUser } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { PageTitle, Panel, Rows, primaryButton } from "../_components/Page";
import {
  TripSummary,
  carDetailRows,
  tripViewOfItem,
} from "../_components/TripSummary";

export const metadata: Metadata = {
  title: "Your booking | Heavenly Travel",
};

const STATUS_LINE: Record<string, string> = {
  received: "We have your request and will confirm it shortly by email.",
  confirmed: "Your booking is confirmed. See you at pick-up.",
  completed: "This trip is done. Thank you for travelling with us.",
  cancelled: "This booking was cancelled.",
};

/**
 * Route: /booking/HT-7K3QZM
 * The page a customer lands on after booking, and the link in their emails.
 * Owner only: anyone else, signed in or not, gets a 404 rather than a hint
 * that the reference exists.
 */
export default async function BookingPage({
  params,
}: PageProps<"/booking/[reference]">) {
  const { reference: raw } = await params;
  const reference = normalizeReference(raw);
  if (!isReference(reference)) notFound();

  const access = await getAccess("user");
  if (access.status === "signed-out") {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/booking/${reference}`)}`,
    );
  }

  const booking = await getBookingForUser(reference, access.user.id);
  if (!booking) notFound();

  const trips = booking.items.flatMap((item) => {
    const trip = tripViewOfItem(item);
    return trip ? [{ item, trip }] : [];
  });

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
        {STATUS_LINE[booking.status]}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-6">
          {trips.map(({ item, trip }) => (
            <Panel key={item.id}>
              <h2 className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
                Car with driver
              </h2>
              <TripSummary
                trip={trip}
                extra={[
                  ...(item.carDetails ? carDetailRows(item.carDetails) : []),
                  ["Status", item.status],
                ]}
              />
            </Panel>
          ))}
        </div>
        <Panel>
          <Rows
            rows={[
              ["Reference", <strong key="ref">{booking.reference}</strong>],
              ["Name", booking.contactName],
              ["Phone", booking.contactPhone],
              [
                "Total",
                <span
                  key="total"
                  className="text-[1.15rem] font-bold text-[#073c36]"
                >
                  {formatMyr(booking.priceTotalSen)}
                </span>,
              ],
            ]}
          />
          <p className="mt-4 text-[0.85rem] text-[#67726f]">
            Keep this reference. Quote it when you contact us about the trip.
          </p>
          <Link href="/" className={`${primaryButton} mt-6 w-full`}>
            Back to Heavenly Travel
          </Link>
        </Panel>
      </div>
    </>
  );
}
