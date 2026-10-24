import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FleetList } from "../../_components/FleetList";
import { LocationFilter } from "../../_components/LocationFilter";
import { VEHICLES_SECTION } from "../../_components/nav";
import { PageHeader } from "../../_components/PageHeader";
import { SectionTabs } from "../../_components/SectionTabs";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import {
  DUE_PARAM,
  newVehicleHref,
  SEARCH_PARAM,
  VEHICLES_PATH,
  vehiclesHref,
} from "../../_lib/routes";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /vehicles?location=…&due=1&q=…. Our vehicles across locations,
 * narrowed to one location, to those with a document due, to a search by
 * plate or model, or any of them. A vehicle is added here or on its
 * location's Vehicles tab, and changed there. The class catalogue is the
 * section's second tab. See docs/261019-vehicles-and-drivers.md and
 * docs/261023-console-sidebar.md.
 */
export default async function VehiclesPage({
  searchParams,
}: PageProps<"/vehicles">) {
  await requireAdmin("fleet.manage");
  const params = await searchParams;
  const location =
    typeof params.location === "string" && params.location
      ? params.location
      : undefined;
  const due = params.due === DUE_PARAM;
  const q = searchTermOf(params[SEARCH_PARAM]) ?? undefined;
  const [locations, permissions] = await Promise.all([
    locationNames(),
    getPermissions(),
  ]);

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Our vehicles at every location, with the documents due within 30 days or expired."
        action={
          <Button asChild>
            <Link href={newVehicleHref(location)}>Add vehicle</Link>
          </Button>
        }
      />
      <SectionTabs
        section={VEHICLES_SECTION}
        current={VEHICLES_PATH}
        permissions={permissions}
      />
      <div className="mt-6">
        <FleetList
          kind="vehicles"
          across
          filter={{ due, q }}
          hrefOf={(filter) => vehiclesHref({ ...filter, location })}
          locationId={location}
          locationFilter={
            <LocationFilter
              value={location ?? ""}
              options={locationFilterOptions(locations, (next) =>
                vehiclesHref({ location: next, due, q }),
              )}
            />
          }
        />
      </div>
    </>
  );
}
