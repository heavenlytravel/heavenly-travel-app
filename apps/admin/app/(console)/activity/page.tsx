import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import { listActivity, type ActivityEntry } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader } from "../../_components/PageHeader";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { activityHref, bookingHref, locationHref } from "../../_lib/routes";

const PAGE_SIZE = 50;

/** Where the record's label leads, when it has a page. */
function entityLink(entry: ActivityEntry) {
  if (entry.isDeleted) return null;
  if (entry.entityType === "booking") return bookingHref(entry.entityId);
  if (entry.entityType === "location") return locationHref(entry.entityId);
  return null;
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

      <div className="mt-6">
        <Table>
          <THead>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>What</Th>
            <Th>Record</Th>
          </THead>
          <TBody>
            {entries.length === 0 ? (
              <EmptyRow colSpan={4}>
                {before ? "No older activity." : "No activity yet."}
              </EmptyRow>
            ) : (
              entries.map((entry) => {
                const href = entityLink(entry);
                return (
                  <tr key={entry.id}>
                    <Td className="whitespace-nowrap text-neutral-600 tabular-nums">
                      {formatLocalDateTime(entry.createdAt)}
                    </Td>
                    <Td>
                      <span className="block">{entry.actorName}</span>
                      <span className="block text-xs text-neutral-500 capitalize">
                        {entry.actorKind}
                      </span>
                    </Td>
                    <Td className="font-medium">{describeActivity(entry)}</Td>
                    <Td>
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
                    </Td>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
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
