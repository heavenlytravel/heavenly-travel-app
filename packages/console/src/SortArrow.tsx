"use client";

import { cx } from "@repo/ui/cx";
import { ArrowDownIcon, ArrowUpIcon } from "@repo/ui/icons";
import { useLinkStatus } from "next/link";

/**
 * A sortable heading's arrow, inside its link: the way the list is sorted
 * by the column, shown on hover while it is not. From the click until the
 * list sorted lands it shows and pulses, so the click is seen at once.
 */
export function SortArrow({
  direction,
}: {
  direction: "ascending" | "descending" | null;
}) {
  const { pending } = useLinkStatus();
  const Arrow = direction === "descending" ? ArrowDownIcon : ArrowUpIcon;
  return (
    <Arrow
      aria-hidden="true"
      className={cx(
        "size-3",
        pending
          ? "animate-pulse text-brand"
          : direction
            ? ""
            : "opacity-0 group-hover/sort:opacity-100",
      )}
    />
  );
}
