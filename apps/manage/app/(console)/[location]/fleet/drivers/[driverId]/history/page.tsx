import { getDriver } from "@repo/db/server";
import { FleetRecordHistory } from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
import { driverHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /[location]/fleet/drivers/[driverId]/history. Every change to one
 * driver's record, newest first, from the "History" in their header. Under
 * a location, a driver based elsewhere is not found.
 */
export default async function DriverHistoryPage({
  params,
}: PageProps<"/[location]/fleet/drivers/[driverId]/history">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { driverId } = await params;

  return (
    <FleetRecordHistory
      scope={scope}
      entityType="driver"
      id={driverId}
      load={async (id) => {
        const record = await getDriver(id);
        return record ? { ...record, label: record.name } : null;
      }}
      hrefOf={driverHref}
      noun="driver"
    />
  );
}
