import type { Metadata } from "next";
import { quoteCarTrip } from "@repo/db/server";
import { hiddenSearchFields, parseCarSearch } from "../../_lib/car-booking";
import { PageTitle, Panel, Stop } from "../../_components/Page";
import { TripSummary } from "../_components/TripSummary";
import { CarOptionsForm, type ClassOption } from "./CarOptionsForm";
import { loadCarTrip } from "./_lib/trip";

export const metadata: Metadata = {
  title: "Car with driver | Heavenly Travel",
};

/**
 * Route: /booking/car-with-driver?mode=…&pickup=…
 * The options step. The search arrives in the URL from the home page card;
 * this page resolves it, prices every vehicle class on the server and asks
 * for the rest of the details. Nothing is stored until the confirm step.
 */
export default async function CarOptionsPage({
  searchParams,
}: PageProps<"/booking/car-with-driver">) {
  const search = parseCarSearch(await searchParams);
  if (!search) {
    return (
      <Stop
        title="Start with a search"
        message="Tell us where and when you need a car, and we will show you prices."
        linkLabel="Search for a car"
      />
    );
  }

  const trip = await loadCarTrip(search);
  if (!trip.ok) return <Stop title={trip.title} message={trip.message} />;

  const quoted = await quoteCarTrip(trip.request);
  if (!quoted.ok) {
    return (
      <Stop title="We cannot book this trip" message={quoted.error.message} />
    );
  }

  const classes: ClassOption[] = quoted.quote.classes.map((c) => ({
    id: c.vehicleClass.id,
    name: c.vehicleClass.name,
    description: c.vehicleClass.description,
    luggage: c.vehicleClass.luggage,
    minPassengers: c.vehicleClass.minPassengers,
    maxPassengers: c.vehicleClass.maxPassengers,
    totalSen: c.price.totalSen,
  }));

  return (
    <>
      <PageTitle eyebrow="Car with driver" title="Your trip, priced.">
        Prices include the driver and fuel. Pay nothing now: we confirm your
        booking first.
      </PageTitle>
      <Panel className="mb-8">
        <TripSummary
          trip={trip.request}
          extra={[["Area", quoted.quote.zone.name]]}
        />
      </Panel>
      <CarOptionsForm
        classes={classes}
        initialPassengers={search.passengers}
        hiddenFields={hiddenSearchFields(search)}
      />
    </>
  );
}
