import {
  ACTIVITY_AREA_LABELS,
  LOCATION_ACTIVITY_AREAS,
  activityAreasHeld,
  isActivityArea,
  type ActivityArea,
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
  activityEntryHref,
  activityEntryTag,
} from "../../../_lib/activity-links";
import { consolePage } from "../../../_lib/console-map";
import { activityHref, type ScopeSlug } from "../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../_lib/scope";

/** How many changes a page of the log holds. */
const PAGE_SIZE = 50;

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
 * The log of a scope, for an admin who holds `held`: under `~` every
 * action across the console, under a location the changes to it and to
 * the vehicles and drivers based there. Either is narrowed to one area
 * by the chips (`?area=`), which offer the areas held that the log can
 * hold. The fleet's changes are Operation's, the team's SUPER's.
 */
function logOf(
  slug: ScopeSlug,
  location: LocationName | null,
  area: unknown,
  held: readonly ActivityArea[],
): Log {
  const offered = location
    ? held.filter((each) =>
        (LOCATION_ACTIVITY_AREAS as readonly ActivityArea[]).includes(each),
      )
    : held;
  const filter =
    isActivityArea(area) && offered.includes(area) ? area : undefined;
  // Asked by every area held, so SUPER's query asks nothing of the action.
  const areas = { held, area: filter };
  return {
    key: filter ?? "all",
    chips: (
      <FilterLinks
        label="Filter by area"
        options={offered.map((each) => ({
          value: each,
          label: ACTIVITY_AREA_LABELS[each],
        }))}
        active={filter}
        hrefOf={(value) => activityHref(slug, { area: value })}
      />
    ),
    emptyMessage: filter
      ? `No changes to ${ACTIVITY_AREA_LABELS[filter].toLowerCase()} recorded.`
      : location
        ? "No changes recorded for this location."
        : "No activity yet.",
    read: (before) =>
      location
        ? listLocationHistory({
            locationId: location.id,
            areas,
            before,
            take: PAGE_SIZE,
          })
        : listActivity({ areas, before, take: PAGE_SIZE }),
    href: (before) => activityHref(slug, { area: filter, before }),
    here: location?.id,
  };
}

/**
 * Route: /[location]/activity?area=fleet&before=<id>. What changed and
 * who changed it, newest first, a page at a time, grouped by the day it
 * was made, for every admin: the entries of the areas its teams hold
 * (`activityAreasHeld`), all of them for SUPER. Under `~` the console's
 * whole log, under a location its own history; either narrowed to one
 * area (`?area=`). Each line names its record at the right and opens it
 * where it has a page: a booking, a location, a class, a vehicle or a
 * driver at the location it is based at, a publish as the page was
 * before and after (`_lib/activity-links`). One record's history is on
 * its own page.
 */
export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/[location]/activity">) {
  await requireAdmin(consolePage("activity").permission);
  const scope = await scopeOf(params);
  const [{ area, before: cursor }, permissions] = await Promise.all([
    searchParams,
    getPermissions(),
  ]);
  const before = typeof cursor === "string" && cursor ? cursor : undefined;
  const log = logOf(
    scope.slug,
    scope.location,
    area,
    activityAreasHeld(permissions),
  );

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
