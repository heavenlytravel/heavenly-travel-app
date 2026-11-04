import { getGuide } from "@repo/db/server";
import { FleetRecordHistory } from "../../../../../../_components/RecordHistory";
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
    <FleetRecordHistory
      scope={scope}
      entityType="guide"
      id={guideId}
      load={async (id) => {
        const record = await getGuide(id);
        return record ? { ...record, label: record.name } : null;
      }}
      hrefOf={guideHref}
      noun="tour guide"
    />
  );
}
