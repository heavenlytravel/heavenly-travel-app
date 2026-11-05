import Link from "next/link";
import {
  ANONYMOUS_ACTOR_NAMES,
  activityChangesOf,
  activityLinesOf,
  describeActivity,
  formatLocalTime,
  type ActivityLine,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import type { ReactNode } from "react";
import { Card } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { Bone } from "@repo/ui/skeleton";
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
 * day each was made, each line with its time, who made it and what
 * happened, and under it the record it changed (`tagOf`) and who. One
 * person's entries on one record within a few seconds are one line, the
 * save they were, and the same thing done again and again is one line
 * that counts it (`activityLinesOf`). A line with stored values its
 * sentence does not say opens on them, field by field, old and new. An
 * entry with a page of its own links to the page `hrefOf` names for it. `head` stands across the card's top, the filters bar, and
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
      {head}
      {entries.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        byDay(entries).map((dayEntries, index) => (
          <section
            key={dayEntries[0]!.id}
            className={cx(index > 0 && "border-t border-hairline")}
          >
            <h2 className="border-b border-hairline bg-shade px-5 py-2 text-2xs font-bold tracking-kicker text-brand uppercase">
              {dayHeadingOf(dayEntries[0]!.createdAt, now)}
            </h2>
            <ol className="divide-y divide-hairline text-sm">
              {activityLinesOf(dayEntries, describeActivity).map((line) => (
                <HistoryLine
                  key={line.entries[0]!.id}
                  line={line}
                  hrefOf={hrefOf}
                  tagOf={tagOf}
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

/**
 * One line: its time, a disc with who made it, what it says, and under
 * it the record it changed and who; a run of the same thing says how many
 * times and over what time, a save lists its other changes. The fields it
 * changed open under "What changed".
 */
function HistoryLine({
  line,
  hrefOf,
  tagOf,
}: {
  line: ActivityLine<ActivityEntry>;
  hrefOf?: (entry: ActivityEntry) => string | null;
  tagOf?: (entry: ActivityEntry) => string | null;
}) {
  const newest = line.entries[0]!;
  const oldest = line.entries.at(-1)!;
  const [headline, ...rest] = line.sentences;
  const repeated = rest.length === 0 && headline!.count > 1;
  const href =
    line.entries.map((entry) => hrefOf?.(entry) ?? null).find(Boolean) ?? null;
  const tag = tagOf?.(newest) ?? null;
  const actor = actorOf(newest);
  // "Ali Hassan saw the customer's details" names its actor already.
  const named = headline!.text.startsWith(newest.actorName);
  // What the entries changed, in the order made; a run of one thing shows it once.
  const changes = (repeated ? [oldest] : [...line.entries].reverse()).flatMap(
    (entry) => activityChangesOf(entry),
  );
  const span =
    formatLocalTime(oldest.createdAt) === formatLocalTime(newest.createdAt)
      ? null
      : `${formatLocalTime(oldest.createdAt)} to ${formatLocalTime(newest.createdAt)}`;

  return (
    <li className="grid grid-cols-[3.75rem_auto_minmax(0,1fr)] items-start gap-x-3 px-5 py-3 sm:grid-cols-[4.5rem_auto_minmax(0,1fr)]">
      <span className="pt-1.5 text-caption text-muted tabular-nums">
        {formatLocalTime(newest.createdAt)}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "flex size-8 items-center justify-center rounded-full text-2xs font-bold",
          newest.actorKind === "admin"
            ? "bg-brand-tint text-brand-strong"
            : "bg-hairline text-muted",
        )}
      >
        {initialsOf(actor)}
      </span>
      <div className="grid min-w-0 gap-1 pt-1">
        <p className="font-medium text-ink">
          {href ? (
            <Link
              href={href}
              className="rounded-sm underline decoration-edge underline-offset-4 transition-colors hover:text-brand hover:decoration-brand focus-ring"
            >
              {headline!.text}
            </Link>
          ) : (
            headline!.text
          )}
          {repeated ? (
            <span className="ml-2 inline-flex rounded-full bg-shade px-2 py-0.5 align-middle text-2xs font-semibold text-muted tabular-nums">
              {headline!.count} times{span ? `, ${span}` : ""}
            </span>
          ) : null}
        </p>
        {rest.length > 0 ? (
          <ul className="grid gap-0.5 text-body">
            {rest.map((sentence) => (
              <li key={sentence.text} className="flex gap-2">
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
                <span>
                  {sentence.text}
                  {sentence.count > 1 ? ` (${sentence.count} times)` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="truncate text-caption text-muted">
          {[tag, named ? null : actor].filter(Boolean).join(" · ")}
        </p>
        {changes.length > 0 ? <Changes changes={changes} /> : null}
      </div>
    </li>
  );
}

/** "What changed" under a line, closed until clicked: each field, what it was and what it became. */
function Changes({
  changes,
}: {
  changes: ReturnType<typeof activityChangesOf>;
}) {
  return (
    <details className="group/changes">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-caption font-medium text-link focus-ring [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-3.5 transition-transform group-open/changes:rotate-90" />
        What changed
      </summary>
      <dl className="mt-2 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-md bg-shade px-3 py-2 text-caption">
        {changes.map((change, index) => (
          <div key={`${change.label}-${index}`} className="contents">
            <dt className="text-muted">{change.label}</dt>
            <dd className="min-w-0 break-words text-body">
              {change.before !== null && change.after !== null ? (
                <>
                  <span className="text-muted line-through">
                    {change.before}
                  </span>{" "}
                  → {change.after}
                </>
              ) : (
                (change.after ?? change.before)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </details>
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
      {head}
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
