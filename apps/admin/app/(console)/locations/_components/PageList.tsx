import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FOOTER_KEY,
  FOOTER_LABEL,
  HOME_PAGE,
  LANDING_PAGE,
  LOCATION_PAGE_LABELS,
  PAGE_FILTERS,
  PAGE_FILTER_LABELS,
  SECTIONS,
  SITE_PAGE_LABELS,
  childrenOf,
  locationPagePath,
  sitePagePath,
  type LocationPageKey,
  type PageFilter,
  type PageImage,
  type PageStatus,
} from "@repo/db";
import type {
  FooterSummary,
  PageSummary,
  SitePageSummary,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { ExternalLinkIcon, PencilIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { FilterSelect } from "../../../_components/FilterSelect";
import { SearchBox } from "../../../_components/SearchBox";
import { PageStatusBadge } from "../../../_components/StatusBadges";
import {
  EmptyRow,
  TBody,
  Td,
  Th,
  THead,
  Table,
} from "../../../_components/Table";
import {
  locationPageHref,
  locationPagesHref,
  sitePageHref,
} from "../../../_lib/routes";
import { filterOptions } from "../../../_lib/filter-options";
import { locationPreviewUrl, sitePagePreviewUrl } from "../../../_lib/site";
import {
  FoldAllButton,
  PageGroupChildren,
  PageGroupRows,
  PageGroupToggle,
  PageRowLink,
  PageTreeFolds,
} from "./PageTreeRows";

/**
 * The list of pages a location's Pages tab, a section's list and Pages
 * across locations share: a tree of each section's own page with the
 * pages under it, tied to it by a line and folding away under it, each row
 * with its picture, its name and address, its status, whether search
 * engines may list it, and its Edit and Preview as icons. A row opens its
 * page wherever it is pressed: a section's row its list, any other its
 * editor. A location's page and one of the site's own are read into the
 * same row. See docs/261025-marketing-pages.md, "The console's Pages".
 */

/** A page as a list shows it, a location's or one of the site's own. */
export type PageRow = {
  key: string;
  label: string;
  /** Its address on the customer site. */
  path: string;
  image: PageImage | null;
  status: PageStatus;
  /** A class's page whose class is off sale here: its public copy waits. */
  paused: boolean;
  /** Whether search engines may list it; null for the footer, which is no page of its own. */
  indexable: boolean | null;
  editHref: string;
  previewHref: string;
};

/** A location's page as a row; `label` when the list names it otherwise: "Main page". */
export function locationPageRow(
  locationSlug: string,
  page: PageSummary,
  label = page.name,
): PageRow {
  return {
    key: `${locationSlug}/${page.page}/${page.slug}`,
    label,
    path: locationPagePath(locationSlug, page),
    image: page.heroImage,
    status: page.status,
    paused: page.paused,
    indexable: page.indexable,
    editHref: locationPageHref(locationSlug, page),
    previewHref: locationPreviewUrl(locationSlug, page),
  };
}

/** One of the site's own pages as a row. */
export function sitePageRow(page: SitePageSummary): PageRow {
  return {
    key: `website/${page.page}`,
    label: SITE_PAGE_LABELS[page.page],
    path: sitePagePath(page.page),
    image: page.heroImage,
    status: page.status,
    paused: false,
    indexable: page.indexable,
    editHref: sitePageHref(page.page),
    previewHref: sitePagePreviewUrl(page.page),
  };
}

/** The footer as a row among the website's pages; its preview is the home page's. */
export function footerRow(footer: FooterSummary): PageRow {
  return {
    key: `website/${FOOTER_KEY}`,
    label: FOOTER_LABEL,
    path: "On every page",
    image: null,
    status: footer.status,
    paused: false,
    indexable: null,
    editHref: sitePageHref(FOOTER_KEY),
    previewHref: sitePagePreviewUrl(HOME_PAGE),
  };
}

const STATUS_OPTIONS = PAGE_FILTERS.map((value) => ({
  value,
  label: PAGE_FILTER_LABELS[value],
}));

/** What narrows a list of pages, all kept in its address. */
export type PageTreeFilters = {
  /** The list's address as filtered, without the search. */
  searchHref: string;
  q: string | undefined;
  status: PageFilter | undefined;
  statusHref: (status: PageFilter | undefined) => string;
  /** The dropdowns ahead of Status: the location, the section. */
  selects?: ReactNode;
};

/**
 * The bar over a list of pages: the search, the list's dropdowns and
 * Status, then the button that folds every section. One line where there
 * is room, the search giving way first; on a phone the search takes a line
 * and the rest two to a row.
 */
function PageTreeBar({ filters }: { filters: PageTreeFilters }) {
  return (
    <div className="grid grid-cols-2 items-center gap-2 px-6 pb-4 sm:flex sm:flex-wrap">
      <div className="col-span-2 sm:max-w-72 sm:min-w-48 sm:flex-1">
        <SearchBox
          href={filters.searchHref}
          value={filters.q ?? ""}
          label="Search pages"
          placeholder="Name or address"
          fill
        />
      </div>
      {filters.selects}
      <FilterSelect
        label="Status"
        value={filters.status ?? ""}
        options={filterOptions(
          "All statuses",
          STATUS_OPTIONS,
          filters.statusHref,
        )}
      />
      <FoldAllButton />
    </div>
  );
}

const THUMB_SIZES = { sm: "h-8 w-12", md: "h-10 w-16" };

/** A page's hero image in a list, or a plain tint while it has none. */
export function PageThumb({
  image,
  size = "md",
}: {
  image: PageImage | null;
  size?: keyof typeof THUMB_SIZES;
}) {
  return (
    <span
      className={cx(
        "relative block shrink-0 overflow-hidden rounded-md bg-slate-100",
        THUMB_SIZES[size],
      )}
    >
      {image ? (
        <Image
          src={image.url}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      ) : null}
    </span>
  );
}

/**
 * A page's picture, its name linking where its row leads, and its address
 * on the customer site under it. Both wrap where the table is narrow, but
 * keep a width of their own: wrapping anywhere would let the table squeeze
 * the column to a letter a line, so on a phone the table scrolls instead.
 */
function PageName({
  row,
  href,
  small,
}: {
  row: PageRow;
  href: string;
  small: boolean;
}) {
  return (
    <span className="flex max-w-[28rem] min-w-0 items-center gap-3">
      <PageThumb image={row.image} size={small ? "sm" : "md"} />
      <span className="min-w-40">
        <Link
          href={href}
          className="block font-medium [overflow-wrap:anywhere] text-slate-900 underline-offset-4 hover:underline"
        >
          {row.label}
        </Link>
        <span className="block text-xs [overflow-wrap:anywhere] text-slate-500">
          {row.path}
        </span>
      </span>
    </span>
  );
}

/**
 * A page under a section, in its first cell: the line down from under its
 * section's picture and the branch to it, so the list reads as a tree. The
 * last one's line stops at its branch.
 */
function UnderSection({
  last,
  children,
}: {
  last: boolean;
  children: ReactNode;
}) {
  return (
    <span className="relative -my-3 block py-3 pl-[4.25rem]">
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-0 left-12 w-px bg-slate-300",
          last ? "h-1/2" : "h-full",
        )}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-12 h-px w-3.5 bg-slate-300"
      />
      {children}
    </span>
  );
}

/** A page's status, and while it is published but kept from the public, why: a class off sale here. */
function PageStatusCell({ row }: { row: PageRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
      <PageStatusBadge status={row.status} />
      {row.paused ? <Badge tone="amber">Paused: class off</Badge> : null}
    </span>
  );
}

/** Whether search engines may list the page, its switch on the SEO tab. */
function SeoCell({ row }: { row: PageRow }) {
  if (row.indexable === null) {
    return <span className="text-slate-400">None</span>;
  }
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        row.indexable ? "text-slate-700" : "text-slate-500",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-2 rounded-full",
          row.indexable ? "bg-emerald-500" : "bg-slate-300",
        )}
      />
      {row.indexable ? "On" : "Off"}
    </span>
  );
}

/** A small square button with a tooltip naming what it does. */
function IconAction({
  label,
  children,
}: {
  label: string;
  /** The `Link` or `a` to style, its icon inside. */
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Button asChild variant="ghost" size="sm" className="w-8 px-0">
        {children}
      </Button>
    </Tooltip>
  );
}

/** A page's Edit and Preview, as icons at the end of its row; `before` goes ahead of them. */
function PageActions({ row, before }: { row: PageRow; before?: ReactNode }) {
  return (
    <span className="flex items-center justify-end gap-0.5">
      {before}
      <IconAction label="Edit">
        <Link href={row.editHref} aria-label={`Edit ${row.label}`}>
          <PencilIcon />
        </Link>
      </IconAction>
      <IconAction label="Preview the saved draft">
        <a
          href={row.previewHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Preview ${row.label}`}
        >
          <ExternalLinkIcon />
        </a>
      </IconAction>
    </span>
  );
}

/** A row of the tree: the page, and what its list adds to it. */
export type TreeRow = {
  row: PageRow;
  /** Where its row and its name lead when not its editor: a section's list. */
  href?: string;
  /** Beside its name: "Soon" on a section not bookable yet. */
  badge?: ReactNode;
  /** Its cells of the list's own columns after the name, one each. */
  lead?: readonly ReactNode[];
  /** Its cells of the list's own columns after Status and SEO, one each. */
  trail?: readonly ReactNode[];
  /** Ahead of its Edit and Preview: the plus that adds a page under a section, a place's order. */
  before?: ReactNode;
};

/** A section's own page with the pages under it; the main page or one of the site's alone. */
export type PageGroup = {
  key: string;
  own: TreeRow;
  under: readonly TreeRow[];
  /** It may have pages under it: its row folds them away. */
  folds: boolean;
  /** Under it while it has none: what the pages under it would be, on a section's list. */
  empty?: ReactNode;
};

/**
 * A location's pages as the tree's groups: the main page, then each
 * section's own page with the pages under it that `shows` keeps. Narrowed,
 * a group stays while its own page or one under it is kept, its own page
 * shown either way. A section's row leads to its list, unless the list is
 * it (`section`). `extend` adds what the list adds to each page's row.
 */
export function locationPageGroups(
  slug: string,
  pages: readonly PageSummary[],
  {
    shows,
    narrowed,
    section,
    extend,
  }: {
    shows: (page: PageSummary) => boolean;
    narrowed: boolean;
    section?: LocationPageKey;
    extend?: (page: PageSummary) => Omit<TreeRow, "row">;
  },
): PageGroup[] {
  return pages
    .filter((page) => page.slug === "")
    .flatMap((own) => {
      const under = pages.filter(
        (page) => page.page === own.page && page.slug !== "" && shows(page),
      );
      if (narrowed && !shows(own) && under.length === 0) return [];
      const folds = childrenOf(own.page) !== null;
      return [
        {
          key: `${slug}/${own.page}`,
          own: {
            row: locationPageRow(slug, own, LOCATION_PAGE_LABELS[own.page]),
            href:
              folds && own.page !== section
                ? locationPagesHref(slug, { section: own.page })
                : undefined,
            badge:
              own.page !== LANDING_PAGE && SECTIONS[own.page].comingSoon ? (
                <Badge tone="blue">Soon</Badge>
              ) : undefined,
            ...extend?.(own),
          },
          under: under.map((page) => ({
            row: locationPageRow(slug, page),
            ...extend?.(page),
          })),
          folds,
        },
      ];
    });
}

/** One row of the tree: its own page's, or one under it, `under` saying which and whether last. */
function TreeRowView({
  item,
  under,
  folds = false,
}: {
  item: TreeRow;
  under?: { last: boolean };
  folds?: boolean;
}) {
  const href = item.href ?? item.row.editHref;
  const name = (
    <PageName row={item.row} href={href} small={under !== undefined} />
  );
  return (
    <PageRowLink href={href} className={under ? "bg-slate-50/40" : "bg-white"}>
      <Td>
        {under ? (
          <UnderSection last={under.last}>{name}</UnderSection>
        ) : (
          <span className="flex items-center gap-2">
            {folds ? (
              <PageGroupToggle label={item.row.label} />
            ) : (
              <span aria-hidden="true" className="size-6 shrink-0" />
            )}
            {name}
            {item.badge}
          </span>
        )}
      </Td>
      {item.lead?.map((cell, index) => (
        <Td key={index}>{cell}</Td>
      ))}
      <Td>
        <PageStatusCell row={item.row} />
      </Td>
      <Td>
        <SeoCell row={item.row} />
      </Td>
      {item.trail?.map((cell, index) => (
        <Td key={index}>{cell}</Td>
      ))}
      <Td>
        <PageActions row={item.row} before={item.before} />
      </Td>
    </PageRowLink>
  );
}

/**
 * The tree of pages in a table, under the bar of its `filters`: Page, the
 * list's `lead` columns, Status, SEO, its `trail` columns, and the icons.
 * `empty` is what it says with no group to show.
 */
export function PageTree({
  groups,
  filters,
  lead = [],
  trail = [],
  empty,
}: {
  groups: readonly PageGroup[];
  filters: PageTreeFilters;
  lead?: readonly string[];
  trail?: readonly string[];
  empty: ReactNode;
}) {
  const columns = 4 + lead.length + trail.length;
  return (
    <PageTreeFolds
      ids={groups.filter((group) => group.folds).map((group) => group.key)}
    >
      <PageTreeBar filters={filters} />
      <Table bare>
        <THead>
          <Th>Page</Th>
          {lead.map((label) => (
            <Th key={label}>{label}</Th>
          ))}
          <Th>Status</Th>
          <Th>SEO</Th>
          {trail.map((label) => (
            <Th key={label}>{label}</Th>
          ))}
          <Th />
        </THead>
        <TBody>
          {groups.length === 0 ? (
            <EmptyRow colSpan={columns}>{empty}</EmptyRow>
          ) : null}
          {groups.map((group) => (
            <PageGroupRows key={group.key} id={group.key}>
              <TreeRowView item={group.own} folds={group.folds} />
              <PageGroupChildren>
                {group.under.map((item, index) => (
                  <TreeRowView
                    key={item.row.key}
                    item={item}
                    under={{ last: index === group.under.length - 1 }}
                  />
                ))}
                {group.empty && group.under.length === 0 ? (
                  <tr className="bg-slate-50/40">
                    <td
                      colSpan={columns}
                      className="px-4 py-3 text-sm text-slate-500"
                    >
                      <UnderSection last>{group.empty}</UnderSection>
                    </td>
                  </tr>
                ) : null}
              </PageGroupChildren>
            </PageGroupRows>
          ))}
        </TBody>
      </Table>
    </PageTreeFolds>
  );
}
