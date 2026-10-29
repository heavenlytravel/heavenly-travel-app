import Link from "next/link";
import { Button } from "@repo/ui/button";

/**
 * Where a long list is: "51–100 of 340", with the pages before and after
 * as links, each keeping the list's filters. Nothing when one page holds
 * it all.
 */
export function Pager({
  page,
  pageSize,
  total,
  hrefOf,
}: {
  /** From 1. */
  page: number;
  pageSize: number;
  total: number;
  hrefOf: (page: number) => string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3 text-caption"
    >
      <p className="text-muted tabular-nums">
        {first}–{last} of {total}
      </p>
      <div className="flex gap-1.5">
        {page > 1 ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={hrefOf(page - 1)}>Previous</Link>
          </Button>
        ) : null}
        {page < pages ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={hrefOf(page + 1)}>Next</Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

/** A page as an address names it: a whole number from 1, else the first. */
export function pageOf(value: unknown): number {
  const page = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
