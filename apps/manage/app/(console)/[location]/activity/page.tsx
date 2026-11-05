import {
  ACTIVITY_AREA_LABELS,
  ACTOR_KINDS,
  ACTOR_KIND_LABELS,
  LOCATION_ACTIVITY_AREAS,
  activityAreasHeld,
  isActivityArea,
  isActorKind,
  textOf,
  type ActivityArea,
  type ActorKind,
  type Permission,
} from "@repo/db";
import {
  listActivity,
  listActivityActors,
  listLocationHistory,
  type ActivityPage as LogPage,
  type LocationName,
} from "@repo/db/server";
import type { ReactNode } from "react";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed } from "@repo/console/Skeleton";
import {
  FilterChips,
  ListFilters,
  type FilterGroup,
} from "../../../_components/ListFilters";
import { ListToolbar } from "../../../_components/ListToolbar";
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

/** One log as the page reads it: its filters bar, its pages and where each is. */
type Log = {
  /** Names the log with its filters, so a change of filter shows the skeleton. */
  key: string;
  bar: ReactNode;
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
 * the vehicles and drivers based there. Either is narrowed by the
 * Filters button to one area (`?area=`), of the areas held that the log
 * can hold, to one kind of actor (`?who=`) and to one member of staff
 * (`?person=`), of those who wrote in it. The fleet's changes are
 * Operation's, the team's SUPER's.
 */
function logOf(
  slug: ScopeSlug,
  location: LocationName | null,
  query: { area?: unknown; who?: unknown; person?: unknown },
  held: readonly ActivityArea[],
  people: readonly { id: string; name: string }[],
): Log {
  const { area } = query;
  const offered = location
    ? held.filter((each) =>
        (LOCATION_ACTIVITY_AREAS as readonly ActivityArea[]).includes(each),
      )
    : held;
  const filter =
    isActivityArea(area) && offered.includes(area) ? area : undefined;
  const who: ActorKind | undefined = isActorKind(query.who)
    ? query.who
    : undefined;
  // A person no longer in the log is no filter, as any unknown value is.
  const personParam = textOf(query.person);
  const person = people.some((p) => p.id === personParam)
    ? personParam
    : undefined;
  // Asked by every area held, so SUPER's query asks nothing of the action.
  const areas = { held, area: filter };
  const actors = { kind: who, id: person };
  const listed = activityHref(slug, { area: filter, who, person });
  const groups: FilterGroup[] = [
    {
      param: "area",
      label: "Area",
      value: filter ?? "",
      options: offered.map((each) => ({
        value: each,
        label: ACTIVITY_AREA_LABELS[each],
      })),
    },
    {
      param: "who",
      label: "Who",
      value: who ?? "",
      options: ACTOR_KINDS.map((kind) => ({
        value: kind,
        label: ACTOR_KIND_LABELS[kind],
      })),
    },
    {
      param: "person",
      label: "Staff member",
      value: person ?? "",
      options: people.map((p) => ({ value: p.id, label: p.name })),
    },
  ];
  return {
    key: listed,
    bar: (
      <>
        <ListToolbar>
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
      </>
    ),
    emptyMessage:
      who || person
        ? "No changes match these filters."
        : filter
          ? `No changes to ${ACTIVITY_AREA_LABELS[filter].toLowerCase()} recorded.`
          : location
            ? "No changes recorded for this location."
            : "No activity yet.",
    read: (before) =>
      location
        ? listLocationHistory({
            locationId: location.id,
            areas,
            actors,
            before,
            take: PAGE_SIZE,
          })
        : listActivity({ areas, actors, before, take: PAGE_SIZE }),
    href: (before) => activityHref(slug, { area: filter, who, person, before }),
    here: location?.id,
  };
}

/**
 * Route: /[location]/activity?area=fleet&who=admin&person=<id>&before=<id>.
 * What changed and who changed it, newest first, a page at a time,
 * grouped by the day it was made, for every admin: the entries of the
 * areas its teams hold (`activityAreasHeld`), all of them for SUPER. Under
 * `~` the console's whole log, under a location its own history; either
 * narrowed by the Filters button to one area, one kind of actor or one
 * person. Each line names its record under its sentence and opens it
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
  const [query, permissions] = await Promise.all([
    searchParams,
    getPermissions(),
  ]);
  const cursor = query.before;
  const before = typeof cursor === "string" && cursor ? cursor : undefined;
  const held = activityAreasHeld(permissions);
  const people = await listActivityActors({
    areas: { held },
    locationId: scope.location?.id,
  });
  const log = logOf(scope.slug, scope.location, query, held, people);

  return (
    <>
      <PageHeader title="Activity" meta={scope.location?.name} />
      <Streamed
        key={`${log.key}:${before ?? "newest"}`}
        fallback={<HistoryTimelineSkeleton head={log.bar} />}
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
      head={log.bar}
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
