import { getDriver, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Streamed } from "@repo/console/Skeleton";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../../_lib/console-map";
import { driverHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /[location]/fleet/drivers/[driverId]/history. Every change to one
 * driver's record, newest first, from the "History" in their header.
 * Under a location, a driver based elsewhere is not found.
 */
export default async function DriverHistoryPage({
  params,
}: PageProps<"/[location]/fleet/drivers/[driverId]/history">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { driverId } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [driver, entries] = await Promise.all([
          getDriver(driverId),
          listActivityFor("driver", driverId),
        ]);
        if (!driver) notFound();
        if (scope.location && driver.locationId !== scope.location.id) {
          notFound();
        }
        return (
          <RecordHistory
            section={sectionLabelOf("drivers")}
            back={{
              href: driverHref(scope.slug, driver.id),
              label: driver.name,
            }}
            entries={entries}
            emptyMessage="No changes recorded for this driver."
          />
        );
      }}
    </Streamed>
  );
}
