import Link from "next/link";
import {
  LOCATION_PAGE_LABELS,
  childrenCount,
  childrenOf,
  formatLocalDate,
  heroLabelsOf,
  isPageFilter,
  isPageInList,
  isPlace,
  locationPagePath,
  pageKeyOfSegment,
  searchTermOf,
  type LocationPageKey,
  type PageFilter,
} from "@repo/db";
import type { PageSummary } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { FilterSelect } from "../../../../_components/FilterSelect";
import { SectionHeader } from "../../../../_components/SectionHeader";
import {
  CardSkeleton,
  Streamed,
  TableSkeleton,
} from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { filterOptions } from "../../../../_lib/filter-options";
import {
  SAVED_ADDRESSES_ID,
  SEARCH_PARAM,
  locationPagesHref,
  locationTabHref,
} from "../../../../_lib/routes";
import { AddEntryDialog } from "../../_components/EntryDialogs";
import { EntryOrder } from "../../_components/EntryOrder";
import {
  PageTree,
  locationPageGroups,
  type PageGroup,
  type TreeRow,
} from "../../_components/PageList";
import { addressChoicesOf } from "../../_lib/address-choices";
import { locationDetails, locationKey } from "../../_lib/location-data";
import { SavedAddresses, type SavedAddress } from "../SavedAddresses";

type Filter = {
  section?: LocationPageKey;
  status?: PageFilter;
  q?: string;
};

/**
 * Route: /locations/[slug]/pages?section=…&status=…&q=…. Marketing's tab,
 * every page of the location in one tree: the main page, then each
 * section's own page with every page under it, tied to it by a line and
 * folding away under it, narrowed by section, status and a search, all
 * kept in the address. Narrowed to a section, it is that section's list,
 * where its row leads: its places in their order, which move here, with
 * their saved address; its posts with their first publish; its classes
 * with why there is none. A section's plus adds a page under it. Then the
 * saved addresses the search card offers and places take customers to. A
 * page is written and published in its editor, under this address at its
 * address on the site. See docs/261025-marketing-pages.md, "The console's
 * Pages".
 */
export default async function LocationPagesPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/pages">) {
  await requireAdmin("locations.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const query = await searchParams;
  const filter: Filter = {
    section: pageKeyOfSegment(query.section) ?? undefined,
    status: isPageFilter(query.status) ? query.status : undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
  };

  return (
    <>
      <SectionHeader
        title="Pages"
        description="Every page of the location. A page under a section shows once the section's own page is published too; “Published, edits waiting” means the public still sees the copy last published."
      />
      <div className="mt-6">
        <Streamed
          key={JSON.stringify(filter)}
          fallback={
            <div className="grid gap-6">
              <TableSkeleton columns={4} rows={10} />
              <CardSkeleton rows={3} />
            </div>
          }
        >
          {() => pages(id, filter)}
        </Streamed>
      </div>
    </>
  );
}

async function pages(id: string, filter: Filter) {
  const location = await locationDetails(id);
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
            <span key="address" className="text-slate-600">
              {(page.addressId && addressNames.get(page.addressId)) ?? "—"}
            </span>,
          ]
        : isPosts
          ? [
              <span key="first" className="text-slate-600 tabular-nums">
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
                  href={locationTabHref(slug, "vehicle-classes")}
                  className="underline underline-offset-4 hover:text-slate-900"
                >
                  Offer one on Vehicle classes
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
    <div className="grid gap-6">
      <Card flush>
        <CardTitle
          inset
          description={
            !section || !children
              ? undefined
              : children.type === "classes"
                ? `${childrenCount(children, under)}: a page for each class ${location.name} offers. A class's page shows only while the class is on sale here; turned off, its page pauses.`
                : children.ordered
                  ? `${childrenCount(children, under)}, shown on the site in this order.`
                  : `${childrenCount(children, under)}, shown on the site newest first, by their first publish.`
          }
        >
          {section ? LOCATION_PAGE_LABELS[section] : "Every page"}
        </CardTitle>
        <PageTree
          groups={groups}
          filters={{
            searchHref: locationPagesHref(slug, { section, status }),
            q,
            status,
            statusHref: (next) =>
              locationPagesHref(slug, { ...filter, status: next }),
            selects: (
              <FilterSelect
                label="Section"
                value={section ?? ""}
                options={filterOptions(
                  "All sections",
                  location.pages
                    .filter((page) => page.slug === "")
                    .map((page) => ({
                      value: page.page,
                      label: LOCATION_PAGE_LABELS[page.page],
                    })),
                  (next) =>
                    locationPagesHref(slug, { ...filter, section: next }),
                )}
              />
            ),
          }}
          lead={
            isPlaces ? ["Saved address"] : isPosts ? ["First published"] : []
          }
          empty={q ? `No page matches “${q}”.` : "No page has this status."}
        />
      </Card>

      {section ? null : (
        <SavedAddresses
          id={SAVED_ADDRESSES_ID}
          locationId={location.id}
          locationSlug={slug}
          area={choices.area}
          addresses={addresses}
        />
      )}
    </div>
  );
}
