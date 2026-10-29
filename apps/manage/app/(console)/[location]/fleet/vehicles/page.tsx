import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import { FleetList } from "../../../../_components/FleetList";
import { requireAdmin } from "../../../../_lib/access";
import { sectionLabelOf } from "../../../../_lib/console-map";
import {
  DUE_PARAM,
  newVehicleHref,
  SEARCH_PARAM,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/**
 * Route: /[location]/fleet/vehicles?due=1&q=…. Our vehicles: every
 * location's under `~`, with the location of each, or those based at one
 * location; in service first, by class. Figures sum them up; the list
 * narrows to those with a document due within 30 days or expired, to a
 * search by plate or model, or both. A vehicle opens here, and is added
 * here. See docs/261019-vehicles-and-drivers.md.
 */
export default async function VehiclesPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/vehicles">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const query = await searchParams;
  const due = query.due === DUE_PARAM;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;

  return (
    <>
      <PageHeader
        section={sectionLabelOf("vehicles")}
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
      <FleetList kind="vehicles" scope={scope} filter={{ due, q }} />
    </>
  );
}
