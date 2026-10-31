import Link from "next/link";
import {
  LOCATION_PAGES,
  LOCATION_PAGE_LABELS,
  childrenCount,
  childrenOf,
  formatLocalDate,
  heroLabelsOf,
  isPageInList,
  isPlace,
  isPageFilter,
  locationPagePath,
  pageKeyOfSegment,
  plural,
  searchTermOf,
  type LocationPageKey,
  type PageFilter,
} from "@repo/db";
import { listLocationPages, type PageSummary } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { getPermissions } from "../../../../_lib/access";
import { addressChoicesOf } from "../../../../_lib/address-choices";
import { locationDetails } from "../../../../_lib/location-data";
import {
  SAVED_ADDRESSES_ID,
  SEARCH_PARAM,
  classesHref,
  pagesHref,
  type ScopeSlug,
} from "../../../../_lib/routes";
import { locationsVisible, type ConsoleScope } from "../../../../_lib/scope";
import { AddEntryDialog } from "./EntryDialogs";
import { EntryOrder } from "./EntryOrder";
import {
  PageTree,
  locationPageGroups,
  type PageGroup,
  type PagePart,
  type TreeRow,
} from "./PageList";
import type { SectionOption } from "./PageSectionSelect";
import { PageStatusStrip, emptyOf, type Counted } from "./PageStatusStrip";
import { SavedAddresses, type SavedAddress } from "./SavedAddresses";

/** What narrows the list, all kept in its address. */
export type LocationPagesFilter = {
  section?: LocationPageKey;
  status?: PageFilter;
  q?: string;
};

/** The list's filter, read off its address. */
export function locationPagesFilterOf(
  query: Record<string, string | string[] | undefined>,
): LocationPagesFilter {
  return {
    section: pageKeyOfSegment(query.section) ?? undefined,
    status: isPageFilter(query.status) ? query.status : undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
  };
}

/**
 * The locations' pages in one tree: each section's own page with every
 * page under it, tied to it by a line and folding away under it. Under
 * `~`, at /~/pages/locations, every location's, each under its heading,
 * which opens the location's own Pages; under a slug, at /[slug]/pages,
 * the location's alone, with the saved addresses its places take
 * customers to for Marketing. Narrowed to a section, it is that section's
 * list, where its row leads: its places in their order, which move here,
 * with their saved address; its posts with their first publish; its
 * classes with why there is none. A section's plus adds a page under it.
 * Over the list, a strip counts the pages by status and narrows the list
 * to one; the section and a search narrow it too. A location's page is
 * written and published in its editor, under the location's address. The
 * route checks `pages.manage` first. See docs/261025-marketing-pages.md,
 * "The console's Pages".
 */
export function LocationPagesScreen({
  scope,
  filter,
}: {
  scope: ConsoleScope;
  filter: LocationPagesFilter;
}) {
  return (
    <>
      <PageHeader
        title="Location Pages"
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

const countedOfPage = (slug: string, page: PageSummary): Counted => ({
  name: page.name,
  path: locationPagePath(slug, page),
  status: page.status,
  paused: page.paused,
});

/** The strip over a list of a location's pages, or every location's, each cell the list narrowed to a status. */
function StatusStrip({
  scope,
  pages,
  filter,
}: {
  scope: ScopeSlug;
  pages: readonly Counted[];
  filter: LocationPagesFilter;
}) {
  return (
    <PageStatusStrip
      pages={pages}
      status={filter.status}
      q={filter.q}
      hrefOf={(status) => pagesHref(scope, { ...filter, status })}
    />
  );
}

/** "All sections", then each of `sections`, each with the list's address narrowed to it. */
function sectionOptions(
  scope: ScopeSlug,
  filter: LocationPagesFilter,
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

/** How many pages a part shows: each section's own and those under it. */
const pagesIn = (groups: readonly PageGroup[]) =>
  groups.reduce((sum, group) => sum + 1 + group.under.length, 0);

/**
 * Under `~`: every location's pages the person may see, each under its
 * heading, which opens the location's own Pages. The website's and
 * Connect's have Pages' rows of their own.
 */
async function everyPage(filter: LocationPagesFilter) {
  const [lists, visible] = await Promise.all([
    listLocationPages(),
    locationsVisible(),
  ]);
  const seen = new Set(visible.map((location) => location.id));
  const narrowed = filter.status !== undefined || filter.q !== undefined;
  const parts: PagePart[] = [];
  const counted: Counted[] = [];

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
            sections: {
              options: sectionOptions(null, filter, LOCATION_PAGES),
              value: filter.section ?? "",
            },
          }}
          empty={emptyOf(filter.q)}
        />
      </Card>
    </>
  );
}

/**
 * Under a slug: the location's pages, a section's plus to add one under
 * it, a place's order on its section's list, then its saved addresses.
 */
async function locationPages(id: string, filter: LocationPagesFilter) {
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
              sections: {
                options: sectionOptions(
                  slug,
                  filter,
                  location.pages
                    .filter((page) => page.slug === "")
                    .map((page) => page.page),
                ),
                value: section ?? "",
              },
            }}
            lead={
              isPlaces ? ["Saved address"] : isPosts ? ["First published"] : []
            }
            empty={emptyOf(filter.q)}
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
