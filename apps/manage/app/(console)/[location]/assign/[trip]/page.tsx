import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingLabelOf,
  assignStateOf,
  assignTripsOf,
  durationLabel,
  formatLocalDateTime,
  isLive,
  isOnTheRoad,
  namedIdOf,
  PART_ROLE_LABELS,
  PART_ROLES,
  rolesToAsk,
  suppliesIt,
  tripDetailRows,
  tripViewOfItem,
  untilPickup,
  tripUrgencyOf,
} from "@repo/db";
import {
  bookingIdOfTrip,
  getBookingFulfilment,
  listCandidates,
  listTripEvents,
  listVendorOptions,
  type FulfilmentTrip,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Rows } from "@repo/ui/rows";
import { Card, CardTitle } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed } from "@repo/console/Skeleton";
import { AssignStateBadge, URGENCY_TEXT } from "@repo/console/StatusBadges";
import { requireAdmin } from "../../../../_lib/access";
import {
  assignTripHref,
  bookingHref,
  type ScopeSlug,
} from "../../../../_lib/routes";
import { scopeOf, type ConsoleScope } from "../../../../_lib/scope";
import {
  BookingSkeleton,
  CustomerCard,
  Stop,
} from "../../bookings/[id]/BookingScreen";
import { scopedBooking } from "../../bookings/_lib/scoped-booking";
import { QuickViewButton } from "../QuickView";
import { TripReports } from "../TripReports";
import { AssignCards, type OpenRole } from "./AssignCards";
import { PartCard } from "./PartCard";

/**
 * Route: /[location]/assign/[trip]. One trip, Operation's workspace: the
 * vehicle and the driver it still needs, and its tour guide when it goes
 * with one, picked vendor first; each one
 * already asked, with whose answer it waits for and what to do next
 * (name, accept, record a decline, withdraw or release); what its driver
 * reported on the day, first once the trip is on the road or done. Beside
 * them the trip, the customer and the booking's other trips; its
 * reference opens a quick view of the booking. Opened from the Assign list and the booking's
 * "Who does it". See docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function AssignTripPage({
  params,
}: PageProps<"/[location]/assign/[trip]">) {
  await requireAdmin("bookings.fulfil");
  const scope = await scopeOf(params);
  const { trip } = await params;
  return (
    <Streamed fallback={<BookingSkeleton />}>
      {() => assignTripScreen(scope, trip)}
    </Streamed>
  );
}

async function assignTripScreen(scope: ConsoleScope, tripId: string) {
  const bookingId = await bookingIdOfTrip(tripId);
  if (!bookingId) notFound();
  const [booking, trips, events] = await Promise.all([
    scopedBooking(bookingId, scope),
    getBookingFulfilment(bookingId),
    listTripEvents([tripId]),
  ]);
  const trip = trips.find((t) => t.id === tripId);
  const item = booking.items.find((i) => i.id === tripId);
  if (!trip || !item) notFound();

  const roles = rolesToAsk(trip);
  const unnamed = trip.parts.some((p) => namedIdOf(p) === null);
  // Who is free is read only when something is to pick.
  const picking = roles.length > 0 || unnamed;
  const [vehicles, drivers, guides, vendors] = picking
    ? await Promise.all([
        listCandidates(bookingId, "vehicle"),
        listCandidates(bookingId, "driver"),
        trip.withGuide ? listCandidates(bookingId, "guide") : [],
        listVendorOptions(),
      ])
    : [[], [], [], []];
  const candidatesOf = { vehicle: vehicles, driver: drivers, guide: guides };
  // Each role is then offered to the vendors that supply it (`suppliesIt`):
  // a vehicle-only vendor is never asked for a driver, nor a driver-only
  // one for a vehicle.
  const serving = vendors.filter(
    (v) =>
      v.status === "active" &&
      (v.isOurs ||
        (item.locationId !== null && v.locationIds.includes(item.locationId))),
  );

  const live = trips.filter((t) => isLive(t) && t.status !== "completed");
  const open = assignTripsOf(live.map((t) => ({ ...t, roles: rolesToAsk(t) })));
  const thisOpen = open.find((t) => t.id === trip.id);
  const view = tripViewOfItem(item);
  const details = item.tripDetails;
  const state = assignStateOf({ ...trip, reported: isOnTheRoad(events) });
  // On the road or done, what the driver reports comes first.
  const reporting = state === "on-the-road" || state === "done";
  const until = untilPickup(trip.startsAt);
  const urgency = tripUrgencyOf({ startsAt: trip.startsAt, state });

  const facts: [string, string][] = details
    ? tripDetailRows(details).map(([label, value]) =>
        label === "Vehicle" ? ["Class", value] : [label, value],
      )
    : [];
  facts.unshift([
    "Kind",
    view?.hours ? `By the hour, ${durationLabel(view.hours)}` : "Transfer",
  ]);
  if (scope.slug === null && item.location) {
    facts.push(["Location", item.location.name]);
  }

  // The roles still to assign on this trip, each card's question.
  const openRoles: OpenRole[] = PART_ROLES.filter(
    (role) =>
      !trip.parts.some((p) => p.role === role) &&
      (thisOpen?.roles.includes(role) ?? false),
  ).map((role) => ({
    role,
    description:
      role === "guide" && trip.guideLanguage
        ? `Choose the vendor, then a guide who speaks ${trip.guideLanguage}, or Any to let them assign one.${trip.guideRequest ? ` ${trip.guideRequest} was asked for too: amend the trip if a guide is found.` : ""}`
        : role === "vehicle"
          ? "Choose the vendor, then their vehicle of the class booked, or Any to let them assign it. Tick Assign others for another class."
          : `Choose the vendor, then their ${PART_ROLE_LABELS[role].toLowerCase()} or Any to let them assign it.`,
    others: open.filter((t) => t.id !== trip.id && t.roles.includes(role)),
    candidates: candidatesOf[role],
    vendors: serving.filter((v) => suppliesIt(v, role)),
  }));

  const reports = (
    <TripReports
      bookingId={booking.id}
      trips={[trip]}
      events={events}
      canFulfil
    />
  );

  return (
    <>
      <PageHeader
        title={`Trip ${trip.position}`}
        badge={<AssignStateBadge state={state} />}
        meta={
          <>
            <QuickViewButton
              bookingId={booking.id}
              label={bookingLabelOf(booking)}
              href={bookingHref(scope.slug, booking.id)}
            />
            {" · "}
            {formatLocalDateTime(trip.startsAt)}
            {" · "}
            <span className={urgency ? URGENCY_TEXT[urgency] : undefined}>
              {until.label}
            </span>
          </>
        }
        action={
          <Button asChild variant="secondary">
            <Link href={bookingHref(scope.slug, booking.id)}>Open booking</Link>
          </Button>
        }
      />
      <DetailColumns
        main={
          <>
            {reporting ? reports : null}
            {trip.status === "received" ? (
              <Card>
                <p className="text-sm text-muted">
                  This trip is assigned once Reservation confirms it.
                </p>
              </Card>
            ) : null}
            {/* One card per role, in order: to assign, or asked and where it stands. */}
            {PART_ROLES.map((role) => {
              const part = trip.parts.find((p) => p.role === role);
              const candidates = candidatesOf[role];
              if (!part) {
                // The roles to assign, together where the first one stands.
                if (!thisOpen || role !== openRoles[0]?.role) return null;
                return (
                  <AssignCards
                    key="to-assign"
                    bookingId={booking.id}
                    trip={thisOpen}
                    roles={openRoles}
                  />
                );
              }
              const siblings = siblingsOf(live, part);
              return (
                <PartCard
                  key={part.id}
                  bookingId={booking.id}
                  role={role}
                  part={part}
                  partIds={siblings.map((s) => s.id)}
                  positions={siblings.map((s) => s.position)}
                  itemIds={siblings.map((s) => s.itemId)}
                  candidates={candidates.filter(
                    (c) => c.vendor.id === part.offer.vendor.id,
                  )}
                  payLines={trip.payLines.filter((line) => line.role === role)}
                />
              );
            })}
            {reporting ? null : reports}
          </>
        }
        side={
          <>
            <Card>
              <CardTitle>Trip</CardTitle>
              {view ? (
                <ol className="mb-4 grid gap-4">
                  <Stop
                    place={view.pickup}
                    first
                    last={!view.dropoff}
                    line={[formatLocalDateTime(view.startsAt)]}
                  />
                  {view.dropoff ? (
                    <Stop
                      place={view.dropoff}
                      first={false}
                      last
                      line={[
                        view.distanceKm !== null
                          ? `${view.distanceKm.toFixed(1)} km by road`
                          : null,
                      ]}
                    />
                  ) : null}
                </ol>
              ) : null}
              <Rows rows={facts} className="text-sm" />
            </Card>
            <CustomerCard booking={booking} />
            {live.length > 1 ? (
              <OtherTrips
                scope={scope.slug}
                trips={live.filter((t) => t.id !== trip.id)}
              />
            ) : null}
          </>
        }
      />
    </>
  );
}

/** The parts of the same ask on the booking's live trips: one offer, one role, the same record, waiting alike. */
function siblingsOf(
  live: readonly FulfilmentTrip[],
  part: FulfilmentTrip["parts"][number],
) {
  return live.flatMap((t) =>
    t.parts
      .filter(
        (p) =>
          p.offerId === part.offerId &&
          p.role === part.role &&
          p.vehicleId === part.vehicleId &&
          p.driverId === part.driverId &&
          p.guideId === part.guideId &&
          (p.vendorAcceptedAt === null) === (part.vendorAcceptedAt === null) &&
          (p.driverAcceptedAt === null) === (part.driverAcceptedAt === null),
      )
      .map((p) => ({ id: p.id, itemId: t.id, position: t.position })),
  );
}

/** The booking's other live trips, each with where it stands and the way to its own page. */
function OtherTrips({
  scope,
  trips,
}: {
  scope: ScopeSlug;
  trips: FulfilmentTrip[];
}) {
  return (
    <Card>
      <CardTitle>Other trips</CardTitle>
      <ul className="grid gap-3 text-sm">
        {trips.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <Link
              href={assignTripHref(scope, t.id)}
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              Trip {t.position}
            </Link>
            <span className="text-muted">
              {formatLocalDateTime(t.startsAt)}
            </span>
            <span className="ml-auto">
              <AssignStateBadge
                state={assignStateOf({ ...t, reported: false })}
              />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
