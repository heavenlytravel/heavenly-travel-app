import Link from "next/link";
import { listDrivers } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DriversTable } from "../../../../_components/DriversTable";
import { DueFilter } from "../../../../_components/DueFilter";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { Streamed, TableSkeleton } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import {
  DUE_PARAM,
  locationDriversHref,
  newLocationDriverHref,
} from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/drivers?due=1. Operation's tab: our drivers
 * based at the location, active first, by name, with the classes they may
 * drive and the licences due within 30 days or expired; narrowed to those
 * with one due. A driver opens their form here. See
 * docs/261019-vehicles-and-drivers.md.
 */
export default async function LocationDriversPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/drivers">) {
  await requireAdmin("fleet.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const due = (await searchParams).due === DUE_PARAM;

  return (
    <>
      <SectionHeader
        title="Drivers"
        description="Our drivers based here, the classes each may drive, and the expiry dates of their licences."
        action={
          <Button asChild>
            <Link href={newLocationDriverHref(slug)}>Add driver</Link>
          </Button>
        }
      />
      <div className="mt-4">
        <DueFilter
          due={due}
          hrefOf={(next) => locationDriversHref(slug, next)}
        />
      </div>
      <div className="mt-4">
        <Streamed key={String(due)} fallback={<TableSkeleton columns={4} />}>
          {async () => (
            <DriversTable
              drivers={await listDrivers({ locationId: id, due })}
              emptyMessage={
                due
                  ? "No driver here has a licence due."
                  : "No driver based here yet."
              }
            />
          )}
        </Streamed>
      </div>
    </>
  );
}
