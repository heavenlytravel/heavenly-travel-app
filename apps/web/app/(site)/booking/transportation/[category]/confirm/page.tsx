import type { Metadata } from "next";
import { fullName, TRIP_CATEGORY_LABELS, tripDetailRows } from "@repo/db";
import { getAccess, prepareTripItem } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { signInHref } from "../../../../../_lib/routes";
import {
  bookableCategory,
  parseTripOptions,
  parseTripSearch,
  toParams,
  tripBookingHref,
  tripConfirmPath,
  tripSearchParams,
} from "../../../../../_lib/transportation-booking";
import { PageTitle, Panel, Stop } from "../../../../_components/Page";
import { PriceBreakdown } from "../../../_components/PriceBreakdown";
import { TripSummary } from "../../../_components/TripSummary";
import { loadTrip } from "../_lib/trip";
import { ConfirmForm } from "./ConfirmForm";

export const metadata: Metadata = {
  title: "Confirm your booking | Heavenly Travel",
};

/**
 * Route: /booking/transportation/car-with-driver/confirm?mode=…&class=…
 * The last look before the booking exists: the trip, the class, the price
 * and the contact details. Needs a session; a signed-out visitor goes to
 * sign-in with this URL as the return, so the trip is never lost.
 */
export default async function ConfirmPage({
  params,
  searchParams,
}: PageProps<"/booking/transportation/[category]/confirm">) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();
  const query = toParams(await searchParams).toString();

  const access = await getAccess("user");
  if (access.status === "signed-out") {
    redirect(signInHref(`${tripConfirmPath(category)}?${query}`));
  }

  const search = parseTripSearch(query);
  const options = parseTripOptions(query);
  if (!search || !options) {
    return (
      <Stop
        title="Start with a search"
        message="This link is missing part of the trip. Search again and we will price it."
        linkLabel="Search again"
      />
    );
  }
  const back = tripBookingHref(
    category,
    tripSearchParams(search),
    options.passengers,
  );

  const trip = await loadTrip(search);
  if (!trip.ok) return <Stop title={trip.title} message={trip.message} />;

  const prepared = await prepareTripItem(category, {
    ...trip.request,
    ...options,
  });
  if (!prepared.ok) {
    return (
      <Stop
        title="Check your options"
        message={prepared.error.message}
        href={back}
        linkLabel="Back to the options"
      />
    );
  }

  const { user } = access;
  const extra = tripDetailRows({
    ...options,
    vehicleClassName: prepared.vehicleClass.name,
  });

  return (
    <>
      <PageTitle
        eyebrow={TRIP_CATEGORY_LABELS[category]}
        title="Confirm your booking."
      >
        Check the trip, tell us how to reach you, and we will take it from
        there.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="grid gap-6">
          <Panel>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-(family-name:--font-display) text-[1.5rem]">
                Your trip
              </h2>
              <a
                href={back}
                className="text-[0.9rem] font-semibold text-[#073c36] underline-offset-4 hover:underline"
              >
                Change
              </a>
            </div>
            <TripSummary trip={trip.request} extra={extra} />
          </Panel>
          <Panel>
            <h2 className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
              Price
            </h2>
            <PriceBreakdown price={prepared.price} />
          </Panel>
        </div>
        <Panel>
          <h2 className="mb-4 font-(family-name:--font-display) text-[1.5rem]">
            How to reach you
          </h2>
          <ConfirmForm
            category={category}
            trip={query}
            defaultName={fullName(user)}
            defaultPhone={user.phone ?? ""}
          />
        </Panel>
      </div>
    </>
  );
}
