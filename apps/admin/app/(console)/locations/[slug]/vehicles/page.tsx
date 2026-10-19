import Link from "next/link";
import { listVehicles } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DueFilter } from "../../../../_components/DueFilter";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { Streamed, TableSkeleton } from "../../../../_components/Skeleton";
import { VehiclesTable } from "../../../../_components/VehiclesTable";
import { requireAdmin } from "../../../../_lib/access";
import {
  DUE_PARAM,
  locationVehiclesHref,
  newLocationVehicleHref,
} from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicles?due=1. Operation's tab: our vehicles
 * based at the location, in service first, by class, with the documents
 * due within 30 days or expired; narrowed to those with one due. A
 * vehicle opens its form here. See docs/261019-vehicles-and-drivers.md.
 */
export default async function LocationVehiclesPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/vehicles">) {
  await requireAdmin("fleet.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const due = (await searchParams).due === DUE_PARAM;

  return (
    <>
      <SectionHeader
        title="Vehicles"
        description="Our vehicles based here, each of one model, with the expiry dates of its documents."
        action={
          <Button asChild>
            <Link href={newLocationVehicleHref(slug)}>Add vehicle</Link>
          </Button>
        }
      />
      <div className="mt-4">
        <DueFilter
          due={due}
          hrefOf={(next) => locationVehiclesHref(slug, next)}
        />
      </div>
      <div className="mt-4">
        <Streamed key={String(due)} fallback={<TableSkeleton columns={5} />}>
          {async () => (
            <VehiclesTable
              vehicles={await listVehicles({ locationId: id, due })}
              emptyMessage={
                due
                  ? "No vehicle here has a document due."
                  : "No vehicle based here yet."
              }
            />
          )}
        </Streamed>
      </div>
    </>
  );
}
