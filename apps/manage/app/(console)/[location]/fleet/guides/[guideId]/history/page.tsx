import { getGuide, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Streamed } from "@repo/console/Skeleton";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../../_lib/access";
import { guideHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /[location]/fleet/guides/[guideId]/history. Every change to one
 * tour guide's record, newest first, from the "History" in their header.
 * Under a location, a guide based elsewhere is not found.
 */
export default async function GuideHistoryPage({
  params,
}: PageProps<"/[location]/fleet/guides/[guideId]/history">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { guideId } = await params;

  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [guide, entries] = await Promise.all([
          getGuide(guideId),
          listActivityFor("guide", guideId),
        ]);
        if (!guide) notFound();
        if (scope.location && guide.locationId !== scope.location.id) {
          notFound();
        }
        return (
          <RecordHistory
            record={{
              href: guideHref(scope.slug, guide.id),
              label: guide.name,
            }}
            entries={entries}
            emptyMessage="No changes recorded for this tour guide."
          />
        );
      }}
    </Streamed>
  );
}
