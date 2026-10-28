import Link from "next/link";
import type { ActivityEntry } from "@repo/db/server";
import { HistoryIcon } from "@repo/ui/icons";
import { HistoryTimeline } from "./HistoryTimeline";
import { Header } from "@repo/console/PageHeader";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
} from "@repo/console/Skeleton";

/** "History" in a record's header: the way to the record's history page. */
export function HistoryLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
    >
      <HistoryIcon className="size-4" />
      History
    </Link>
  );
}

/**
 * One record's history page: the way back to the record, by its name,
 * then "History" over the line that says whose, and every change to it,
 * newest first, by day. A vehicle, a driver, a class and a booking each
 * have one, which their header links to with `HistoryLink`. `level` is
 * the header's: 2 inside a location, under the location's own.
 */
export function RecordHistory({
  level,
  back,
  description,
  entries,
  emptyMessage,
}: {
  level: 1 | 2;
  /** The record's page and its name: "KV589E". */
  back: { href: string; label: string };
  description: string;
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  emptyMessage: string;
}) {
  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={back.href}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          {back.label}
        </Link>
      </p>
      <Header level={level} title="History" description={description} />
      <div className="mt-6">
        <HistoryTimeline entries={entries} emptyMessage={emptyMessage} />
      </div>
    </>
  );
}

/** What stands where a record's history is loading. */
export function RecordHistorySkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <div className="mt-6">
        <CardSkeleton rows={5} />
      </div>
    </>
  );
}
