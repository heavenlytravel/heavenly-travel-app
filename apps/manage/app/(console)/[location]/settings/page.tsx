import Link from "next/link";
import {
  LANDING_PAGE,
  LOCATION_STATE_MOVE,
  andList,
  formatLocalDateTime,
  hasBeenLive,
  isSlugLocked,
  locationDeleteImpact,
  locationStateOf,
  setupProgress,
  setupSteps,
  stateMoveBlockers,
  type LocationState,
  type Permission,
} from "@repo/db";
import {
  routesIntoLocation,
  type LocationName,
  type LocationOverview,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { PlusIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { Tooltip } from "@repo/ui/tooltip";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card, CardTitle, Tile, TileGrid } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { Notice } from "@repo/ui/notice";
import { PageHeader } from "@repo/console/PageHeader";
import { SectionHeader } from "@repo/console/SectionHeader";
import {
  CardSkeleton,
  Streamed,
  TileGridSkeleton,
} from "@repo/console/Skeleton";
import { LocationStateBadge } from "@repo/console/StatusBadges";
import { CardImage } from "../../../_components/CardImage";
import { LocationInitial } from "../../../_components/LocationInitial";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  locationDetails,
  locationOverview,
  scopeOverviews,
} from "../../../_lib/location-data";
import {
  NEW_LOCATION_PATH,
  bookingsHref,
  settingsHref,
} from "../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../_lib/scope";
import { stateOptions } from "../../../_lib/state-options";
import { DeleteLocation } from "./DeleteLocation";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { SetupBar } from "./SetupBar";
import { SafetyBufferForm } from "./SafetyBufferForm";
import { StateMove } from "./StateMove";

/**
 * Route: /[location]/settings. For an admin who holds the key of one of
 * its cards (`settings.view`): Marketing, Operation and SUPER. Under `~`
 * the locations, a tile each with its main page's hero image, its state,
 * its numbers and how far its setup has come, opening its own settings,
 * and for SUPER "Add location". Under a location its own settings: for
 * Marketing its details, step 1 of the setup (the name, the slug and the
 * states it lies in); where it stands with the public, with what still
 * stands in the way of going live; for Operation the time between its
 * jobs; and for SUPER the one move its state allows, "Go live", "Pause"
 * or "Resume", then its deletion. Its saved addresses are with its
 * pages. See docs/261015-locations-as-operation-areas.md.
 */
export default async function SettingsPage({
  params,
}: PageProps<"/[location]/settings">) {
  await requireAdmin("settings.view");
  const [scope, permissions] = await Promise.all([
    scopeOf(params),
    getPermissions(),
  ]);

  const { location } = scope;
  if (location) {
    return (
      <>
        <PageHeader title="Settings" meta={location.name} />
        <Streamed
          fallback={
            <div className="grid max-w-3xl gap-5">
              <CardSkeleton rows={5} />
              <CardSkeleton rows={3} />
            </div>
          }
        >
          {() => locationSettings({ location, permissions })}
        </Streamed>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        action={
          permissions.includes("locations.create") ? (
            <Button asChild>
              <Link href={NEW_LOCATION_PATH}>
                <PlusIcon />
                Add location
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <SectionHeader title="Locations" />
      </div>
      <Streamed fallback={<TileGridSkeleton />}>
        {() =>
          locationTiles({
            scope,
            opensBookings: permissions.includes("bookings.view"),
          })
        }
      </Streamed>
    </>
  );
}

/* Every location */

/** Every location the person may see, a tile each. */
async function locationTiles({
  scope,
  opensBookings,
}: {
  scope: ConsoleScope;
  opensBookings: boolean;
}) {
  const locations = await scopeOverviews(scope);

  if (locations.length === 0) {
    return <EmptyState slot>No locations yet. Add the first one.</EmptyState>;
  }
  return (
    <TileGrid>
      {locations.map((location) => (
        <LocationTile
          key={location.id}
          location={location}
          opensBookings={opensBookings}
        />
      ))}
    </TileGrid>
  );
}

/**
 * One location: its main page's hero image under its state, its name and
 * the states it lies in, its numbers, and how far its setup has come. The
 * whole tile opens the location's settings; for a team that works the
 * bookings, the count received opens them.
 */
function LocationTile({
  location,
  opensBookings,
}: {
  location: LocationOverview;
  /** The admin may open the bookings: the count received is a link to them. */
  opensBookings: boolean;
}) {
  const progress = setupProgress(setupSteps(location.pages, location));
  const hero =
    location.pages.find((page) => page.page === LANDING_PAGE)?.heroImage ??
    null;

  return (
    <Tile>
      <CardImage
        src={hero?.url ?? null}
        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
        fallback={<LocationInitial name={location.name} />}
      >
        <LocationStateBadge state={location.state} />
      </CardImage>

      <div className="grid gap-4 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold tracking-title text-ink">
            {/* The link's box covers the tile, so the whole tile opens the location's settings. */}
            <Link href={settingsHref(location.slug)} className="card-link">
              {location.name}
            </Link>
          </h3>
          <p className="truncate text-caption text-muted">
            /{location.slug}
            {location.stateNames.length > 0
              ? ` · ${andList(location.stateNames)}`
              : ""}
          </p>
        </div>

        <dl className="grid grid-cols-4 gap-2">
          <Figure label="Zones" value={location.zones} />
          <Figure label="Classes" value={location.classesOnSale} />
          <Figure
            label="Received"
            none={location.awaitingConfirmation === 0}
            value={
              location.awaitingConfirmation > 0 && opensBookings ? (
                // Above the tile's link, so it opens the bookings instead.
                <Tooltip content="Bookings awaiting confirmation">
                  <Link
                    href={bookingsHref(location.slug, { status: "received" })}
                    className="relative z-(--layer-raised) inline-flex items-center gap-1.5 rounded-sm align-top text-warning underline-offset-4 hover:underline focus-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-current"
                    />
                    {location.awaitingConfirmation}
                  </Link>
                </Tooltip>
              ) : (
                location.awaitingConfirmation
              )
            }
          />
          <Figure
            label="Today"
            value={location.pickupsToday}
            none={location.pickupsToday === 0}
          />
        </dl>
      </div>

      <div className="mt-auto grid gap-2 border-t border-hairline px-4 py-3 text-xs text-muted">
        {progress.next ? (
          <div className="flex items-center gap-3">
            <SetupBar
              done={progress.done}
              total={progress.total}
              className="flex-1"
            />
            <span className="shrink-0 tabular-nums">
              {progress.done} of {progress.total} set up · Next:{" "}
              {progress.next.title}
            </span>
          </div>
        ) : null}
        <p className="truncate tabular-nums">
          {location.changedAt
            ? `Changed ${formatLocalDateTime(location.changedAt)}`
            : "No changes recorded"}
        </p>
      </div>
    </Tile>
  );
}

/** One number on a tile, under its label. */
function Figure({
  label,
  value,
  none = false,
}: {
  label: string;
  value: ReactNode;
  /** Nothing to count: the number steps back. */
  none?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd
        className={cx(
          "mt-1 font-serif text-xl leading-none tabular-nums",
          none ? "text-muted" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* One location */

/** What the state means for the public. */
function stateNote(state: LocationState, slug: string) {
  switch (state) {
    case "draft":
      return `Not public yet. Its pages will be at /${slug} once it goes live, and its slug is locked from then on.`;
    case "live":
      return `Public at /${slug}, taking bookings.`;
    case "paused":
      return `Public at /${slug}, with a notice in place of the search card, so no one can book a trip here. Bookings already made stand.`;
  }
}

/**
 * The location's details for Marketing, its state for every admin here,
 * the time between its jobs for Operation, and its deletion for SUPER.
 */
async function locationSettings({
  location: { id },
  permissions,
}: {
  location: LocationName;
  permissions: readonly Permission[];
}) {
  const may = (permission: Permission) => permissions.includes(permission);
  const [location, overview, states, routesIn] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
    // The states to tick, read for Marketing alone.
    may("locations.manage") ? stateOptions() : null,
    // What a delete takes from other locations, read for SUPER alone.
    may("locations.activate") ? routesIntoLocation(id) : [],
  ]);
  if (!location || !overview) notFound();
  const moves = may("locations.activate");
  const state = locationStateOf(location.state);
  const blockers = stateMoveBlockers(
    state,
    LOCATION_STATE_MOVE[state],
    location.pages,
    overview,
  );

  return (
    <div className="grid max-w-3xl gap-5">
      {states ? (
        <Card>
          <CardTitle>Details</CardTitle>
          <LocationDetailsForm
            location={{
              id: location.id,
              name: location.name,
              slug: location.slug,
              stateCodes: location.states.map((entry) => entry.code).sort(),
              slugLocked: isSlugLocked(location),
            }}
            states={states}
          />
        </Card>
      ) : null}
      <Card>
        <CardTitle meta={<LocationStateBadge state={state} />}>
          Status
        </CardTitle>
        <p className="text-sm text-body">{stateNote(state, location.slug)}</p>
        {blockers.length > 0 ? (
          <Notice className="mt-4">
            <p className="font-semibold">Before it can go live:</p>
            <ul className="mt-1 list-disc pl-5">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}.</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        <div className="mt-4">
          {moves ? (
            <StateMove
              locationId={location.id}
              name={location.name}
              state={state}
              blocked={blockers.length > 0}
            />
          ) : (
            <p className="text-sm text-muted">
              Only a SUPER admin takes a location live, pauses it or resumes it.
            </p>
          )}
        </div>
      </Card>
      {may("coverage.manage") ? (
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              Between Jobs
              <InfoTip text="The time a vehicle or a driver is kept free after a job here, on top of the drive to the next pickup. Roads differ by place; drivers arrive early too." />
            </span>
          </CardTitle>
          <SafetyBufferForm
            locationId={location.id}
            minutes={location.safetyBufferMinutes}
          />
        </Card>
      ) : null}
      {moves ? (
        <Card>
          <CardTitle>Delete location</CardTitle>
          <DeleteLocation
            locationId={location.id}
            name={location.name}
            slug={location.slug}
            hasBeenLive={hasBeenLive(location)}
            impact={locationDeleteImpact(location, routesIn)}
          />
        </Card>
      ) : null}
    </div>
  );
}
