import {
  PAGE_FILTER_LABELS,
  isPageInList,
  type PageFilter,
  type PageStatus,
} from "@repo/db";
import { FigureStrip, type Figure } from "@repo/console/FigureTiles";
import { PAGE_TONES } from "@repo/console/StatusBadges";
import type { PageRow } from "./PageList";

/** The strip's cells after "All pages", in the order the public meets them. */
const STRIP: readonly PageFilter[] = [
  "published",
  "changed",
  "unpublished",
  "paused",
];

/** A page as the strip counts it. */
export type Counted = {
  name: string;
  path: string;
  status: PageStatus;
  paused: boolean;
};

export const countedOfRow = (row: PageRow): Counted => ({
  name: row.label,
  path: row.path,
  status: row.status,
  paused: row.paused,
});

/** What the list says with nothing to show. */
export const emptyOf = (q: string | undefined) =>
  q ? `No page matches “${q}”.` : "No page has this status.";

/**
 * The strip over a list of pages: every page the search keeps, then each
 * status among them, each cell the list narrowed to it by `hrefOf`.
 */
export function PageStatusStrip({
  pages,
  status,
  q,
  hrefOf,
}: {
  pages: readonly Counted[];
  status: PageFilter | undefined;
  q: string | undefined;
  hrefOf: (status?: PageFilter) => string;
}) {
  const count = (only?: PageFilter) =>
    pages.filter((page) => isPageInList(page, page.path, { status: only, q }))
      .length;
  const figures: Figure[] = [
    {
      key: "all",
      label: "All pages",
      value: count(),
      href: hrefOf(undefined),
      current: status === undefined,
    },
    ...STRIP.map((cell): Figure => ({
      key: cell,
      label: PAGE_FILTER_LABELS[cell],
      value: count(cell),
      tone: cell === "paused" ? "neutral" : PAGE_TONES[cell],
      href: hrefOf(cell),
      current: status === cell,
    })),
  ];
  return <FigureStrip label="Pages by status" figures={figures} />;
}
