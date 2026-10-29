import Link from "next/link";
import {
  locationStateOf,
  setupSteps,
  type Permission,
  type SetupStep,
} from "@repo/db";
import type { LocationName } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { PlusIcon } from "@repo/ui/icons";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { LocationStateBadge } from "@repo/console/StatusBadges";
import { getPermissions, requireAdmin } from "../../_lib/access";
import {
  CONSOLE_PAGES,
  consolePage,
  pageHref,
  pageShown,
  permissionOf,
  type MenuFor,
} from "../../_lib/console-map";
import { locationOverview, scopeOverviews } from "../../_lib/location-data";
import { formatLongDate } from "../../_lib/local-days";
import { newBookingHref, scopeSlugOf } from "../../_lib/routes";
import { scopeOf } from "../../_lib/scope";
import {
  Band,
  BandFiguresSkeleton,
  bandFigures,
  greetingOf,
} from "./_dashboard/Band";
import { ByLocation } from "./_dashboard/ByLocation";
import { Glance, glanceOf } from "./_dashboard/Glance";
import { NeedsYou, needsOf } from "./_dashboard/NeedsYou";
import { todaysPickups } from "./_dashboard/TodaysPickups";
import { mayIn, type Day } from "./_dashboard/day";
import { SetupChecklist } from "./SetupChecklist";

/**
 * Route: /[location]. The dashboard, for every admin. Under `~` the day
 * of every location the person may see, summed; under a location's slug
 * that location's day, under its name and state. The navy band greets the
 * admin with the date and four figures (pick-ups today, bookings
 * received, trips awaiting a driver, documents due), each a link to the
 * list behind it for a team that may open it; then what needs the admin,
 * worst first, today's pick-ups for the teams that work the queue, and
 * under `~` each location's own figures. A team with no queue, such as
 * Marketing, sees a location's parts at a glance instead of its
 * pick-ups. A draft location opens on its setup checklist. See
 * docs/261029-manage-signature-overhaul.md, "Dashboard".
 */
export default async function DashboardPage({
  params,
}: PageProps<"/[location]">) {
  const admin = await requireAdmin(
    permissionOf(
      consolePage("dashboard"),
      scopeSlugOf((await params).location),
    ),
  );
  const [scope, permissions] = await Promise.all([
    scopeOf(params),
    getPermissions(),
  ]);
  const { location } = scope;
  const may = mayIn(permissions);
  if (location && locationStateOf(location.state) === "draft") {
    return (
      <>
        <PageHeader
          title={location.name}
          badge={<LocationStateBadge state={location.state} />}
        />
        <Streamed fallback={<CardSkeleton rows={4} />}>
          {() => setup({ location, permissions })}
        </Streamed>
      </>
    );
  }

  const now = new Date();
  const day: Day = { scope, permissions, now };
  const queue = may("bookings.view");
  return (
    <>
      {/* The band is the page's header: under a location, its name leads the date. */}
      <Band
        date={
          location
            ? `${location.name} · ${formatLongDate(now)}`
            : formatLongDate(now)
        }
        greeting={greetingOf(admin, now)}
        action={
          may("bookings.create") ? (
            <Button asChild variant="secondary">
              <Link href={newBookingHref(scope.slug)}>
                <PlusIcon />
                New booking
              </Link>
            </Button>
          ) : null
        }
      >
        <Streamed fallback={<BandFiguresSkeleton />}>
          {() => bandFigures(day)}
        </Streamed>
      </Band>
      <Streamed
        fallback={
          <DayColumns
            first={
              queue || may("fleet.manage") ? <CardSkeleton rows={3} /> : null
            }
            wide={
              queue ? (
                <TableSkeleton columns={4} rows={4} />
              ) : (
                <CardSkeleton rows={4} />
              )
            }
            last={location || !queue ? null : <CardSkeleton rows={2} />}
          />
        }
      >
        {() => dayColumns(day)}
      </Streamed>
    </>
  );
}

/* Under the band */

/**
 * The day under the band: the wide card on the left (today's pick-ups,
 * or a location's parts at a glance), and on the right what needs the
 * admin, then every location; on a phone, what needs the admin comes
 * first. With one side empty, the rest stack in one column.
 */
function DayColumns({
  first,
  wide,
  last,
}: {
  first: ReactNode;
  wide: ReactNode;
  last: ReactNode;
}) {
  if (!wide || !(first || last)) {
    return (
      <div className="grid gap-5">
        {first}
        {wide}
        {last}
      </div>
    );
  }
  return (
    <div className="@container">
      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)] @4xl:grid-rows-[auto_1fr] @4xl:items-start">
        {first ? (
          <div className="min-w-0 @4xl:col-start-2 @4xl:row-start-1">
            {first}
          </div>
        ) : null}
        <div className="min-w-0 @4xl:col-start-1 @4xl:row-span-2 @4xl:row-start-1">
          {wide}
        </div>
        {last ? (
          <div
            className={cx(
              "min-w-0 @4xl:col-start-2",
              first ? "@4xl:row-start-2" : "@4xl:row-start-1",
            )}
          >
            {last}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** What the dashboard shows under the band, for this admin in this scope. */
async function dayColumns(day: Day) {
  const { scope, permissions } = day;
  const may = mayIn(permissions);
  const queue = may("bookings.view");
  const overviews = await scopeOverviews(scope);
  const [needs, pickups, glance] = await Promise.all([
    queue || may("fleet.manage") ? needsOf(day, overviews) : null,
    queue ? todaysPickups(day, overviews) : null,
    scope.location && !queue && overviews[0]
      ? glanceOf(scope.location, overviews[0], permissions)
      : null,
  ]);
  const byLocation = scope.location ? null : (
    <ByLocation overviews={overviews} mayAdd={may("locations.manage")} />
  );
  const wide = pickups ?? (glance ? <Glance rows={glance} /> : null);

  return (
    <DayColumns
      first={needs ? <NeedsYou needs={needs} /> : null}
      wide={wide ?? byLocation}
      last={wide ? byLocation : null}
    />
  );
}

/* A draft */

/** A draft location's checklist, each step opening the page that holds it for an admin who may open it. */
async function setup({
  location,
  permissions,
}: {
  location: LocationName;
  permissions: readonly Permission[];
}) {
  const overview = await locationOverview(location.id);
  if (!overview) notFound();
  const at: MenuFor = { scope: location.slug, permissions, state: "draft" };
  const hrefOf = (step: SetupStep) => {
    const page = CONSOLE_PAGES.find((entry) => entry.step === step.key);
    return page && pageShown(page, at) ? pageHref(page, location.slug) : null;
  };
  return (
    <SetupChecklist
      steps={setupSteps(overview.pages, overview)}
      hrefOf={hrefOf}
    />
  );
}
