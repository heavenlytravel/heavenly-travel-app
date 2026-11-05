import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import {
  FleetList,
  fleetListFilterOf,
} from "../../../../_components/FleetList";
import { requireAdmin } from "../../../../_lib/access";
import { newVehicleHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/**
 * Route: /[location]/fleet/vehicles?service=…&due=1&class=…&vendor=…&q=….
 * Our vehicles: every
 * location's under `~`, with the location of each, or those based at one
 * location; in service first, by class. Figures sum them up; the list
 * narrows, by the Filters button, to those in service or out, with a
 * document due within 30 days or expired, of a class or of a vendor, and
 * by a search by plate or model, any of them together. A vehicle opens here, and is added
 * here. See docs/261019-vehicles-and-drivers.md.
 */
export default async function VehiclesPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/vehicles">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const filter = fleetListFilterOf(await searchParams);

  return (
    <>
      <PageHeader
        title="Vehicles"
        action={
          <Button asChild>
            <Link href={newVehicleHref(scope.slug)}>
              <PlusIcon />
              Add vehicle
            </Link>
          </Button>
        }
      />
      <FleetList kind="vehicles" scope={scope} filter={filter} />
    </>
  );
}
