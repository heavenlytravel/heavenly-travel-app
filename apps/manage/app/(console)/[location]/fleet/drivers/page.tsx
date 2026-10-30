import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import { FleetList } from "../../../../_components/FleetList";
import { requireAdmin } from "../../../../_lib/access";
import {
  DUE_PARAM,
  newDriverHref,
  SEARCH_PARAM,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/**
 * Route: /[location]/fleet/drivers?due=1&q=…. Our drivers: every
 * location's under `~`, with the location of each, or those based at one
 * location; active first, by name, with the classes they may drive.
 * Figures sum them up; the list narrows to those with a licence due
 * within 30 days or expired, to a search by name or phone, or both. A
 * driver opens here, and is added here. See
 * docs/261019-vehicles-and-drivers.md.
 */
export default async function DriversPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/drivers">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const query = await searchParams;
  const due = query.due === DUE_PARAM;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;

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
      <FleetList kind="drivers" scope={scope} filter={{ due, q }} />
    </>
  );
}
