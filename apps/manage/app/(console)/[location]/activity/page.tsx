import {
  LOCATION_HISTORY_KINDS,
  LOCATION_HISTORY_KIND_LABELS,
  isActivityEntityType,
  isLocationHistoryKind,
  type ActivityEntityType,
  type Permission,
} from "@repo/db";
import {
  listActivity,
  listLocationHistory,
  type ActivityPage as LogPage,
  type LocationName,
} from "@repo/db/server";
import type { ReactNode } from "react";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed } from "@repo/console/Skeleton";
import { FilterLinks } from "../../../_components/FilterLinks";
import { HistoryPager } from "../../../_components/HistoryPager";
import {
  HistoryTimeline,
  HistoryTimelineSkeleton,
} from "../../../_components/HistoryTimeline";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  ACTIVITY_RECORD_NAMES,
  activityEntryHref,
  activityEntryTag,
} from "../../../_lib/activity-links";
import { consolePage, permissionOf } from "../../../_lib/console-map";
import { activityHref, scopeSlugOf } from "../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../_lib/scope";

/** How many changes a page of the log holds. */
const PAGE_SIZE = 50;

/** The filter's types of record, in their order. */
const TYPE_OPTIONS = (
  Object.keys(ACTIVITY_RECORD_NAMES) as ActivityEntityType[]
).map((type) => ({ value: type, label: ACTIVITY_RECORD_NAMES[type].many }));

/** The parts of a location its filter offers: the fleet's only to an admin who manages it. */
function kindOptions(fleet: boolean) {
  return LOCATION_HISTORY_KINDS.filter((kind) => fleet || kind !== "fleet").map(
    (kind) => ({ value: kind, label: LOCATION_HISTORY_KIND_LABELS[kind] }),
  );
}

/** One log as the page reads it: its filter chips, its pages and where each is. */
type Log = {
  /** Names the log with its filter, so a change of filter shows the skeleton. */
  key: string;
  chips: ReactNode;
  emptyMessage: string;
  /** The log older than the entry `before`, newest first; from the newest without. */
  read: (before: string | undefined) => Promise<LogPage>;
  /** The page of it older than the entry `before`; the newest without. */
  href: (before?: string) => string;
  /** The location whose own history it is; none for the console's log. */
  here?: string;
};

/**
 * Every admin, customer and system action across the console, narrowed to
 * one type of record by the chips. SUPER only.
 */
function consoleLog(type: unknown): Log {
  const filter = isActivityEntityType(type) ? type : undefined;
  return {
    key: filter ?? "all",
    chips: (
      <FilterLinks
        label="Filter by type of record"
        options={TYPE_OPTIONS}
        active={filter}
        hrefOf={(value) => activityHref(null, { type: value })}
      />
    ),
    emptyMessage: filter
      ? `No changes to ${ACTIVITY_RECORD_NAMES[filter].many.toLowerCase()} recorded.`
      : "No activity yet.",
    read: (before) =>
      listActivity({ entityType: filter, before, take: PAGE_SIZE }),
    href: (before) => activityHref(null, { type: filter, before }),
  };
}

/**
 * Every change to one location and to the vehicles and drivers based
 * there, narrowed to one part of it by the chips: its details, its
 * classes, its coverage and rates, its fleet, its pages or its status.
 * The fleet's changes are Operation's alone.
 */
function locationLog(
  location: LocationName,
  kind: unknown,
  permissions: readonly Permission[],
): Log {
  const fleet = permissions.includes("fleet.manage");
  const filter =
    isLocationHistoryKind(kind) && (fleet || kind !== "fleet")
      ? kind
      : undefined;
  return {
    key: filter ?? "all",
    chips: (
      <FilterLinks
        label="Filter by part of the location"
        options={kindOptions(fleet)}
        active={filter}
        hrefOf={(value) => activityHref(location.slug, { kind: value })}
      />
    ),
    emptyMessage: filter
      ? `No changes to ${LOCATION_HISTORY_KIND_LABELS[filter].toLowerCase()} recorded.`
      : "No changes recorded for this location.",
    read: (before) =>
      listLocationHistory({
        locationId: location.id,
        kind: filter,
        fleet,
        before,
        take: PAGE_SIZE,
      }),
    href: (before) => activityHref(location.slug, { kind: filter, before }),
    here: location.id,
  };
}

/**
 * Route: /[location]/activity?type=vehicle&before=<id>. What changed and
 * who changed it, newest first, a page at a time, grouped by the day it
 * was made. Under `~` the console's whole log, for SUPER, narrowed to one
 * type of record (`?type=`); under a location its own history, for every
 * admin, narrowed to one part of it (`?kind=`). Each line names its record
 * at the right and opens it where it has a page: a booking, a location, a
 * class, a vehicle or a driver at the location it is based at, a publish
 * as the page was before and after (`_lib/activity-links`). One record's
 * history is on its own page.
 */
export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/[location]/activity">) {
  await requireAdmin(
    permissionOf(consolePage("activity"), scopeSlugOf((await params).location)),
  );
  const scope = await scopeOf(params);
  const [{ type, kind, before: cursor }, permissions] = await Promise.all([
    searchParams,
    getPermissions(),
  ]);
  const before = typeof cursor === "string" && cursor ? cursor : undefined;
  const log = scope.location
    ? locationLog(scope.location, kind, permissions)
    : consoleLog(type);

  return (
    <>
      <PageHeader title="Activity" meta={scope.location?.name} />
      <Streamed
        key={`${log.key}:${before ?? "newest"}`}
        fallback={<HistoryTimelineSkeleton head={log.chips} />}
      >
        {() => logPage({ log, before, permissions })}
      </Streamed>
    </>
  );
}

/** One page of the log, in its card under the chips, and the links to the pages around it. */
async function logPage({
  log,
  before,
  permissions,
}: {
  log: Log;
  before: string | undefined;
  permissions: readonly Permission[];
}) {
  const [{ entries, nextCursor }, locations] = await Promise.all([
    log.read(before),
    locationsVisible(),
  ]);
  const slugs = new Map(locations.map((l) => [l.id, l.slug]));

  return (
    <HistoryTimeline
      head={log.chips}
      // The timeline reads entries oldest first.
      entries={[...entries].reverse()}
      emptyMessage={log.emptyMessage}
      hrefOf={(entry) =>
        activityEntryHref(entry, { slugs, permissions, here: log.here })
      }
      tagOf={(entry) => activityEntryTag(entry, log.here)}
      foot={
        <HistoryPager
          newestHref={before ? log.href() : null}
          olderHref={nextCursor ? log.href(nextCursor) : null}
        />
      }
    />
  );
}
