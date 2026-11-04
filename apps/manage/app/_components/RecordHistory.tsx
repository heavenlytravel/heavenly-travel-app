import Link from "next/link";
import { describeActivity, formatLocalDate, formatLocalTime } from "@repo/db";
import { listActivityFor, type ActivityEntry } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { HistoryIcon } from "@repo/ui/icons";
import {
  Card,
  CARD_LINK,
  CardRow,
  CardRows,
  CardTitle,
} from "@repo/console/Card";
import { PageHeader, RecordLink } from "@repo/console/PageHeader";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import type { ScopeSlug } from "../_lib/routes";
import type { ConsoleScope } from "../_lib/scope";
import { HistoryTimeline } from "./HistoryTimeline";

/** "History" in a record's header: the way to the record's history page, as a quiet button. */
export function HistoryLink({ href }: { href: string }) {
  return (
    <Button asChild variant="secondary">
      <Link href={href}>
        <HistoryIcon className="size-4 text-muted" />
        History
      </Link>
    </Button>
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
 * One record's history page: "History", the record's name under it as
 * the way back to it, and every change to it, newest first, by day. A vehicle, a driver, a class and a booking
 * each have one, which their header links to with `HistoryLink`.
 */
export function RecordHistory({
  record,
  entries,
  emptyMessage,
}: {
  /** The record's page and its name: "KV589E". */
  record: { href: string; label: string };
  /** Oldest first, as the log reads them. */
  entries: readonly ActivityEntry[];
  emptyMessage: string;
}) {
  return (
    <>
      <PageHeader
        title="History"
        meta={<RecordLink href={record.href}>{record.label}</RecordLink>}
      />
      <HistoryTimeline entries={entries} emptyMessage={emptyMessage} />
    </>
  );
}

/** What stands where a record's history is loading. */
export function RecordHistorySkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <CardSkeleton rows={5} />
    </>
  );
}

/**
 * A vehicle's, a driver's or a tour guide's history page, once the page
 * has checked access: the record read with its log, not found when it is
 * gone, or based outside the location the console is scoped to.
 */
export function FleetRecordHistory({
  scope,
  entityType,
  id,
  load,
  hrefOf,
  noun,
}: {
  scope: ConsoleScope;
  entityType: "vehicle" | "driver" | "guide";
  id: string;
  /** The record by its id, named as its page names it: a plate, a name. */
  load: (
    id: string,
  ) => Promise<{ id: string; locationId: string; label: string } | null>;
  hrefOf: (scope: ScopeSlug, id: string) => string;
  /** "driver", "tour guide": in the empty log's line. */
  noun: string;
}) {
  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {async () => {
        const [record, entries] = await Promise.all([
          load(id),
          listActivityFor(entityType, id),
        ]);
        if (!record) notFound();
        if (scope.location && record.locationId !== scope.location.id) {
          notFound();
        }
        return (
          <RecordHistory
            record={{
              href: hrefOf(scope.slug, record.id),
              label: record.label,
            }}
            entries={entries}
            emptyMessage={`No changes recorded for this ${noun}.`}
          />
        );
      }}
    </Streamed>
  );
}
