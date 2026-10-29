import { getVehicle, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Streamed } from "@repo/console/Skeleton";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../../_lib/console-map";
import { vehicleHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /[location]/fleet/vehicles/[vehicleId]/history. Every change to
 * one vehicle, newest first, from the "History" in its header. Under a
 * location, a vehicle based elsewhere is not found.
 */
export default async function VehicleHistoryPage({
  params,
}: PageProps<"/[location]/fleet/vehicles/[vehicleId]/history">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { vehicleId } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [vehicle, entries] = await Promise.all([
          getVehicle(vehicleId),
          listActivityFor("vehicle", vehicleId),
        ]);
        if (!vehicle) notFound();
        if (scope.location && vehicle.locationId !== scope.location.id) {
          notFound();
        }
        return (
          <RecordHistory
            section={sectionLabelOf("vehicles")}
            back={{
              href: vehicleHref(scope.slug, vehicle.id),
              label: vehicle.plate,
            }}
            entries={entries}
            emptyMessage="No changes recorded for this vehicle."
          />
        );
      }}
    </Streamed>
  );
}
