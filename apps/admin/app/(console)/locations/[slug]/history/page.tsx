import {
  LOCATION_HISTORY_KINDS,
  LOCATION_HISTORY_KIND_LABELS,
  isLocationHistoryKind,
  locationHistoryKindOf,
  type LocationHistoryKind,
} from "@repo/db";
import { listActivityForMany } from "@repo/db/server";
import { FilterLinks } from "../../../../_components/FilterLinks";
import { HistoryTimeline } from "../../../../_components/HistoryTimeline";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationHistoryHref,
  locationPublishHref,
} from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

const KIND_OPTIONS = LOCATION_HISTORY_KINDS.map((kind) => ({
  value: kind,
  label: LOCATION_HISTORY_KIND_LABELS[kind],
}));

/**
 * Route: /locations/[slug]/history?kind=coverage. Every change to the
 * location, newest first, grouped by the day it was made, and narrowed to
 * one part of the location by the row of filters: its details, its
 * classes, its coverage and rates, its pages or its status. A publish
 * opens the page as it was before and after, for Marketing.
 */
export default async function LocationHistoryPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/history">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const { kind } = await searchParams;
  const filter = isLocationHistoryKind(kind) ? kind : undefined;

  return (
    <>
      <SectionHeader
        title="History"
        description="Every change to this location, newest first: who made it and when."
      />
      <div className="mt-4">
        <FilterLinks
          label="Filter by part of the location"
          options={KIND_OPTIONS}
          active={filter}
          hrefOf={(value) => locationHistoryHref(slug, value)}
        />
      </div>
      <div className="mt-4">
        <Streamed key={filter ?? "all"} fallback={<CardSkeleton rows={6} />}>
          {() => history({ id, slug, filter })}
        </Streamed>
      </div>
    </>
  );
}

async function history({
  id,
  slug,
  filter,
}: {
  id: string;
  slug: string;
  filter: LocationHistoryKind | undefined;
}) {
  const [all, permissions] = await Promise.all([
    listActivityForMany([{ entityType: "location", entityId: id }]),
    getPermissions(),
  ]);
  const entries = filter
    ? all.filter((entry) => locationHistoryKindOf(entry.action) === filter)
    : all;
  const readsPublishes = permissions.includes("locations.manage");

  return (
    <HistoryTimeline
      entries={entries}
      emptyMessage={
        filter
          ? `No changes to ${LOCATION_HISTORY_KIND_LABELS[filter].toLowerCase()} recorded.`
          : "No changes recorded for this location."
      }
      hrefOf={(entry) =>
        readsPublishes && entry.action === "location.page.published"
          ? locationPublishHref(slug, entry.id)
          : null
      }
      tagOf={(entry) => {
        const kind = locationHistoryKindOf(entry.action);
        return kind ? LOCATION_HISTORY_KIND_LABELS[kind] : null;
      }}
    />
  );
}
