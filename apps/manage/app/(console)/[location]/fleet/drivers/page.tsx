import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import {
  FleetList,
  fleetListFilterOf,
} from "../../../../_components/FleetList";
import { requireAdmin } from "../../../../_lib/access";
import { newDriverHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/**
 * Route: /[location]/fleet/drivers?service=…&due=1&vendor=…&q=…. Our
 * drivers: every
 * location's under `~`, with the location of each, or those based at one
 * location; active first, by name, with the classes they may drive.
 * Figures sum them up; the list narrows, by the Filters button, to those
 * active or not, with a licence due within 30 days or expired, or of a
 * vendor, and by a search by name or phone, any of them together. A
 * driver opens here, and is added here. See
 * docs/261019-vehicles-and-drivers.md.
 */
export default async function DriversPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/drivers">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const filter = fleetListFilterOf(await searchParams);

  return (
    <>
      <PageHeader
        title="Drivers"
        action={
          <Button asChild>
            <Link href={newDriverHref(scope.slug)}>
              <PlusIcon />
              Add driver
            </Link>
          </Button>
        }
      />
      <FleetList kind="drivers" scope={scope} filter={filter} />
    </>
  );
}
