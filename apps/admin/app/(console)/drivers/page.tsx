import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FleetList } from "../../_components/FleetList";
import { LocationFilter } from "../../_components/LocationFilter";
import { PageHeader } from "../../_components/PageHeader";
import { requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import {
  DUE_PARAM,
  newDriverHref,
  SEARCH_PARAM,
  driversHref,
} from "../../_lib/routes";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /drivers?location=…&due=1&q=…. Our drivers across locations,
 * narrowed to one location, to those with a licence due, to a search by
 * name or phone, or any of them. A driver is added here or on their
 * location's Drivers tab, and changed there. See
 * docs/261019-vehicles-and-drivers.md.
 */
export default async function DriversPage({
  searchParams,
}: PageProps<"/drivers">) {
  await requireAdmin("fleet.manage");
  const params = await searchParams;
  const location =
    typeof params.location === "string" && params.location
      ? params.location
      : undefined;
  const due = params.due === DUE_PARAM;
  const q = searchTermOf(params[SEARCH_PARAM]) ?? undefined;
  const locations = await locationNames();

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Our drivers at every location, with the licences due within 30 days or expired."
        action={
          <Button asChild>
            <Link href={newDriverHref(location)}>Add driver</Link>
          </Button>
        }
      />
      <div className="mt-6">
        <FleetList
          kind="drivers"
          across
          filter={{ due, q }}
          hrefOf={(filter) => driversHref({ ...filter, location })}
          locationId={location}
          locationFilter={
            <LocationFilter
              value={location ?? ""}
              options={locationFilterOptions(locations, (next) =>
                driversHref({ location: next, due, q }),
              )}
            />
          }
        />
      </div>
    </>
  );
}
