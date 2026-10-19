import Link from "next/link";
import { listLocationNames, listVehicles } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DueFilter } from "../../_components/DueFilter";
import { LocationFilter } from "../../_components/LocationFilter";
import { PageHeader } from "../../_components/PageHeader";
import { Streamed, TableSkeleton } from "../../_components/Skeleton";
import { VehiclesTable } from "../../_components/VehiclesTable";
import { requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import { DUE_PARAM, newVehicleHref, vehiclesHref } from "../../_lib/routes";

/**
 * Route: /vehicles?location=…&due=1. Our vehicles across locations,
 * narrowed to one location, to those with a document due, or both. A
 * vehicle is added here or on its location's Vehicles tab, and changed
 * there. See docs/261019-vehicles-and-drivers.md.
 */
export default async function VehiclesPage({
  searchParams,
}: PageProps<"/vehicles">) {
  await requireAdmin("fleet.manage");
  const { location, due: dueParam } = await searchParams;
  const locationId =
    typeof location === "string" && location ? location : undefined;
  const due = dueParam === DUE_PARAM;
  const locations = await listLocationNames();

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Our vehicles at every location, with the documents due within 30 days or expired."
        action={
          <Button asChild>
            <Link href={newVehicleHref(locationId)}>Add vehicle</Link>
          </Button>
        }
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <DueFilter
          due={due}
          hrefOf={(next) => vehiclesHref({ location: locationId, due: next })}
        />
        <LocationFilter
          value={locationId ?? ""}
          options={locationFilterOptions(locations, (next) =>
            vehiclesHref({ location: next, due }),
          )}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={`${locationId ?? "all"}:${due}`}
          fallback={<TableSkeleton columns={6} />}
        >
          {async () => (
            <VehiclesTable
              showLocation
              vehicles={await listVehicles({ locationId, due })}
              emptyMessage={
                due ? "No vehicle has a document due." : "No vehicle yet."
              }
            />
          )}
        </Streamed>
      </div>
    </>
  );
}
