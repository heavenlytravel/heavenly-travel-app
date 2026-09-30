import type { Metadata } from "next";
import {
  parsePassengers,
  parseTripSearch,
  toParams,
  TRIP_CATEGORY_LABELS,
  tripSearchParams,
  unavailableReason,
} from "@repo/db";
import { quoteTrip } from "@repo/db/server";
import { resolveTrip } from "@repo/places/server";
import { notFound } from "next/navigation";
import { bookableCategory } from "../../../../_lib/transportation-booking";
import { PageTitle, Stop } from "../../../_components/Page";
import { TripBar } from "./TripBar";
import { TripOptionsForm, type ClassOption } from "./TripOptionsForm";

type Props = PageProps<"/booking/transportation/[category]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = bookableCategory((await params).category);
  if (!category) return {};
  return { title: `${TRIP_CATEGORY_LABELS[category]} | Heavenly Travel` };
}

/**
 * Route: /booking/transportation/car-with-driver?mode=…&pickup=…
 * The options step, one page for every category; a segment that is not a
 * bookable category is not found. The search arrives in the URL from the
 * home page card, or from the trip bar on this page; this page resolves it,
 * prices every vehicle class of the category on the server and asks for the
 * rest of the details. Nothing is stored until the confirm step.
 */
export default async function TripOptionsPage({ params, searchParams }: Props) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();

  const query = toParams(await searchParams);
  const search = parseTripSearch(query);
  if (!search) {
    return (
      <Stop
        title="Start with a search"
        message="Tell us where and when you need a driver, and we will show you prices."
        linkLabel="Search for a trip"
      />
    );
  }

  const trip = await resolveTrip(search);
  if (!trip.ok) return <Stop title={trip.title} message={trip.message} />;

  const passengers = parsePassengers(query) ?? 1;
  // The trip itself resolved, so it stays on screen and can be changed.
  const stop = (message: string) => (
    <>
      <TripBar
        category={category}
        search={search}
        trip={trip.request}
        passengers={passengers}
      />
      <Stop
        title="We cannot book this trip"
        message={message}
        linkLabel="Start a new search"
      />
    </>
  );

  const quoted = await quoteTrip(category, trip.request);
  if (!quoted.ok) return stop(quoted.error.message);
  if (quoted.quote.classes.length === 0) {
    return stop("We have no vehicle to offer for this trip right now.");
  }

  const classes: ClassOption[] = quoted.quote.classes.map((c) => ({
    id: c.vehicleClass.id,
    name: c.vehicleClass.name,
    description: c.vehicleClass.description,
    luggage: c.vehicleClass.luggage,
    minPassengers: c.vehicleClass.minPassengers,
    maxPassengers: c.vehicleClass.maxPassengers,
    totalSen: c.price.totalSen,
    unavailable: unavailableReason(c.availability),
  }));

  return (
    <>
      <PageTitle
        eyebrow={TRIP_CATEGORY_LABELS[category]}
        title="Your trip, priced."
      >
        Prices include the driver and fuel. Pay nothing now: we confirm your
        booking first.
      </PageTitle>
      <TripOptionsForm
        // A changed trip is a new form: the chosen vehicle is cleared.
        key={tripSearchParams(search).toString()}
        category={category}
        search={search}
        trip={trip.request}
        classes={classes}
        initialPassengers={passengers}
      />
    </>
  );
}
