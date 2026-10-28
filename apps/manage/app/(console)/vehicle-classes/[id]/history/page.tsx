import { getVehicleClass, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../_components/RecordHistory";
import { Streamed } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { vehicleClassHref } from "../../../../_lib/routes";

/**
 * Route: /vehicle-classes/[id]/history. Every change to one class of the
 * catalogue, newest first, from the "History" in its header. What a
 * location changed about selling it is in the location's history.
 */
export default async function VehicleClassHistoryPage({
  params,
}: PageProps<"/vehicle-classes/[id]/history">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [vehicleClass, entries] = await Promise.all([
          getVehicleClass(id),
          listActivityFor("vehicle-class", id),
        ]);
        if (!vehicleClass) notFound();
        return (
          <RecordHistory
            level={1}
            back={{ href: vehicleClassHref(id), label: vehicleClass.name }}
            description={`Every change to ${vehicleClass.name} in the catalogue, newest first: who made it and when.`}
            entries={entries}
            emptyMessage="No changes recorded. This class was seeded before the log."
          />
        );
      }}
    </Streamed>
  );
}
