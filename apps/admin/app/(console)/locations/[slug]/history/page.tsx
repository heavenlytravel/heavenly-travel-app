import Link from "next/link";
import {
  LOCATION_HISTORY_KINDS,
  LOCATION_HISTORY_KIND_LABELS,
  describeActivity,
  formatLocalDate,
  formatLocalTime,
  isLocationHistoryKind,
  locationHistoryKindOf,
  type LocationHistoryKind,
} from "@repo/db";
import { listActivityForMany, type ActivityEntry } from "@repo/db/server";
import { Frame } from "../../../../_components/Card";
import { FilterLinks } from "../../../../_components/FilterLinks";
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

/** The entries by the Malaysian day they were made, the days and the entries newest first. */
function byDay(entries: readonly ActivityEntry[]) {
  const days = new Map<string, ActivityEntry[]>();
  for (const entry of [...entries].reverse()) {
    const day = formatLocalDate(entry.createdAt);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.entries()];
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

  if (entries.length === 0) {
    return (
      <Frame>
        <p className="px-6 py-8 text-center text-sm text-neutral-500">
          {filter
            ? `No changes to ${LOCATION_HISTORY_KIND_LABELS[filter].toLowerCase()} recorded.`
            : "No changes recorded for this location."}
        </p>
      </Frame>
    );
  }

  return (
    <div className="grid gap-6">
      {byDay(entries).map(([day, dayEntries]) => (
        <section key={day} className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">{day}</h3>
          <Frame>
            <ol className="divide-y divide-neutral-100 text-sm">
              {dayEntries.map((entry) => {
                const kind = locationHistoryKindOf(entry.action);
                const href =
                  readsPublishes && entry.action === "location.page.published"
                    ? locationPublishHref(slug, entry.id)
                    : null;
                return (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[3.5rem_1fr] gap-3 px-6 py-3 sm:grid-cols-[3.5rem_1fr_auto]"
                  >
                    <span className="text-neutral-500 tabular-nums">
                      {formatLocalTime(entry.createdAt)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-neutral-900">
                        {href ? (
                          <Link
                            href={href}
                            className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
                          >
                            {describeActivity(entry)}
                          </Link>
                        ) : (
                          describeActivity(entry)
                        )}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {entry.actorName}
                      </span>
                    </span>
                    {kind ? (
                      <span className="col-start-2 text-xs text-neutral-500 sm:col-start-auto sm:text-right">
                        {LOCATION_HISTORY_KIND_LABELS[kind]}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Frame>
        </section>
      ))}
    </div>
  );
}
