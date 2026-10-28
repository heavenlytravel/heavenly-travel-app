import Link from "next/link";
import {
  ANONYMOUS_ACTOR_NAMES,
  describeActivity,
  formatLocalDate,
  formatLocalTime,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import { Frame } from "./Card";

/** The entries by the Malaysian day they were made, the days and the entries newest first. */
function byDay(entries: readonly ActivityEntry[]) {
  const days = new Map<string, ActivityEntry[]>();
  for (const entry of [...entries].reverse()) {
    const day = formatLocalDate(entry.createdAt);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.entries()];
}

/**
 * A history, newest first, by the day each change was made: the time,
 * what happened and who did it. An entry with more to show than its
 * sentence links to the page `hrefOf` names for it, and `tagOf` names the
 * part of the record it changed, at the right. The Activity screen, a
 * location's history page and each record's read it.
 */
export function HistoryTimeline({
  entries,
  emptyMessage,
  hrefOf,
  tagOf,
}: {
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  emptyMessage: string;
  /** Where an entry's details are, or null for an entry that has none. */
  hrefOf?: (entry: ActivityEntry) => string | null;
  /** The part of the record an entry changed, or null for none. */
  tagOf?: (entry: ActivityEntry) => string | null;
}) {
  if (entries.length === 0) {
    return (
      <Frame>
        <p className="px-6 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      </Frame>
    );
  }

  return (
    <div className="grid gap-6">
      {byDay(entries).map(([day, dayEntries]) => (
        <section key={day} className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{day}</h3>
          <Frame>
            <ol className="divide-y divide-slate-100 text-sm">
              {dayEntries.map((entry) => {
                const href = hrefOf?.(entry) ?? null;
                const tag = tagOf?.(entry) ?? null;
                return (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[3.5rem_1fr] gap-3 px-6 py-3 sm:grid-cols-[3.5rem_1fr_auto]"
                  >
                    <span className="text-slate-500 tabular-nums">
                      {formatLocalTime(entry.createdAt)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">
                        {href ? (
                          <Link
                            href={href}
                            className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                          >
                            {describeActivity(entry)}
                          </Link>
                        ) : (
                          describeActivity(entry)
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {/* A customer by name, told apart from staff. */}
                        {entry.actorKind === "customer" &&
                        entry.actorName !== ANONYMOUS_ACTOR_NAMES.customer
                          ? `${entry.actorName}, customer`
                          : entry.actorName}
                      </span>
                    </span>
                    {tag ? (
                      <span className="col-start-2 text-xs text-slate-500 sm:col-start-auto sm:text-right">
                        {tag}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Frame>
        </section>
      ))}
    </div>
  );
}
