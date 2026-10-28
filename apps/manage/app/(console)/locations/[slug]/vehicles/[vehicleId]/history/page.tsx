import { getVehicle, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { Streamed } from "../../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { locationVehicleHref } from "../../../../../../_lib/routes";
import { locationKey } from "../../../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicles/[vehicleId]/history. Every change to
 * one vehicle based at the location, newest first, from the "History" in
 * its header. A vehicle based elsewhere is not found here.
 */
export default async function LocationVehicleHistoryPage({
  params,
}: PageProps<"/locations/[slug]/vehicles/[vehicleId]/history">) {
  await requireAdmin("fleet.manage");
  const { slug, vehicleId } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [vehicle, entries] = await Promise.all([
          getVehicle(vehicleId),
          listActivityFor("vehicle", vehicleId),
        ]);
        if (!vehicle || vehicle.locationId !== id) notFound();
        return (
          <RecordHistory
            level={2}
            back={{
              href: locationVehicleHref(slug, vehicle.id),
              label: vehicle.plate,
            }}
            description={`Every change to ${vehicle.plate}, newest first: who made it and when.`}
            entries={entries}
            emptyMessage="No changes recorded for this vehicle."
          />
        );
      }}
    </Streamed>
  );
}
