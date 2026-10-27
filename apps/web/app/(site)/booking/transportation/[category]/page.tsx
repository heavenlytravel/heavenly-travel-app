import type { Metadata } from "next";
import {
  parsePassengers,
  parseTripSearch,
  toParams,
  TRIP_CATEGORY_LABELS,
} from "@repo/db";
import { notFound } from "next/navigation";
import { bookableCategory } from "../../../../_lib/transportation-booking";
import { VehicleStep } from "./VehicleStep";

type Props = PageProps<"/booking/transportation/[category]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = bookableCategory((await params).category);
  if (!category) return {};
  return { title: `${TRIP_CATEGORY_LABELS[category]} | Heavenly Travel` };
}

/**
 * Route: /booking/transportation/car-with-driver
 * The vehicle step, one page for every category; a segment that is not a
 * bookable category is not found. The trips are the customer's plan in
 * the browser, priced through a server action as they change, so the page
 * itself is the shell. A link with today's one-trip search
 * (`?mode=…&pickup=…`) still opens it, as a list of one. Nothing is
 * stored until the confirm step.
 */
export default async function TripVehiclesPage({
  params,
  searchParams,
}: Props) {
  const category = bookableCategory((await params).category);
  if (!category) notFound();

  const query = toParams(await searchParams);
  const search = parseTripSearch(query);
  return (
    <VehicleStep
      category={category}
      seed={search ? { search, passengers: parsePassengers(query) } : null}
    />
  );
}
