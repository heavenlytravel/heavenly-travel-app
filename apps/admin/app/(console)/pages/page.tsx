import {
  LOCATION_PAGES,
  LOCATION_PAGE_LABELS,
  formatLocalDate,
  isPageFilter,
  isPageInList,
  locationPagePath,
  pageKeyOfSegment,
  plural,
  searchTermOf,
  type LocationPageKey,
  type PageFilter,
} from "@repo/db";
import {
  getFooterSummary,
  listLocationPages,
  listSitePageSummaries,
} from "@repo/db/server";
import { HouseIcon } from "@repo/ui/icons";
import { Card, CardTitle } from "../../_components/Card";
import { FilterLinks } from "../../_components/FilterLinks";
import { LocationFilter } from "../../_components/LocationFilter";
import { LocationMark } from "../../_components/LocationMark";
import { PageHeader } from "../../_components/PageHeader";
import { SearchBox } from "../../_components/SearchBox";
import { Streamed, TableSkeleton } from "../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import { locationNames } from "../../_lib/location-names";
import { SEARCH_PARAM, WEBSITE_FILTER, pagesHref } from "../../_lib/routes";
import {
  PageFilterLinks,
  PageTree,
  locationPageGroups,
  footerRow,
  sitePageRow,
  type PageGroup,
} from "../locations/_components/PageList";

const SECTION_OPTIONS = LOCATION_PAGES.map((page) => ({
  value: page,
  label: LOCATION_PAGE_LABELS[page],
}));

type Filter = {
  /** A location's id, or `WEBSITE_FILTER` for the site's own pages. */
  location?: string;
  section?: LocationPageKey;
  status?: PageFilter;
  q?: string;
};

/**
 * Route: /pages?location=…&section=…&status=…&q=…. Every page in one list:
 * each location's, as its own Pages tab lists them (the main page, each
 * section's own page and the pages under it, tied to it by a line and
 * folding away under it, a section's row opening its list there), and
 * for SUPER the customer site's own pages (`website.manage`), the home
 * page, about us and the legal pages, whose editors are here at
 * /pages/website/…. Narrowed by location or the website, section, status
 * and a search, all kept in the address. A location's page opens its
 * editor inside its location. Behind `locations.manage`. See
 * docs/261025-marketing-pages.md, "The console's Pages".
 */
export default async function PagesPage({ searchParams }: PageProps<"/pages">) {
  await requireAdmin("locations.manage");
  const params = await searchParams;
  const [locations, permissions] = await Promise.all([
    locationNames(),
    getPermissions(),
  ]);
  const website = permissions.includes("website.manage");
  const location =
    typeof params.location === "string" && params.location
      ? params.location
      : undefined;
  const filter: Filter = {
    location: location === WEBSITE_FILTER && !website ? undefined : location,
    section: pageKeyOfSegment(params.section) ?? undefined,
    status: isPageFilter(params.status) ? params.status : undefined,
    q: searchTermOf(params[SEARCH_PARAM]) ?? undefined,
  };
  const hrefOf = (next: string | undefined) =>
    pagesHref({ ...filter, location: next });

  return (
    <>
      <PageHeader
        title="Pages"
        description={
          website
            ? "Every location's pages, and the website's own: the home page, about us, contact us, the legal pages and the footer. A location's pages are written and published inside it."
            : "Every location's pages. Each is written and published inside its location."
        }
        action={
          <LocationFilter
            value={filter.location ?? ""}
            options={[
              ...locationFilterOptions(locations, hrefOf),
              ...(website
                ? [
                    {
                      value: WEBSITE_FILTER,
                      label: "Website",
                      href: hrefOf(WEBSITE_FILTER),
                    },
                  ]
                : []),
            ]}
          />
        }
      />
      <div className="mt-6">
        <Streamed
          key={JSON.stringify(filter)}
          fallback={<TableSkeleton columns={6} rows={10} />}
        >
          {() => pagesList(filter, website)}
        </Streamed>
      </div>
    </>
  );
}

async function pagesList(filter: Filter, website: boolean) {
  const onlyWebsite = filter.location === WEBSITE_FILTER;
  // The site's pages and the footer belong to no section.
  const withWebsite =
    website &&
    (filter.location === undefined || onlyWebsite) &&
    !filter.section;
  const [lists, sitePages, footer] = await Promise.all([
    onlyWebsite ? [] : listLocationPages(filter.location),
    withWebsite ? listSitePageSummaries() : [],
    withWebsite ? getFooterSummary() : null,
  ]);
  const narrowed = filter.status !== undefined || filter.q !== undefined;
  const changedCell = (at: Date | null) => (
    <span className="whitespace-nowrap text-slate-600 tabular-nums">
      {at ? formatLocalDate(at) : "Not yet"}
    </span>
  );

  const groups: PageGroup[] = lists.flatMap((location) => {
    const where = (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <LocationMark name={location.name} state={location.state} />
        {location.name}
      </span>
    );
    return locationPageGroups(
      location.slug,
      filter.section
        ? location.pages.filter((page) => page.page === filter.section)
        : location.pages,
      {
        shows: (page) =>
          isPageInList(page, locationPagePath(location.slug, page), filter),
        narrowed,
        extend: (page) => ({
          lead: [where],
          trail: [changedCell(page.updatedAt)],
        }),
      },
    );
  });
  const websiteRows = [
    ...sitePages.map((page) => ({
      row: sitePageRow(page),
      at: page.updatedAt,
    })),
    ...(footer ? [{ row: footerRow(footer), at: footer.updatedAt }] : []),
  ];
  for (const { row, at } of websiteRows) {
    const inList = isPageInList(
      { name: row.label, status: row.status, paused: false },
      row.path,
      filter,
    );
    if (!inList) continue;
    groups.push({
      key: row.key,
      own: {
        row,
        lead: [
          <span
            key="website"
            className="flex items-center gap-2 whitespace-nowrap text-slate-700"
          >
            <HouseIcon className="size-4 text-slate-500" />
            Website
          </span>,
        ],
        trail: [changedCell(at)],
      },
      under: [],
      folds: false,
    });
  }
  const count = groups.reduce((sum, group) => sum + 1 + group.under.length, 0);

  return (
    <Card flush>
      <CardTitle
        inset
        action={
          <SearchBox
            href={pagesHref({ ...filter, q: undefined })}
            value={filter.q ?? ""}
            label="Search pages"
            placeholder="Name or address"
          />
        }
      >
        {plural(count, "page")}
      </CardTitle>
      <div className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-2 px-6 pb-4">
        {onlyWebsite ? null : (
          <>
            <span className="text-xs text-slate-500">Section</span>
            <FilterLinks
              label="Filter by section"
              options={SECTION_OPTIONS}
              active={filter.section}
              hrefOf={(section) => pagesHref({ ...filter, section })}
            />
          </>
        )}
        <span className="text-xs text-slate-500">Status</span>
        <PageFilterLinks
          active={filter.status}
          hrefOf={(status) => pagesHref({ ...filter, status })}
        />
      </div>
      <PageTree
        groups={groups}
        lead={["Location"]}
        trail={["Changed"]}
        empty={
          filter.q
            ? `No page matches “${filter.q}”.`
            : "No page has this status."
        }
      />
    </Card>
  );
}
