import { entriesSeenBy } from "@repo/db";
import { getBusiness, listActivityForMany } from "@repo/db/server";
import { Streamed } from "@repo/console/Skeleton";
import { notFound } from "next/navigation";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../_components/RecordHistory";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import { agentHref } from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";

/**
 * Route: /~/agents/[id]/history. One agent's history, from "History" in
 * its header: it added, its details and terms changed, made inactive.
 */
export default async function AgentHistoryPage({
  params,
}: PageProps<"/[location]/agents/[id]/history">) {
  await requireAdmin("bookings.view");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  if (scope.slug !== null) notFound();
  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {() => agentHistory(id)}
    </Streamed>
  );
}

async function agentHistory(id: string) {
  const [agent, entries, permissions] = await Promise.all([
    getBusiness(id),
    // Agents were vendors before db:set-billing moved them, keeping their
    // id: their history from then is under the vendor.
    listActivityForMany([
      { entityType: "vendor", entityId: id },
      { entityType: "business", entityId: id },
    ]),
    getPermissions(),
  ]);
  if (!agent) notFound();
  return (
    <RecordHistory
      record={{ href: agentHref(id), label: agent.name }}
      entries={entriesSeenBy(entries, permissions)}
      emptyMessage="Nothing recorded yet."
    />
  );
}
