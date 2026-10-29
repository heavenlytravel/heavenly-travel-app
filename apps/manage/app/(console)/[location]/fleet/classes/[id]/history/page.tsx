import { getVehicleClass, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Streamed } from "@repo/console/Skeleton";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../../_lib/console-map";
import { classHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /[location]/fleet/classes/[id]/history, under `~` alone. Every
 * change to one class of the catalogue, newest first, from the "History"
 * in its header. What a location changed about selling it is in the
 * location's activity, so under a location this is not found.
 */
export default async function ClassHistoryPage({
  params,
}: PageProps<"/[location]/fleet/classes/[id]/history">) {
  await requireAdmin("coverage.manage");
  const scope = await scopeOf(params);
  if (scope.slug !== null) notFound();
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
            section={sectionLabelOf("classes")}
            back={{ href: classHref(null, id), label: vehicleClass.name }}
            entries={entries}
            emptyMessage="No changes recorded. This class was seeded before the log."
          />
        );
      }}
    </Streamed>
  );
}
