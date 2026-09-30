import { describeActivity, formatLocalDateTime } from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";

/**
 * The history of one record, oldest first: what happened, who did it and
 * when. The booking page shows it to anyone who can open the booking.
 */
export function ActivityHistory({
  entries,
  emptyMessage,
}: {
  entries: ActivityEntry[];
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }
  return (
    <ol className="divide-y divide-neutral-100 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="py-2">
          <span className="block font-medium text-neutral-900">
            {describeActivity(entry)}
          </span>
          <span className="block text-xs text-neutral-500">
            {entry.actorName}, {formatLocalDateTime(entry.createdAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}
