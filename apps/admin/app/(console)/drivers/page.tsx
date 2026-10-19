import Link from "next/link";
import { listDrivers, listLocationNames } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DriversTable } from "../../_components/DriversTable";
import { DueFilter } from "../../_components/DueFilter";
import { LocationFilter } from "../../_components/LocationFilter";
import { PageHeader } from "../../_components/PageHeader";
import { Streamed, TableSkeleton } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import { DUE_PARAM, driversHref, newDriverHref } from "../../_lib/routes";

/**
 * Route: /drivers?location=…&due=1. Our drivers across locations, narrowed
 * to one location, to those with a licence due, or both. A driver is
 * added here or on their location's Drivers tab, and changed there. See
 * docs/261019-vehicles-and-drivers.md.
 */
export default async function DriversPage({
  searchParams,
}: PageProps<"/drivers">) {
  await requireAdmin("fleet.manage");
  const { location, due: dueParam } = await searchParams;
  const locationId =
    typeof location === "string" && location ? location : undefined;
  const due = dueParam === DUE_PARAM;
  const locations = await listLocationNames();

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Our drivers at every location, with the licences due within 30 days or expired."
        action={
          <Button asChild>
            <Link href={newDriverHref(locationId)}>Add driver</Link>
          </Button>
        }
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <DueFilter
          due={due}
          hrefOf={(next) => driversHref({ location: locationId, due: next })}
        />
        <LocationFilter
          value={locationId ?? ""}
          options={locationFilterOptions(locations, (next) =>
            driversHref({ location: next, due }),
          )}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={`${locationId ?? "all"}:${due}`}
          fallback={<TableSkeleton columns={5} />}
        >
          {async () => (
            <DriversTable
              showLocation
              drivers={await listDrivers({ locationId, due })}
              emptyMessage={
                due ? "No driver has a licence due." : "No driver yet."
              }
            />
          )}
        </Streamed>
      </div>
    </>
  );
}
