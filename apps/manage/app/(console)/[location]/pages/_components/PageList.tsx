import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FOOTER_KEY,
  FOOTER_LABEL,
  HOME_PAGE,
  LANDING_PAGE,
  LOCATION_PAGE_LABELS,
  SECTIONS,
  SITE_PAGE_LABELS,
  childrenOf,
  formatLocalDate,
  locationPagePath,
  sitePagePath,
  type LocationPageKey,
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
import { PageStatusBadge } from "@repo/console/StatusBadges";
import { EmptyRow, TBody, Td, Th, THead, Table } from "@repo/console/Table";
import { SearchBox } from "../../../../_components/SearchBox";
import {
  locationPageHref,
  pagesHref,
  sitePageHref,
} from "../../../../_lib/routes";
import { locationPreviewUrl, sitePagePreviewUrl } from "../../../../_lib/site";
import { PageSectionSelect, type SectionOption } from "./PageSectionSelect";
import {
  FoldAllToggle,
  PageGroupChildren,
  PageGroupRows,
  PageGroupToggle,
  PagePartChildren,
  PagePartRows,
  PagePartToggle,
  PageRowLink,
  PageTreeFolds,
} from "./PageTreeRows";

/**
 * The list of pages on Pages, in every scope: a tree of each section's
 * own page with the pages under it, tied to it by a line and folding away
 * under it; under `~`, in parts, the website's own pages and then each
 * location's, each under a heading that folds too. Each row has its
 * picture, its name and address, its status, whether search engines may
 * list it, when it last changed, and its Edit and Preview as icons. A row
 * opens its page wherever it is pressed: a section's row its list, any
 * other its editor. A location's page and one of the site's own are read
 * into the same row. See docs/261025-marketing-pages.md, "The console's
 * Pages".
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
  /** When its draft or its public copy last changed; null for one never written. */
  changedAt: Date | null;
  editHref: string;
  previewHref: string;
};

/** A location's page as a row; `label` when the list names it otherwise: "Main page". */
function locationPageRow(
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
    changedAt: page.updatedAt,
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
    changedAt: page.updatedAt,
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
    changedAt: footer.updatedAt,
    editHref: sitePageHref(FOOTER_KEY),
    previewHref: sitePagePreviewUrl(HOME_PAGE),
  };
}

/** What narrows a list of pages over it, all kept in its address; the status is the strip's. */
type PageTreeFilters = {
  /** The list's address as filtered, without the search. */
  searchHref: string;
  q: string | undefined;
  /** "All sections", then each section, each with the list's address narrowed to it. */
  sections: readonly SectionOption[];
  /** The section in force; "" for every section. */
  section: string;
};

/**
 * The bar over a list of pages: the search and the section. One line
 * where there is room; on a phone each takes a line.
 */
function PageTreeBar({ filters }: { filters: PageTreeFilters }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchBox
        href={filters.searchHref}
        value={filters.q ?? ""}
        label="Search pages"
        placeholder="Name or address"
      />
      <PageSectionSelect options={filters.sections} value={filters.section} />
    </div>
  );
}

const THUMB_SIZES = { sm: "h-8 w-12", md: "h-10 w-16" };

/** A page's hero image in a list, or a plain tint while it has none. */
function PageThumb({
  image,
  size = "md",
}: {
  image: PageImage | null;
  size?: keyof typeof THUMB_SIZES;
}) {
  return (
    <span
      className={cx(
        "relative block shrink-0 overflow-hidden rounded-md bg-canvas",
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
          className="block font-medium [overflow-wrap:anywhere] text-ink underline-offset-4 hover:underline"
        >
          {row.label}
        </Link>
        <span className="block text-xs [overflow-wrap:anywhere] text-muted">
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
          "absolute top-0 left-12 w-px bg-edge",
          last ? "h-1/2" : "h-full",
        )}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-12 h-px w-3.5 bg-edge"
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
      {row.paused ? <Badge dot>Paused: class off</Badge> : null}
    </span>
  );
}

/** Whether search engines may list the page, its switch under SEO in the editor. */
function SearchEnginesCell({ row }: { row: PageRow }) {
  if (row.indexable === null) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        row.indexable ? "text-body" : "text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-2 rounded-full",
          row.indexable ? "bg-success" : "bg-edge",
        )}
      />
      {row.indexable ? "Shown" : "Hidden"}
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
      <Button asChild variant="ghost" size="icon-sm">
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

/** The heading over a part of the list under `~`: the website, or a location. */
type PartHeading = {
  label: string;
  /** Ahead of the name: the location's mark, the website's house. */
  mark: ReactNode;
  /** The part's own list: a location's Pages, with its saved addresses. */
  href?: string;
  /** Beside the name: how many pages it shows. */
  meta?: string;
};

/** A part of the list: the website's pages or a location's, under its heading; one location's alone, without one. */
export type PagePart = {
  key: string;
  heading?: PartHeading;
  groups: readonly PageGroup[];
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
                ? pagesHref(slug, { section: own.page })
                : undefined,
            badge:
              own.page !== LANDING_PAGE && SECTIONS[own.page].comingSoon ? (
                <Badge tone="brand">Soon</Badge>
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
    <PageRowLink href={href} className={under ? "bg-shade/50" : undefined}>
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
        <SearchEnginesCell row={item.row} />
      </Td>
      <Td className="whitespace-nowrap text-muted tabular-nums">
        {item.row.changedAt ? formatLocalDate(item.row.changedAt) : "Not yet"}
      </Td>
      <Td>
        <PageActions row={item.row} before={item.before} />
      </Td>
    </PageRowLink>
  );
}

/** A section with the pages under it, folding away under its row. */
function GroupRows({ group, columns }: { group: PageGroup; columns: number }) {
  return (
    <PageGroupRows id={group.key}>
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
          <tr className="bg-shade/50">
            <td colSpan={columns} className="px-5 py-3 text-sm text-muted">
              <UnderSection last>{group.empty}</UnderSection>
            </td>
          </tr>
        ) : null}
      </PageGroupChildren>
    </PageGroupRows>
  );
}

/** A part's heading across the table: its fold, its mark and name, and how many pages it shows. */
function PartHeadingRow({
  heading,
  columns,
}: {
  heading: PartHeading;
  columns: number;
}) {
  return (
    <tr className="bg-shade">
      <td colSpan={columns} className="px-5 py-2.5">
        <span className="flex items-center gap-2">
          <PagePartToggle label={heading.label} />
          {heading.mark}
          {heading.href ? (
            <Link
              href={heading.href}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              {heading.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{heading.label}</span>
          )}
          {heading.meta ? (
            <span className="text-caption text-muted">{heading.meta}</span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}

/**
 * The tree of pages in a table, under the bar of its `filters`: Page, the
 * list's `lead` columns, Status, Search engines, Changed, and the icons;
 * each part under its heading where it has one. `empty` is what it says
 * with no group to show.
 */
export function PageTree({
  parts,
  filters,
  lead = [],
  empty,
}: {
  parts: readonly PagePart[];
  filters: PageTreeFilters;
  lead?: readonly string[];
  empty: ReactNode;
}) {
  const columns = 5 + lead.length;
  const folds = parts.flatMap((part) => [
    ...(part.heading ? [part.key] : []),
    ...part.groups.filter((group) => group.folds).map((group) => group.key),
  ]);
  return (
    <PageTreeFolds ids={folds}>
      <PageTreeBar filters={filters} />
      <Table bare>
        <THead>
          <Th>
            <span className="flex items-center gap-2">
              <FoldAllToggle />
              Page
            </span>
          </Th>
          {lead.map((label) => (
            <Th key={label}>{label}</Th>
          ))}
          <Th>Status</Th>
          <Th>Search engines</Th>
          <Th>Changed</Th>
          <Th />
        </THead>
        <TBody>
          {parts.length === 0 ? (
            <EmptyRow colSpan={columns}>{empty}</EmptyRow>
          ) : null}
          {parts.map((part) => (
            <PagePartRows key={part.key} id={part.key}>
              {part.heading ? (
                <PartHeadingRow heading={part.heading} columns={columns} />
              ) : null}
              <PagePartChildren>
                {part.groups.map((group) => (
                  <GroupRows key={group.key} group={group} columns={columns} />
                ))}
              </PagePartChildren>
            </PagePartRows>
          ))}
        </TBody>
      </Table>
    </PageTreeFolds>
  );
}
