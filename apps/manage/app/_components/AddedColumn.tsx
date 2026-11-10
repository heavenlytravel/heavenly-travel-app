import {
  formatLocalDate,
  madeDirectionOf,
  nextMadeOrder,
  type MadeOrder,
} from "@repo/db";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@repo/ui/cx";
import { SortArrow } from "@repo/console/SortArrow";
import { SortTh, Td } from "@repo/console/Table";

/**
 * A list's order by when its rows were added, as a table's heading sorts
 * it: the order in force, none for the list's own, and the list in
 * another. `fallback` is the list's own order where that is by date.
 */
export type MadeSort = {
  order?: MadeOrder;
  hrefOf: (order: MadeOrder) => string;
  fallback?: MadeOrder;
};

/** The heading that sorts a list by when its rows were added, "Added" unless named. */
export function AddedTh({
  sort,
  children = "Added",
}: {
  sort: MadeSort;
  children?: ReactNode;
}) {
  return (
    <SortTh
      href={sort.hrefOf(nextMadeOrder(sort.order, sort.fallback))}
      direction={madeDirectionOf(sort.order, sort.fallback)}
    >
      {children}
    </SortTh>
  );
}

/**
 * The same for a list of cards, which has no heading: "Date added", a
 * link that sorts it by when each was added, the other way while it is,
 * its arrow the way in force.
 */
export function AddedSortLink({ sort }: { sort: MadeSort }) {
  const direction = madeDirectionOf(sort.order, sort.fallback);
  return (
    <Link
      href={sort.hrefOf(nextMadeOrder(sort.order, sort.fallback))}
      scroll={false}
      className={cx(
        "group/sort inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:text-ink focus-ring",
        direction ? "text-ink" : "text-muted",
      )}
    >
      Date added
      <SortArrow direction={direction} />
    </Link>
  );
}

/** The day a row was added, under `AddedTh`. */
export function AddedTd({ at }: { at: Date }) {
  return (
    <Td className="whitespace-nowrap text-body tabular-nums">
      {formatLocalDate(at)}
    </Td>
  );
}
