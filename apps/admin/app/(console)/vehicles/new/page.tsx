import Link from "next/link";
import { listClassOptions, listModelSuggestions } from "@repo/db/server";
import { DetailColumns } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import { FormSkeleton, Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { VEHICLES_PATH, vehiclesHref } from "../../../_lib/routes";
import { VehicleForm } from "../_components/VehicleForm";
import { locationNames } from "../../../_lib/location-names";

/**
 * Route: /vehicles/new?location=…. A vehicle added from the list across
 * locations: the vehicle form, where it is based to choose, starting at
 * the location the list was narrowed to. Saved, it goes back to the list,
 * narrowed as it was.
 */
export default async function NewVehiclePage({
  searchParams,
}: PageProps<"/vehicles/new">) {
  await requireAdmin("fleet.manage");
  const { location } = await searchParams;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={VEHICLES_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All vehicles
        </Link>
      </p>
      <PageHeader
        title="Add vehicle"
        description="One of our vehicles, based at the location you choose. Its class is what customers book, and its model what they may choose."
      />
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
        }
      >
        {() =>
          newVehicleForm(typeof location === "string" ? location : undefined)
        }
      </Streamed>
    </>
  );
}

async function newVehicleForm(location: string | undefined) {
  const [classes, suggestions, locations] = await Promise.all([
    listClassOptions(),
    listModelSuggestions(),
    locationNames(),
  ]);
  const locationId = locations.find((l) => l.id === location)?.id;
  return (
    <DetailColumns
      main={
        <VehicleForm
          locationId={locationId}
          classes={classes}
          suggestions={suggestions}
          locations={locations}
          backHref={vehiclesHref({ location: locationId })}
          backToList
        />
      }
    />
  );
}
