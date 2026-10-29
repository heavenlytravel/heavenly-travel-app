import Link from "next/link";
import {
  ANONYMOUS_ACTOR_NAMES,
  describeActivity,
  formatLocalTime,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { Card } from "@repo/console/Card";
import { Bone } from "@repo/console/Skeleton";
import { dayHeadingOf, localDayOf } from "../_lib/local-days";

/** The entries by the Malaysian day they were made, the days and the entries newest first. */
function byDay(entries: readonly ActivityEntry[]) {
  const days = new Map<string, ActivityEntry[]>();
  for (const entry of [...entries].reverse()) {
    const day = localDayOf(entry.createdAt);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.values()];
}

/** Who made a change, in two letters for the disc beside it: "Nurul Aina" is NA, "System" SY. */
function initialsOf(name: string) {
  const words = name.split(/[\s@._-]+/).filter(Boolean);
  const letters =
    words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Who made a change as its line says it: a customer by name, told apart from staff. */
function actorOf(entry: ActivityEntry) {
  return entry.actorKind === "customer" &&
    entry.actorName !== ANONYMOUS_ACTOR_NAMES.customer
    ? `${entry.actorName}, customer`
    : entry.actorName;
}

/**
 * A history, newest first, in one card: the changes grouped under the
 * day each was made, each with its time, who made it, what happened and,
 * at the right, the part of the record it changed (`tagOf`). An entry
 * with more to show than its sentence links to the page `hrefOf` names
 * for it. `head` stands across the card's top, the filter chips, and
 * `foot` across its foot, the way to older changes. The Activity screen
 * and each record's history page read it.
 */
export function HistoryTimeline({
  entries,
  emptyMessage,
  hrefOf,
  tagOf,
  head,
  foot,
}: {
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  emptyMessage: string;
  /** Where an entry's details are, or null for an entry that has none. */
  hrefOf?: (entry: ActivityEntry) => string | null;
  /** The part of the record an entry changed, or null for none. */
  tagOf?: (entry: ActivityEntry) => string | null;
  head?: ReactNode;
  foot?: ReactNode;
}) {
  const now = new Date();
  return (
    <Card flush className="overflow-hidden">
      {head ? (
        <div className="border-b border-hairline px-5 py-4">{head}</div>
      ) : null}
      {entries.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        byDay(entries).map((dayEntries, index) => (
          <section
            key={dayEntries[0]!.id}
            className={cx(index > 0 && "border-t border-hairline")}
          >
            <h3 className="border-b border-hairline bg-shade px-5 py-2 text-[11px] font-bold tracking-[0.08em] text-brand uppercase">
              {dayHeadingOf(dayEntries[0]!.createdAt, now)}
            </h3>
            <ol className="divide-y divide-hairline text-sm">
              {dayEntries.map((entry) => (
                <HistoryLine
                  key={entry.id}
                  entry={entry}
                  href={hrefOf?.(entry) ?? null}
                  tag={tagOf?.(entry) ?? null}
                />
              ))}
            </ol>
          </section>
        ))
      )}
      {foot}
    </Card>
  );
}

/** One change: its time, a disc with who made it, the sentence and who, and the part it changed. */
function HistoryLine({
  entry,
  href,
  tag,
}: {
  entry: ActivityEntry;
  href: string | null;
  tag: string | null;
}) {
  const sentence = describeActivity(entry);
  const actor = actorOf(entry);
  return (
    <li className="grid grid-cols-[3.75rem_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-5 py-3 sm:grid-cols-[4.5rem_auto_minmax(0,1fr)_auto]">
      <span className="text-[13px] text-muted tabular-nums">
        {formatLocalTime(entry.createdAt)}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "flex size-8 items-center justify-center rounded-full text-[11px] font-bold",
          entry.actorKind === "admin"
            ? "bg-brand-tint text-brand-strong"
            : "bg-slate-100 text-slate-600",
        )}
      >
        {initialsOf(actor)}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">
          {href ? (
            <Link
              href={href}
              className="underline decoration-slate-300 underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
            >
              {sentence}
            </Link>
          ) : (
            sentence
          )}
        </span>
        <span className="block truncate text-[12.5px] text-muted">{actor}</span>
      </span>
      {tag ? (
        <span className="col-start-3 justify-self-start rounded-md border border-hairline bg-shade px-2 py-0.5 text-xs text-muted sm:col-start-auto sm:justify-self-end">
          {tag}
        </span>
      ) : null}
    </li>
  );
}

/** What stands where a history is loading: its card, with its `head` already in place. */
export function HistoryTimelineSkeleton({
  head,
  rows = 6,
}: {
  head?: ReactNode;
  rows?: number;
}) {
  return (
    <Card flush className="overflow-hidden">
      {head ? (
        <div className="border-b border-hairline px-5 py-4">{head}</div>
      ) : null}
      <div className="border-b border-hairline bg-shade px-5 py-2.5">
        <Bone className="h-3 w-40" />
      </div>
      <div className="divide-y divide-hairline">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-3 px-5 py-3.5">
            <Bone className="h-4 w-12" />
            <Bone className="size-8 rounded-full" />
            <span className="grid flex-1 gap-1.5">
              <Bone
                className={cx("h-4 max-w-full", row % 2 ? "w-56" : "w-72")}
              />
              <Bone className="h-3 w-24" />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
