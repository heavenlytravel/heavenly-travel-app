import {
  LOCATION_HISTORY_KINDS,
  LOCATION_HISTORY_KIND_LABELS,
  isLocationHistoryKind,
  type LocationHistoryKind,
  type Permission,
} from "@repo/db";
import { listLocationHistory } from "@repo/db/server";
import { FilterLinks } from "../../../../_components/FilterLinks";
import { HistoryPager } from "../../../../_components/HistoryPager";
import { HistoryTimeline } from "../../../../_components/HistoryTimeline";
import { SectionHeader } from "@repo/console/SectionHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  activityEntryHref,
  activityEntryTag,
} from "../../../../_lib/activity-links";
import { locationNames } from "../../../../_lib/location-names";
import { locationHistoryHref } from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

/** The parts the filter offers: the fleet's only to an admin who manages it. */
function kindOptions(fleet: boolean) {
  return LOCATION_HISTORY_KINDS.filter((kind) => fleet || kind !== "fleet").map(
    (kind) => ({ value: kind, label: LOCATION_HISTORY_KIND_LABELS[kind] }),
  );
}

/** How many changes a page of the history holds. */
const PAGE_SIZE = 50;

/**
 * Route: /locations/[slug]/history?kind=coverage&before=…. Every change
 * to the location, newest first, a page at a time, grouped by the day it
 * was made, and narrowed to one part of the location by the row of
 * filters: its details, its classes, its coverage and rates, its vehicles
 * and drivers, its pages or its status. A publish opens the page as it
 * was before and after, for Marketing; a vehicle's or a driver's change,
 * which Operation alone sees, opens the record where it is based while it
 * exists; another location's change that reached this one, such as a
 * removal that took its routes to that location's zones, opens that
 * location. The Activity screen reads the entries the same way
 * (`_lib/activity-links`).
 */
export default async function LocationHistoryPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/history">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const { kind, before: cursor } = await searchParams;
  const before = typeof cursor === "string" && cursor ? cursor : undefined;
  const permissions = await getPermissions();
  const fleet = permissions.includes("fleet.manage");
  const filter =
    isLocationHistoryKind(kind) && (fleet || kind !== "fleet")
      ? kind
      : undefined;

  return (
    <>
      <SectionHeader
        title="History"
        description="Every change to this location and the vehicles and drivers based here, newest first: who made it and when."
      />
      <div className="mt-4">
        <FilterLinks
          label="Filter by part of the location"
          options={kindOptions(fleet)}
          active={filter}
          hrefOf={(value) => locationHistoryHref(slug, value)}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={`${filter ?? "all"}:${before ?? "newest"}`}
          fallback={<CardSkeleton rows={6} />}
        >
          {() => history({ id, slug, filter, fleet, before, permissions })}
        </Streamed>
      </div>
    </>
  );
}

/** One page of the history, and the links to the pages around it. */
async function history({
  id,
  slug,
  filter,
  fleet,
  before,
  permissions,
}: {
  id: string;
  slug: string;
  filter: LocationHistoryKind | undefined;
  fleet: boolean;
  before: string | undefined;
  permissions: readonly Permission[];
}) {
  const [{ entries, nextCursor }, locations] = await Promise.all([
    listLocationHistory({
      locationId: id,
      kind: filter,
      fleet,
      before,
      take: PAGE_SIZE,
    }),
    locationNames(),
  ]);
  const slugs = new Map(locations.map((l) => [l.id, l.slug]));

  return (
    <>
      <HistoryTimeline
        // The timeline reads entries oldest first.
        entries={[...entries].reverse()}
        emptyMessage={
          filter
            ? `No changes to ${LOCATION_HISTORY_KIND_LABELS[filter].toLowerCase()} recorded.`
            : "No changes recorded for this location."
        }
        hrefOf={(entry) =>
          activityEntryHref(entry, { slugs, permissions, here: id })
        }
        tagOf={(entry) => activityEntryTag(entry, id)}
      />
      <HistoryPager
        newestHref={before ? locationHistoryHref(slug, filter) : null}
        olderHref={
          nextCursor ? locationHistoryHref(slug, filter, nextCursor) : null
        }
      />
    </>
  );
}
