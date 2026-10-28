import { getDriver, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { Streamed } from "../../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { locationDriverHref } from "../../../../../../_lib/routes";
import { locationKey } from "../../../../_lib/location-data";

/**
 * Route: /locations/[slug]/drivers/[driverId]/history. Every change to one
 * driver based at the location, newest first, from the "History" in their
 * header. A driver based elsewhere is not found here.
 */
export default async function LocationDriverHistoryPage({
  params,
}: PageProps<"/locations/[slug]/drivers/[driverId]/history">) {
  await requireAdmin("fleet.manage");
  const { slug, driverId } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [driver, entries] = await Promise.all([
          getDriver(driverId),
          listActivityFor("driver", driverId),
        ]);
        if (!driver || driver.locationId !== id) notFound();
        return (
          <RecordHistory
            level={2}
            back={{
              href: locationDriverHref(slug, driver.id),
              label: driver.name,
            }}
            description={`Every change to ${driver.name}'s record, newest first: who made it and when.`}
            entries={entries}
            emptyMessage="No changes recorded for this driver."
          />
        );
      }}
    </Streamed>
  );
}
