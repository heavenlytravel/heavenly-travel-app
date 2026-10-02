import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";

/**
 * The history of one record, oldest first: what happened, who did it and
 * when. The booking page shows it to anyone who can open the booking. An
 * entry with more to show than its sentence links to the page `hrefOf`
 * names for it.
 */
export function ActivityHistory({
  entries,
  emptyMessage,
  hrefOf,
}: {
  entries: ActivityEntry[];
  emptyMessage: string;
  /** Where an entry's details are, or null for an entry that has none. */
  hrefOf?: (entry: ActivityEntry) => string | null;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }
  return (
    <ol className="divide-y divide-neutral-100 text-sm">
      {entries.map((entry) => {
        const href = hrefOf?.(entry) ?? null;
        return (
          <li key={entry.id} className="py-2">
            <span className="block font-medium text-neutral-900">
              {href ? (
                <Link
                  href={href}
                  className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
                >
                  {describeActivity(entry)}
                </Link>
              ) : (
                describeActivity(entry)
              )}
            </span>
            <span className="block text-xs text-neutral-500">
              {entry.actorName}, {formatLocalDateTime(entry.createdAt)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
