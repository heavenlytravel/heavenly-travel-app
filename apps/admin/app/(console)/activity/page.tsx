import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import { listActivity, type ActivityEntry } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader } from "../../_components/PageHeader";
import { requireAdmin } from "../../_lib/access";
import { activityHref, bookingHref } from "../../_lib/routes";

const PAGE_SIZE = 50;

/** Where the record's label leads, when it has a page. */
function entityLink(entry: ActivityEntry) {
  return entry.entityType === "booking" ? bookingHref(entry.entityId) : null;
}

/**
 * Route: /activity?before=<id>. Every admin, customer and system action
 * across the app, newest first, a page at a time. SUPER only; one
 * booking's history is on its own page for every team.
 */
export default async function ActivityPage({
  searchParams,
}: PageProps<"/activity">) {
  await requireAdmin("activity.view");
  const { before } = await searchParams;
  const { entries, nextCursor } = await listActivity({
    before: typeof before === "string" && before ? before : undefined,
    take: PAGE_SIZE,
  });

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every action on bookings, admins and settings, with who did it and when. Entries are never edited or deleted."
      />

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">What</th>
              <th className="px-4 py-3 font-medium">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  {before ? "No older activity." : "No activity yet."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const href = entityLink(entry);
                return (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 tabular-nums">
                      {formatLocalDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{entry.actorName}</span>
                      <span className="block text-xs text-neutral-500 capitalize">
                        {entry.actorKind}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {describeActivity(entry)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Badge>{entry.entityType}</Badge>
                        {href ? (
                          <Link
                            href={href}
                            className="tabular-nums underline-offset-4 hover:underline"
                          >
                            {entry.entityLabel}
                          </Link>
                        ) : (
                          <span className="text-neutral-600">
                            {entry.entityLabel}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Pages"
        className="mt-4 flex items-center justify-between text-sm"
      >
        {before ? (
          <Link
            href={activityHref()}
            className="font-medium text-neutral-600 underline-offset-4 hover:underline"
          >
            Newest
          </Link>
        ) : (
          <span />
        )}
        {nextCursor ? (
          <Link
            href={activityHref(nextCursor)}
            className="font-medium text-neutral-600 underline-offset-4 hover:underline"
          >
            Older
          </Link>
        ) : null}
      </nav>
    </>
  );
}
