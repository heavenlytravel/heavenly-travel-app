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
    "inline-flex h-8 items-center rounded-lg border border-edge bg-white px-3 font-semibold text-body transition-colors hover:border-slate-300 hover:text-ink";
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3 text-[13px]"
    >
      <p className="text-muted tabular-nums">
        {first}–{last} of {total}
      </p>
      <div className="flex gap-1.5">
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
