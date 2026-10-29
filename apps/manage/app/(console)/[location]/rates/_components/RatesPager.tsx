import Link from "next/link";
import { cx } from "@repo/ui/cx";
import { ArrowLeftIcon, ArrowRightIcon } from "@repo/ui/icons";
import { SURFACE } from "@repo/console/Card";
import {
  RATES_PAGES,
  RATES_PAGE_LABELS,
  ratesHref,
  type RatesPage,
  type ScopeSlug,
} from "../../../../_lib/routes";

/**
 * The foot of each of Rates' pages: a card for the page before it and one
 * for the page after, in `RATES_PAGES` order, so the four read in order
 * without tabs. The first has no "Before", the last no "Next".
 */
export function RatesPager({
  scope,
  page,
}: {
  scope: ScopeSlug;
  page: RatesPage;
}) {
  const at = RATES_PAGES.indexOf(page);
  const before = RATES_PAGES[at - 1];
  const next = RATES_PAGES[at + 1];

  return (
    <nav aria-label="Rates' pages" className="mt-6 grid gap-4 sm:grid-cols-2">
      {before ? (
        <PagerCard href={ratesHref(scope, before)} way="Before">
          {RATES_PAGE_LABELS[before]}
        </PagerCard>
      ) : null}
      {next ? (
        <PagerCard href={ratesHref(scope, next)} way="Next">
          {RATES_PAGE_LABELS[next]}
        </PagerCard>
      ) : null}
    </nav>
  );
}

function PagerCard({
  href,
  way,
  children,
}: {
  href: string;
  way: "Before" | "Next";
  children: string;
}) {
  const after = way === "Next";
  const Arrow = after ? ArrowRightIcon : ArrowLeftIcon;
  return (
    <Link
      href={href}
      rel={after ? "next" : "prev"}
      className={cx(
        SURFACE,
        "flex items-center gap-4 px-5 py-4 transition-colors outline-none hover:border-edge hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand",
        after && "flex-row-reverse text-right sm:col-start-2",
      )}
    >
      <Arrow className="size-4 shrink-0 text-muted" />
      <span className="grid min-w-0">
        <span className="text-[12.5px] text-muted">{way}</span>
        <span className="truncate text-[15px] font-semibold text-ink">
          {children}
        </span>
      </span>
    </Link>
  );
}
