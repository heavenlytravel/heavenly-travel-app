import Link from "next/link";

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
  const link =
    "rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100";
  return (
    <nav
      aria-label="Pages"
      className="mt-3 flex items-center justify-between gap-3 text-sm"
    >
      <p className="text-neutral-600 tabular-nums">
        {first}–{last} of {total}
      </p>
      <div className="flex gap-1">
        {page > 1 ? (
          <Link href={hrefOf(page - 1)} className={link}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={hrefOf(page + 1)} className={link}>
            Next
          </Link>
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
