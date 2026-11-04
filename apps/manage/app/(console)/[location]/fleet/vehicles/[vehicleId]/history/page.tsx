import { getVehicle } from "@repo/db/server";
import { FleetRecordHistory } from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
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
    <FleetRecordHistory
      scope={scope}
      entityType="vehicle"
      id={vehicleId}
      load={async (id) => {
        const record = await getVehicle(id);
        return record ? { ...record, label: record.plate } : null;
      }}
      hrefOf={vehicleHref}
      noun="vehicle"
    />
  );
}
