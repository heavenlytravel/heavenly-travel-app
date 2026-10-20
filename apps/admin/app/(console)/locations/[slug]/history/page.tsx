import {
  LOCATION_HISTORY_KINDS,
  LOCATION_HISTORY_KIND_LABELS,
  isLocationHistoryKind,
  locationHistoryKindOf,
  type LocationHistoryKind,
  type Permission,
} from "@repo/db";
import { listLocationHistory } from "@repo/db/server";
import Link from "next/link";
import { FilterLinks } from "../../../../_components/FilterLinks";
import { HistoryTimeline } from "../../../../_components/HistoryTimeline";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationDriverHref,
  locationHistoryHref,
  locationPublishHref,
  locationVehicleHref,
} from "../../../../_lib/routes";
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
 * which Operation alone sees, opens the record while it exists.
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
  const { entries, nextCursor } = await listLocationHistory({
    locationId: id,
    kind: filter,
    fleet,
    before,
    take: PAGE_SIZE,
  });
  const readsPublishes = permissions.includes("locations.manage");
  const link =
    "font-medium text-neutral-600 underline-offset-4 hover:underline";

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
        hrefOf={(entry) => {
          if (readsPublishes && entry.action === "location.page.published") {
            return locationPublishHref(slug, entry.id);
          }
          if (entry.isDeleted) return null;
          if (entry.entityType === "vehicle") {
            return locationVehicleHref(slug, entry.entityId);
          }
          if (entry.entityType === "driver") {
            return locationDriverHref(slug, entry.entityId);
          }
          return null;
        }}
        tagOf={(entry) => {
          if (entry.entityType === "vehicle")
            return `Vehicle ${entry.entityLabel}`;
          if (entry.entityType === "driver")
            return `Driver ${entry.entityLabel}`;
          const kind = locationHistoryKindOf(entry.action);
          return kind ? LOCATION_HISTORY_KIND_LABELS[kind] : null;
        }}
      />
      {before || nextCursor ? (
        <nav
          aria-label="Pages"
          className="mt-4 flex items-center justify-between text-sm"
        >
          {before ? (
            <Link href={locationHistoryHref(slug, filter)} className={link}>
              Newest
            </Link>
          ) : (
            <span />
          )}
          {nextCursor ? (
            <Link
              href={locationHistoryHref(slug, filter, nextCursor)}
              className={link}
            >
              Older changes
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
