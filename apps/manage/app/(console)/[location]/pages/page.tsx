import Link from "next/link";
import {
  LOCATION_PAGES,
  LOCATION_PAGE_LABELS,
  PAGE_FILTER_LABELS,
  childrenCount,
  childrenOf,
  formatLocalDate,
  heroLabelsOf,
  isPageFilter,
  isPageInList,
  isPlace,
  locationPagePath,
  pageKeyOfSegment,
  plural,
  searchTermOf,
  type LocationPageKey,
  type PageFilter,
  type PageStatus,
} from "@repo/db";
import {
  getFooterSummary,
  listLocationPages,
  listSitePageSummaries,
  type PageSummary,
} from "@repo/db/server";
import { HouseIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { FigureStrip, type Figure } from "@repo/console/FigureTiles";
import { LocationMark } from "@repo/console/LocationMark";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { PAGE_TONES } from "@repo/console/StatusBadges";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { addressChoicesOf } from "../../../_lib/address-choices";
import { locationDetails } from "../../../_lib/location-data";
import {
  SAVED_ADDRESSES_ID,
  SEARCH_PARAM,
  classesHref,
  pagesHref,
  type ScopeSlug,
} from "../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../_lib/scope";
import { AddEntryDialog } from "./_components/EntryDialogs";
import { EntryOrder } from "./_components/EntryOrder";
import {
  PageTree,
  footerRow,
  locationPageGroups,
  sitePageRow,
  type PageGroup,
  type PagePart,
  type PageRow,
  type TreeRow,
} from "./_components/PageList";
import type { SectionOption } from "./_components/PageSectionSelect";
import {
  SavedAddresses,
  type SavedAddress,
} from "./_components/SavedAddresses";

/** What narrows the list, all kept in its address. */
type Filter = {
  section?: LocationPageKey;
  status?: PageFilter;
  q?: string;
};

/**
 * Route: /[location]/pages?section=…&status=…&q=…. The pages in one
 * tree: each section's own page with every page under it, tied to it by
 * a line and folding away under it. Under `~`, the customer site's own
 * pages for Marketing and SEO (`website.manage`: the home page, the
 * services' hubs, about us, contact us, the legal pages and the footer),
 * then every location's, each under its heading. Under a slug, the
 * location's alone, with the saved addresses its places take customers to
 * for Marketing; narrowed to a section, it is that section's list,
 * where its row leads: its places in their order, which move here, with
 * their saved address; its posts with their first publish; its classes
 * with why there is none. A section's plus adds a page under it. Over the
 * list, a strip counts the pages by status and narrows the list to one;
 * the section and a search narrow it too. A location's page is written
 * and published in its editor, under the location's address. Behind
 * `pages.manage`. See
 * docs/261025-marketing-pages.md, "The console's Pages".
 */
export default async function PagesPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages">) {
  await requireAdmin("pages.manage");
  const scope = await scopeOf(params);
  const query = await searchParams;
  const filter: Filter = {
    section: pageKeyOfSegment(query.section) ?? undefined,
    status: isPageFilter(query.status) ? query.status : undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
  };

  return (
    <>
      <PageHeader
        title="Pages"
        badge={
          <InfoTip text="A page under a section shows once the section's own page is published too. “Published, edits waiting” means the public still sees the copy last published." />
        }
      />
      <Streamed
        key={JSON.stringify(filter)}
        fallback={
          <div className="grid gap-5">
            <Bone className="h-[5.25rem] w-full" />
            <TableSkeleton columns={5} rows={10} />
            {scope.location ? <CardSkeleton rows={3} /> : null}
          </div>
        }
      >
        {() =>
          scope.location
            ? locationPages(scope.location.id, filter)
            : everyPage(filter)
        }
      </Streamed>
    </>
  );
}

/** The strip's cells after "All pages", in the order the public meets them. */
const STRIP: readonly PageFilter[] = [
  "published",
  "changed",
  "unpublished",
  "paused",
];

/** A page as the strip counts it. */
type Counted = {
  name: string;
  path: string;
  status: PageStatus;
  paused: boolean;
};

const countedOfRow = (row: PageRow): Counted => ({
  name: row.label,
  path: row.path,
  status: row.status,
  paused: row.paused,
});

const countedOfPage = (slug: string, page: PageSummary): Counted => ({
  name: page.name,
  path: locationPagePath(slug, page),
  status: page.status,
  paused: page.paused,
});

/**
 * The strip over the list: every page the section and the search keep,
 * then each status among them, each cell the list narrowed to it.
 */
function StatusStrip({
  scope,
  pages,
  filter,
}: {
  scope: ScopeSlug;
  pages: readonly Counted[];
  filter: Filter;
}) {
  const count = (status?: PageFilter) =>
    pages.filter((page) =>
      isPageInList(page, page.path, { status, q: filter.q }),
    ).length;
  const figures: Figure[] = [
    {
      key: "all",
      label: "All pages",
      value: count(),
      href: pagesHref(scope, { ...filter, status: undefined }),
      current: filter.status === undefined,
    },
    ...STRIP.map((status): Figure => ({
      key: status,
      label: PAGE_FILTER_LABELS[status],
      value: count(status),
      tone: status === "paused" ? "neutral" : PAGE_TONES[status],
      href: pagesHref(scope, { ...filter, status }),
      current: filter.status === status,
    })),
  ];
  return <FigureStrip label="Pages by status" figures={figures} />;
}

/** "All sections", then each of `sections`, each with the list's address narrowed to it. */
function sectionOptions(
  scope: ScopeSlug,
  filter: Filter,
  sections: readonly LocationPageKey[],
): SectionOption[] {
  return [
    {
      value: "",
      label: "All sections",
      href: pagesHref(scope, { ...filter, section: undefined }),
    },
    ...sections.map((section) => ({
      value: section,
      label: LOCATION_PAGE_LABELS[section],
      href: pagesHref(scope, { ...filter, section }),
    })),
  ];
}

/** What the list says with nothing to show. */
const emptyOf = (filter: Filter) =>
  filter.q ? `No page matches “${filter.q}”.` : "No page has this status.";

/** How many pages a part shows: each section's own and those under it. */
const pagesIn = (groups: readonly PageGroup[]) =>
  groups.reduce((sum, group) => sum + 1 + group.under.length, 0);

/**
 * Under `~`: the website's pages for Marketing and SEO, which belong to no section,
 * then every location's the person may see, each under its heading,
 * which opens the location's own Pages.
 */
async function everyPage(filter: Filter) {
  const [permissions, visible] = await Promise.all([
    getPermissions(),
    locationsVisible(),
  ]);
  const website = permissions.includes("website.manage") && !filter.section;
  const [lists, sitePages, footer] = await Promise.all([
    listLocationPages(),
    website ? listSitePageSummaries() : [],
    website ? getFooterSummary() : null,
  ]);
  const seen = new Set(visible.map((location) => location.id));
  const narrowed = filter.status !== undefined || filter.q !== undefined;
  const parts: PagePart[] = [];
  const counted: Counted[] = [];

  const websiteRows = [
    ...sitePages.map(sitePageRow),
    ...(footer ? [footerRow(footer)] : []),
  ];
  counted.push(...websiteRows.map(countedOfRow));
  const websiteGroups: PageGroup[] = websiteRows
    .filter((row) => isPageInList(countedOfRow(row), row.path, filter))
    .map((row) => ({ key: row.key, own: { row }, under: [], folds: false }));
  if (websiteGroups.length > 0) {
    parts.push({
      key: "part:website",
      heading: {
        label: "Website",
        mark: <HouseIcon className="size-4 text-muted" />,
        meta: plural(websiteGroups.length, "page"),
      },
      groups: websiteGroups,
    });
  }

  for (const location of lists) {
    if (!seen.has(location.id)) continue;
    const { slug } = location;
    const pages = filter.section
      ? location.pages.filter((page) => page.page === filter.section)
      : location.pages;
    counted.push(...pages.map((page) => countedOfPage(slug, page)));
    const groups = locationPageGroups(slug, pages, {
      shows: (page) => isPageInList(page, locationPagePath(slug, page), filter),
      narrowed,
      section: filter.section,
    });
    if (groups.length === 0) continue;
    parts.push({
      key: `part:${slug}`,
      heading: {
        label: location.name,
        mark: <LocationMark name={location.name} state={location.state} />,
        href: pagesHref(slug),
        meta: plural(pagesIn(groups), "page"),
      },
      groups,
    });
  }

  return (
    <>
      <StatusStrip scope={null} pages={counted} filter={filter} />
      <Card flush>
        <PageTree
          parts={parts}
          filters={{
            searchHref: pagesHref(null, { ...filter, q: undefined }),
            q: filter.q,
            sections: sectionOptions(null, filter, LOCATION_PAGES),
            section: filter.section ?? "",
          }}
          empty={emptyOf(filter)}
        />
      </Card>
    </>
  );
}

/**
 * Under a slug: the location's pages, a section's plus to add one under
 * it, a place's order on its section's list, then its saved addresses.
 */
async function locationPages(id: string, filter: Filter) {
  const [location, permissions] = await Promise.all([
    locationDetails(id),
    getPermissions(),
  ]);
  if (!location) notFound();
  const slug = location.slug;
  const { section, status, q } = filter;
  const narrowed = status !== undefined || q !== undefined;
  const shows = (page: PageSummary) =>
    isPageInList(page, locationPagePath(slug, page), { status, q });
  const choices = addressChoicesOf(location);
  const listed = section
    ? location.pages.filter((page) => page.page === section)
    : location.pages;
  const children = section ? childrenOf(section) : null;
  const isPlaces = children?.type === "entries" && children.kind === "place";
  const isPosts = children?.type === "entries" && children.kind === "article";
  const addressNames = new Map(
    location.addresses.map((address) => [address.id, address.name]),
  );
  // Places move on their section's list, while it shows them all.
  const order = section
    ? listed.filter((page) => page.slug !== "" && shows(page))
    : [];
  const ordered = children?.type === "entries" && children.ordered && !narrowed;

  /** What the list adds to a page's row: a section's plus, a place's order, the columns of a section's list. */
  const extend = (page: PageSummary): Omit<TreeRow, "row"> => {
    const own = childrenOf(page.page);
    if (page.slug === "") {
      return {
        lead: isPlaces || isPosts ? [null] : undefined,
        before:
          own?.type === "entries" ? (
            <AddEntryDialog
              locationId={location.id}
              locationSlug={slug}
              page={page.page}
              one={own.one}
              titleLabel={heroLabelsOf(own.kind).headline}
              places={own.kind === "place" ? choices : undefined}
            />
          ) : undefined,
      };
    }
    const index = order.indexOf(page);
    return {
      lead: isPlaces
        ? [
            <span key="address" className="text-muted">
              {(page.addressId && addressNames.get(page.addressId)) ?? "—"}
            </span>,
          ]
        : isPosts
          ? [
              <span key="first" className="text-muted tabular-nums">
                {page.firstPublishedAt
                  ? formatLocalDate(page.firstPublishedAt)
                  : "Not yet"}
              </span>,
            ]
          : undefined,
      before: ordered ? (
        <EntryOrder
          locationId={location.id}
          page={page.page}
          slug={page.slug}
          name={page.name}
          isFirst={index === 0}
          isLast={index === order.length - 1}
        />
      ) : undefined,
    };
  };

  const groups: PageGroup[] = locationPageGroups(slug, listed, {
    shows,
    narrowed,
    section,
    extend,
  }).map((group) =>
    section && children && !narrowed
      ? {
          ...group,
          empty:
            children.type === "classes" ? (
              <>
                No class of {LOCATION_PAGE_LABELS[section].toLowerCase()} is
                offered here yet.{" "}
                <Link
                  href={classesHref(slug)}
                  className="font-medium text-brand underline-offset-4 hover:underline"
                >
                  Offer one on Classes
                </Link>
                .
              </>
            ) : (
              `No ${children.many} yet. Add one with the plus.`
            ),
        }
      : group,
  );
  const under = section ? listed.filter((page) => page.slug !== "").length : 0;

  const addresses: SavedAddress[] = location.addresses.map((address) => {
    const spot = isPlace(address.place) ? address.place : null;
    return {
      id: address.id,
      name: address.name,
      placeId: spot?.placeId ?? "",
      placeLabel: spot?.label ?? "",
      placeAddress: spot?.address ?? "",
      usedBy: address.usedBy,
      isStray: address.isStray,
    };
  });

  return (
    <>
      <StatusStrip
        scope={slug}
        pages={listed.map((page) => countedOfPage(slug, page))}
        filter={filter}
      />
      <div className="grid gap-5">
        <Card flush>
          {section && children ? (
            <CardTitle
              inset
              meta={
                children.type === "classes"
                  ? `${childrenCount(children, under)}, a page for each class ${location.name} offers`
                  : children.ordered
                    ? `${childrenCount(children, under)}, shown on the site in this order`
                    : `${childrenCount(children, under)}, shown on the site newest first`
              }
            >
              {LOCATION_PAGE_LABELS[section]}
            </CardTitle>
          ) : null}
          <PageTree
            parts={groups.length > 0 ? [{ key: `part:${slug}`, groups }] : []}
            filters={{
              searchHref: pagesHref(slug, { section, status }),
              q,
              sections: sectionOptions(
                slug,
                filter,
                location.pages
                  .filter((page) => page.slug === "")
                  .map((page) => page.page),
              ),
              section: section ?? "",
            }}
            lead={
              isPlaces ? ["Saved address"] : isPosts ? ["First published"] : []
            }
            empty={emptyOf(filter)}
          />
        </Card>

        {/* The saved addresses are Marketing's (`locations.manage`), not SEO's. */}
        {section || !permissions.includes("locations.manage") ? null : (
          <SavedAddresses
            id={SAVED_ADDRESSES_ID}
            locationId={location.id}
            locationSlug={slug}
            area={choices.area}
            addresses={addresses}
          />
        )}
      </div>
    </>
  );
}
