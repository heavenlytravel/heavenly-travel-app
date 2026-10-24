import Link from "next/link";
import {
  ADMIN_TEAM_LABELS,
  LANDING_PAGE,
  adminTeamsOf,
  andList,
  formatLocalDateTime,
  setupProgress,
  setupSteps,
} from "@repo/db";
import { listLocationOverviews, type LocationOverview } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { Button } from "@repo/ui/button";
import { Tooltip } from "@repo/ui/tooltip";
import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { AddressTester } from "../_components/AddressTester";
import { PageHeader } from "../_components/PageHeader";
import {
  Card,
  CardTitle,
  TILE_LINK,
  Tile,
  TileGrid,
} from "../_components/Card";
import { Streamed, TileGridSkeleton } from "../_components/Skeleton";
import { LocationStateBadge } from "../_components/StatusBadges";
import { getPermissions, requireAdmin } from "../_lib/access";
import {
  NEW_LOCATION_PATH,
  locationBookingsHref,
  locationHref,
} from "../_lib/routes";
import { CardImage } from "../_components/CardImage";
import { SetupBar } from "./locations/_components/SetupBar";

function whoAmI(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  const { level, teams } = admin.adminProfile;
  const names = adminTeamsOf(teams).map((team) => ADMIN_TEAM_LABELS[team]);
  const role = names.length > 0 ? `${level}, ${names.join(" and ")}` : level;
  return `Signed in as ${admin.email}, ${role}.`;
}

/**
 * Route: /. The console's home for every admin: the locations, a card
 * each with its main page's hero image and its numbers, and a field that
 * places an address as a booking would. Every team works inside a
 * location; this is where they pick one. See
 * docs/261015-locations-as-operation-areas.md.
 */
export default async function LocationsPage() {
  const admin = await requireAdmin("dashboard.view");
  const permissions = await getPermissions();

  return (
    <>
      <PageHeader
        title="Overview"
        description={whoAmI(admin)}
        action={
          permissions.includes("locations.manage") ? (
            <Button asChild>
              <Link href={NEW_LOCATION_PATH}>Add location</Link>
            </Button>
          ) : null
        }
      />

      <section aria-label="All locations" className="mt-6">
        <Streamed fallback={<TileGridSkeleton />}>
          {() =>
            locationCards({
              opensBookings: permissions.includes("bookings.view"),
            })
          }
        </Streamed>
      </section>

      <Card className="mt-8">
        <CardTitle description="Pick a real place to see the zone its coordinates fall in and the location that serves it, as a booking would.">
          Test an address
        </CardTitle>
        <AddressTester hasGoogle={hasGooglePlaces} />
      </Card>
    </>
  );
}

/** Every location as a card. */
async function locationCards({ opensBookings }: { opensBookings: boolean }) {
  const locations = await listLocationOverviews();

  if (locations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        No locations yet. Add the first one.
      </p>
    );
  }
  return (
    <TileGrid>
      {locations.map((location) => (
        <LocationCard
          key={location.id}
          location={location}
          opensBookings={opensBookings}
        />
      ))}
    </TileGrid>
  );
}

/**
 * One location: its main page's hero image under its status, its name
 * and states, its numbers, and how far its setup has come. The whole card
 * opens the location; for a team that works the bookings, the count
 * awaiting confirmation opens them.
 */
function LocationCard({
  location,
  opensBookings,
}: {
  location: LocationOverview;
  /** The admin may open the bookings: the count awaiting confirmation is a link to them. */
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
        fallback={
          <span className="text-5xl font-semibold text-slate-300">
            {location.name.charAt(0).toUpperCase()}
          </span>
        }
      >
        <LocationStateBadge state={location.state} />
      </CardImage>

      <div className="grid gap-4 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">
            {/* The link's box covers the card, so the whole card opens the location. */}
            <Link href={locationHref(location.slug)} className={TILE_LINK}>
              {location.name}
            </Link>
          </h2>
          <p className="truncate text-xs text-slate-500">
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
            muted={location.awaitingConfirmation === 0}
            value={
              location.awaitingConfirmation > 0 && opensBookings ? (
                // Above the card's link, so it opens the bookings instead.
                <Tooltip content="Bookings awaiting confirmation">
                  <Link
                    href={locationBookingsHref(location.slug, {
                      status: "received",
                    })}
                    className="relative z-1 inline-flex items-center gap-1.5 align-top text-amber-800 underline-offset-4 hover:underline"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-amber-500"
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
            muted={location.pickupsToday === 0}
          />
        </dl>
      </div>

      <div className="mt-auto grid gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
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

/** One number on a card, under its label. */
function Figure({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: ReactNode;
  /** Nothing to count: the number in grey. */
  muted?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-slate-500">{label}</dt>
      <dd
        className={cx(
          "mt-0.5 text-lg font-semibold tabular-nums",
          muted ? "text-slate-400" : "text-slate-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
