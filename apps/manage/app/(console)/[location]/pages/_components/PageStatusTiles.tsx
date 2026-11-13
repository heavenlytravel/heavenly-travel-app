import {
  PAGE_FILTER_LABELS,
  isPageInList,
  type PageFilter,
  type PageStatus,
} from "@repo/db";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PAGE_TONES } from "@repo/console/StatusBadges";
import type { PageRow } from "./PageList";

/** The tiles after "All Pages", in the order the public meets them. */
const TILES: readonly PageFilter[] = [
  "published",
  "changed",
  "unpublished",
  "paused",
];

/** A page as the tiles count it. */
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
 * The tiles over a list of pages: every page the search keeps, then each
 * status among them, each tile the list narrowed to it by `hrefOf`.
 */
export function PageStatusTiles({
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
      label: "All Pages",
      value: count(),
      href: hrefOf(undefined),
      current: status === undefined,
    },
    ...TILES.map((tile): Figure => ({
      key: tile,
      label: PAGE_FILTER_LABELS[tile],
      value: count(tile),
      tone: tile === "paused" ? "neutral" : PAGE_TONES[tile],
      href: hrefOf(tile),
      current: status === tile,
    })),
  ];
  return <FigureTiles label="Pages by status" figures={figures} />;
}
