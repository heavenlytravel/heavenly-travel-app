import { isActivityEntityType, type ActivityEntityType } from "@repo/db";
import { listActivity } from "@repo/db/server";
import { FilterLinks } from "../../_components/FilterLinks";
import { HistoryPager } from "../../_components/HistoryPager";
import { HistoryTimeline } from "../../_components/HistoryTimeline";
import { PageHeader } from "../../_components/PageHeader";
import { CardSkeleton, Streamed } from "../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../_lib/access";
import {
  ACTIVITY_RECORD_NAMES,
  activityEntryHref,
  activityEntryTag,
} from "../../_lib/activity-links";
import { locationNames } from "../../_lib/location-names";
import { activityHref } from "../../_lib/routes";

const PAGE_SIZE = 50;

/** The filter's types of record, in their order. */
const TYPE_OPTIONS = (
  Object.keys(ACTIVITY_RECORD_NAMES) as ActivityEntityType[]
).map((type) => ({ value: type, label: ACTIVITY_RECORD_NAMES[type].many }));

/**
 * Route: /activity?type=vehicle&before=<id>. Every admin, customer and
 * system action across the app, newest first, a page at a time, by the
 * day it was made, as a location's History reads its own, and narrowed to
 * one type of record by the row of filters. Each line names its record at
 * the right and opens it: a booking, a location, a class, a vehicle or a
 * driver inside the location it is based at, a publish as the page was
 * before and after. SUPER only; one record's history is on its own page.
 */
export default async function ActivityPage({
  searchParams,
}: PageProps<"/activity">) {
  await requireAdmin("activity.view");
  const { type, before: cursor } = await searchParams;
  const filter = isActivityEntityType(type) ? type : undefined;
  const before = typeof cursor === "string" && cursor ? cursor : undefined;

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every change across the console, newest first: who made it and when. Entries are never edited or deleted."
      />
      <div className="mt-6">
        <FilterLinks
          label="Filter by type of record"
          options={TYPE_OPTIONS}
          active={filter}
          hrefOf={(value) => activityHref(value)}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={`${filter ?? "all"}:${before ?? "newest"}`}
          fallback={<CardSkeleton rows={6} />}
        >
          {() => activityList({ filter, before })}
        </Streamed>
      </div>
    </>
  );
}

/** One page of the log, and the links to the pages around it. */
async function activityList({
  filter,
  before,
}: {
  filter: ActivityEntityType | undefined;
  before: string | undefined;
}) {
  const [{ entries, nextCursor }, locations, permissions] = await Promise.all([
    listActivity({ entityType: filter, before, take: PAGE_SIZE }),
    locationNames(),
    getPermissions(),
  ]);
  const slugs = new Map(locations.map((l) => [l.id, l.slug]));

  return (
    <>
      <HistoryTimeline
        // The timeline reads entries oldest first.
        entries={[...entries].reverse()}
        emptyMessage={
          filter
            ? `No changes to ${ACTIVITY_RECORD_NAMES[filter].many.toLowerCase()} recorded.`
            : "No activity yet."
        }
        hrefOf={(entry) => activityEntryHref(entry, { slugs, permissions })}
        tagOf={(entry) => activityEntryTag(entry)}
      />
      <HistoryPager
        newestHref={before ? activityHref(filter) : null}
        olderHref={nextCursor ? activityHref(filter, nextCursor) : null}
      />
    </>
  );
}
