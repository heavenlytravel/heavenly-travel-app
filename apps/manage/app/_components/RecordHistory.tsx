import Link from "next/link";
import { describeActivity, formatLocalDate, formatLocalTime } from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import { HistoryIcon } from "@repo/ui/icons";
import {
  Card,
  CARD_LINK,
  CardRow,
  CardRows,
  CardTitle,
} from "@repo/console/Card";
import { BackLink, PageHeader } from "@repo/console/PageHeader";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
} from "@repo/console/Skeleton";
import { HistoryTimeline } from "./HistoryTimeline";

/** "History" in a record's header: the way to the record's history page, as a quiet button. */
export function HistoryLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-edge bg-white px-3 text-sm font-semibold text-body shadow-control transition-colors hover:border-slate-300 hover:text-ink"
    >
      <HistoryIcon className="size-4 text-muted" />
      History
    </Link>
  );
}

/**
 * A record's last few changes, newest first, in a card beside the record,
 * with "All" leading to its history page (`recordHistoryHref`).
 */
export function HistoryCard({
  href,
  entries,
  count = 4,
}: {
  href: string;
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  count?: number;
}) {
  const latest = entries.slice(-count).reverse();
  return (
    <Card flush>
      <CardTitle
        inset
        action={
          <Link href={href} className={CARD_LINK}>
            All
          </Link>
        }
      >
        History
      </CardTitle>
      {latest.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">Nothing recorded yet.</p>
      ) : (
        <CardRows>
          {latest.map((entry) => (
            <CardRow
              key={entry.id}
              className="items-start justify-between text-sm"
            >
              <span className="min-w-0">
                <span className="block font-medium text-body">
                  {describeActivity(entry)}
                </span>
                <span className="block text-xs text-muted">
                  {formatLocalDate(entry.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {formatLocalTime(entry.createdAt)}
              </span>
            </CardRow>
          ))}
        </CardRows>
      )}
    </Card>
  );
}

/**
 * One record's history page: the way back to the record, by its name,
 * then "History" with the record's name beside it, and every change to
 * it, newest first, by day. A vehicle, a driver, a class and a booking
 * each have one, which their header links to with `HistoryLink`.
 */
export function RecordHistory({
  section,
  back,
  entries,
  emptyMessage,
}: {
  /** The section label over the title: "Fleet", "Bookings". */
  section?: string;
  /** The record's page and its name: "KV589E". */
  back: { href: string; label: string };
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  emptyMessage: string;
}) {
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <PageHeader section={section} title={`History of ${back.label}`} />
      <HistoryTimeline entries={entries} emptyMessage={emptyMessage} />
    </>
  );
}

/** What stands where a record's history is loading. */
export function RecordHistorySkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <CardSkeleton rows={5} />
    </>
  );
}
