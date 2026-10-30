import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";

/**
 * The bar across the foot of a long list's card: where in the list this
 * is, when it says, and links to the pages either side, each a small
 * secondary button. A link without an address is left out.
 */
export function PagerNav({
  summary,
  links,
}: {
  summary?: ReactNode;
  links: { label: string; href: string | null }[];
}) {
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3 text-caption"
    >
      {summary ? <p className="text-muted tabular-nums">{summary}</p> : null}
      <div className="ml-auto flex gap-1.5">
        {links.map(({ label, href }) =>
          href ? (
            <Button key={label} asChild variant="secondary" size="sm">
              <Link href={href}>{label}</Link>
            </Button>
          ) : null,
        )}
      </div>
    </nav>
  );
}

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
    <PagerNav
      summary={
        <>
          {first}–{last} of {total}
        </>
      }
      links={[
        { label: "Previous", href: page > 1 ? hrefOf(page - 1) : null },
        { label: "Next", href: page < pages ? hrefOf(page + 1) : null },
      ]}
    />
  );
}

/** A page as an address names it: a whole number from 1, else the first. */
export function pageOf(value: unknown): number {
  const page = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
