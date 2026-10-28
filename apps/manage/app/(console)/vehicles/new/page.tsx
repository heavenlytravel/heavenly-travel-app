import Link from "next/link";
import {
  listClassOptions,
  listModelSuggestions,
  listVendorOptions,
} from "@repo/db/server";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
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
  const { location, vendor } = await searchParams;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={VEHICLES_PATH}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All vehicles
        </Link>
      </p>
      <PageHeader
        title="Add vehicle"
        description="A vehicle of ours or of another vendor, based at the location you choose. Its class is what customers book."
      />
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
        }
      >
        {() =>
          newVehicleForm(
            typeof location === "string" ? location : undefined,
            typeof vendor === "string" ? vendor : undefined,
          )
        }
      </Streamed>
    </>
  );
}

async function newVehicleForm(
  location: string | undefined,
  vendor: string | undefined,
) {
  const [classes, suggestions, locations, vendors] = await Promise.all([
    listClassOptions(),
    listModelSuggestions(),
    locationNames(),
    listVendorOptions(),
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
          vendors={vendors}
          vendorId={vendors.find((v) => v.id === vendor)?.id}
          backHref={vehiclesHref({ location: locationId })}
          backToList
        />
      }
    />
  );
}
