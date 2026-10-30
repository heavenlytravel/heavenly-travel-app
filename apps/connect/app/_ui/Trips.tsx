import type { DriverTrip, VendorTrip } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
} from "@repo/ui/icons";
import Link from "next/link";
import { tripStateOf } from "../_lib/trip-state";
import { byDay, dayLabel } from "../_lib/when";
import { Countdown } from "./Countdown";
import {
  Avatar,
  BigTime,
  Chip,
  Panel,
  Pill,
  Plate,
  RouteLine,
  SectionTitle,
} from "./parts";

type Trip = DriverTrip | VendorTrip;

/** Where a trip goes, by area: "Kuah → Langkawi Airport", or "Kuah, by the hour". */
export function routeText(
  trip: Pick<DriverTrip, "pickupArea" | "dropoffArea">,
) {
  return trip.dropoffArea
    ? `${trip.pickupArea} → ${trip.dropoffArea}`
    : `${trip.pickupArea}, by the hour`;
}

/** The trip's areas as the route line draws them. */
export function areaStops(
  trip: Pick<DriverTrip, "pickupArea" | "dropoffArea">,
) {
  return trip.dropoffArea
    ? [
        { title: trip.pickupArea, detail: "Pick-up area" },
        { title: trip.dropoffArea, detail: "Drop-off area" },
      ]
    : [{ title: trip.pickupArea, detail: "By the hour, from here" }];
}

/**
 * The job that matters now, large: the one under way, else the next one.
 * The time from arm's length, how long until, the route, and the way in.
 */
export function NextJobCard({ trip, now }: { trip: Trip; now: Date }) {
  const state = tripStateOf(trip);
  const going = state.live;
  return (
    <Panel className="connect-rise overflow-hidden">
      <div className="grid gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold tracking-kicker text-brand uppercase">
            {going ? "On the job" : "Next job"}
          </span>
          <Pill tone={state.tone} live={state.live}>
            {state.label}
          </Pill>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="grid gap-1.5">
            <BigTime at={trip.startsAt} className="text-5xl text-ink" />
            <span className="text-sm font-medium text-muted">
              {dayLabel(trip.startsAt, now)} · <Countdown at={trip.startsAt} />
            </span>
          </div>
          <span className="pb-1 text-right text-xs font-semibold text-muted tabular-nums">
            {trip.reference}
            {trip.position > 1 ? ` · trip ${trip.position}` : ""}
          </span>
        </div>
        <RouteLine stops={areaStops(trip)} />
        <div className="flex flex-wrap gap-2">
          <Chip>{trip.className}</Chip>
          <Chip icon={UsersIcon}>{trip.passengers}</Chip>
          {"vehicle" in trip && trip.vehicle ? (
            <Plate>{trip.vehicle}</Plate>
          ) : null}
        </div>
      </div>
      {/* Square, across the card's foot: the card's corners round it. */}
      <Button asChild size="lg" className="w-full rounded-none">
        <Link href={`/~/jobs/${trip.itemId}`}>
          {going ? "Continue the job" : "Open job"}
          <ArrowRightIcon className="size-5" />
        </Link>
      </Button>
    </Panel>
  );
}

/** One trip on a list: its time large at the left, the route, and where it stands. */
export function TripRow({
  trip,
  now,
  showDay = false,
}: {
  trip: Trip;
  now: Date;
  /** Off a list grouped by day: the day under the time. */
  showDay?: boolean;
}) {
  const state = tripStateOf(trip);
  const vendor = "vehicle" in trip ? trip : null;
  return (
    <li>
      <Link
        href={`/~/jobs/${trip.itemId}`}
        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-hover active:bg-hairline focus-ring-inset sm:px-5"
      >
        <span className="grid w-16 shrink-0 justify-items-start gap-0.5">
          <BigTime
            at={trip.startsAt}
            className="text-xl text-ink"
            periodClassName="text-muted"
          />
          {showDay ? (
            <span className="text-2xs font-semibold text-muted">
              {dayLabel(trip.startsAt, now)}
            </span>
          ) : null}
        </span>
        <span className="grid min-w-0 flex-1 gap-1.5">
          <span className="truncate font-semibold text-ink">
            {routeText(trip)}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>{trip.className}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="size-3" />
              {trip.passengers}
            </span>
            {vendor ? (
              <>
                {vendor.vehicle ? <Plate>{vendor.vehicle}</Plate> : null}
                {vendor.driver ? (
                  <span className="inline-flex items-center gap-1 font-medium text-body">
                    <Avatar name={vendor.driver} size="sm" />
                    {vendor.driver.split(" ")[0]}
                  </span>
                ) : (
                  <span className="font-medium text-warning">No driver</span>
                )}
              </>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {vendor && vendor.driver && !vendor.driverAccepted ? (
            <Pill tone="amber">Driver to accept</Pill>
          ) : state.tone === "brand" ? null : (
            <Pill tone={state.tone} live={state.live}>
              {state.label}
            </Pill>
          )}
          <ChevronRightIcon className="size-5 text-edge transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

/** Trips under the days they fall on: "Today", "Tomorrow", "Fri, 31 Oct". */
export function TripDays({
  title,
  trips,
  now,
}: {
  title: string;
  trips: Trip[];
  now: Date;
}) {
  if (trips.length === 0) return null;
  return (
    <section className="grid gap-3">
      <SectionTitle count={trips.length}>{title}</SectionTitle>
      {byDay(trips, (t) => t.startsAt).map((day) => (
        <Panel key={day.at.toISOString()} className="overflow-hidden">
          <h3 className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-sm font-bold text-ink sm:px-5">
            {dayLabel(day.at, now)}
            <span className="text-xs font-medium text-muted">
              {day.items.length} {day.items.length === 1 ? "trip" : "trips"}
            </span>
          </h3>
          <ul className="divide-y divide-hairline">
            {day.items.map((trip) => (
              <TripRow key={trip.itemId} trip={trip} now={now} />
            ))}
          </ul>
        </Panel>
      ))}
    </section>
  );
}

/** The trips done lately, folded away. */
export function DoneTrips({ trips, now }: { trips: Trip[]; now: Date }) {
  if (trips.length === 0) return null;
  return (
    <details className="group grid gap-3">
      {/* A section's heading, as `SectionTitle` draws it, that folds. */}
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-control py-1 text-ink focus-ring [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-title">Done lately</span>
          <Badge className="tabular-nums">{trips.length}</Badge>
        </span>
        <ChevronDownIcon className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <Panel className="mt-3 overflow-hidden">
        <ul className="divide-y divide-hairline">
          {trips.map((trip) => (
            <TripRow key={trip.itemId} trip={trip} now={now} showDay />
          ))}
        </ul>
      </Panel>
    </details>
  );
}
