import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FleetList } from "../../../../_components/FleetList";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { requireAdmin } from "../../../../_lib/access";
import {
  DUE_PARAM,
  locationVehiclesHref,
  newLocationVehicleHref,
  SEARCH_PARAM,
} from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicles?due=1&q=…. Operation's tab: our
 * vehicles based at the location, in service first, by class, with the
 * documents due within 30 days or expired; narrowed to those with one
 * due, to a search by plate or model, or both. A vehicle opens its form
 * here. See docs/261019-vehicles-and-drivers.md.
 */
export default async function LocationVehiclesPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/vehicles">) {
  await requireAdmin("fleet.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const query = await searchParams;
  const due = query.due === DUE_PARAM;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;

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
        <FleetList
          kind="vehicles"
          filter={{ due, q }}
          hrefOf={(filter) => locationVehiclesHref(slug, filter)}
          locationId={id}
        />
      </div>
    </>
  );
}
