import { localDayRange } from "./booking-rules";
import type { BookingStatus, ItemStatus } from "./booking-status";
import { db } from "./client";
import { driversDueWhere } from "./drivers";
import type { Location } from "./generated/prisma/client";
import type { OperationStanding } from "./location-input";
import { PAGE_LOCALE } from "./location-page-input";
import { standingsOf, type PageSummary } from "./locations";
import { vehiclesDueWhere } from "./vehicles";

/**
 * A location in numbers, for the console's home and the location's
 * Overview tab: where it lies, what it sells, its coverage, its queue, its
 * vehicles and drivers, and its pages. Every
 * number is real and counted; nothing is invented. See
 * docs/261015-locations-as-operation-areas.md, "Who may do what".
 */
export type LocationOverview = Pick<
  Location,
  "id" | "name" | "slug" | "state" | "wentLiveAt" | "topChoiceOrder"
> &
  OperationStanding & {
    /** Bookings with a pickup here that Reservation has not confirmed. */
    awaitingConfirmation: number;
    /** Live items picking up here today, Malaysian time. */
    pickupsToday: number;
    /** Confirmed items ahead that Operation has not assigned a driver to. */
    awaitingDriver: number;
    /** Vehicles based here in service. */
    vehicles: number;
    /** Drivers based here, active. */
    drivers: number;
    /** Vehicles here in service with a document due within the warning, or expired. */
    vehiclesDue: number;
    /** Active drivers here with a licence due within the warning, or expired. */
    driversDue: number;
    /** Where each page stands and its hero image, in the order of `LOCATION_PAGES`. */
    pages: PageSummary[];
    /** The newest logged change to the location; null when none is logged. */
    changedAt: Date | null;
  };

const RECEIVED: BookingStatus = "received";
const CONFIRMED: ItemStatus = "confirmed";
const CANCELLED: ItemStatus = "cancelled";

/** Every location, by name, each with its numbers. */
export function listLocationOverviews(
  now: Date = new Date(),
): Promise<LocationOverview[]> {
  return overviewsOf(undefined, now);
}

/** One location's numbers, or null when there is no such location. */
export async function getLocationOverview(
  id: string,
  now: Date = new Date(),
): Promise<LocationOverview | null> {
  const [overview] = await overviewsOf(id, now);
  return overview ?? null;
}

/**
 * The numbers of every location, or of the one with this id: each query
 * narrowed to it, so a location's tab counts its own rows only. Counts
 * are SQL's, by groups, never rows fetched and counted here.
 */
async function overviewsOf(
  locationId: string | undefined,
  now: Date,
): Promise<LocationOverview[]> {
  const today = localDayRange(now);
  const here = locationId ? { locationId } : {};
  // An item belongs to a location only once a location priced it.
  const itemHere = { locationId: locationId ?? { not: null } };
  const [
    locations,
    offerings,
    routes,
    awaiting,
    pickups,
    unassigned,
    changes,
    vehiclesDue,
    driversDue,
  ] = await Promise.all([
    db.location.findMany({
      where: locationId ? { id: locationId } : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        wentLiveAt: true,
        topChoiceOrder: true,
        _count: {
          select: {
            zones: { where: { takesPickups: true } },
            vehicles: { where: { isActive: true } },
            drivers: { where: { isActive: true } },
          },
        },
        states: { select: { name: true }, orderBy: { name: "asc" } },
        pages: {
          where: { locale: PAGE_LOCALE },
          select: { page: true, isOn: true, draft: true, published: true },
        },
      },
    }),
    db.locationVehicleClass.groupBy({
      by: ["locationId"],
      where: { ...here, isActive: true, vehicleClass: { isActive: true } },
      _count: { _all: true },
    }),
    // A route counts once however many classes it is priced for: one
    // group per pair of zones.
    db.zoneRate.groupBy({
      by: ["locationId", "fromZoneId", "toZoneId"],
      where: here,
    }),
    // A booking counts once per location its items pick up in, however
    // many of its items do: one group per booking and location.
    db.bookingItem.groupBy({
      by: ["locationId", "bookingId"],
      where: {
        ...itemHere,
        status: { not: CANCELLED },
        booking: { status: RECEIVED },
      },
    }),
    db.bookingItem.groupBy({
      by: ["locationId"],
      where: {
        ...itemHere,
        status: { not: CANCELLED },
        startsAt: { gte: today.start, lt: today.end },
      },
      _count: { _all: true },
    }),
    db.bookingItem.groupBy({
      by: ["locationId"],
      where: {
        ...itemHere,
        status: CONFIRMED,
        startsAt: { gte: now },
      },
      _count: { _all: true },
    }),
    db.activityLog.groupBy({
      by: ["entityId"],
      where: {
        entityType: "location",
        ...(locationId ? { entityId: locationId } : {}),
      },
      _max: { createdAt: true },
    }),
    db.vehicle.groupBy({
      by: ["locationId"],
      where: { ...here, ...vehiclesDueWhere(now) },
      _count: { _all: true },
    }),
    db.driver.groupBy({
      by: ["locationId"],
      where: { ...here, ...driversDueWhere(now) },
      _count: { _all: true },
    }),
  ]);

  const countBy = <T extends { locationId: string | null }>(
    rows: readonly T[],
    count: (row: T) => number,
  ) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.locationId === null) continue;
      map.set(row.locationId, (map.get(row.locationId) ?? 0) + count(row));
    }
    return map;
  };
  const classesOnSale = countBy(offerings, (row) => row._count._all);
  const routesPriced = countBy(routes, () => 1);
  const awaitingConfirmation = countBy(awaiting, () => 1);
  const pickupsToday = countBy(pickups, (row) => row._count._all);
  const awaitingDriver = countBy(unassigned, (row) => row._count._all);
  const vehiclesDueAt = countBy(vehiclesDue, (row) => row._count._all);
  const driversDueAt = countBy(driversDue, (row) => row._count._all);
  const changedAt = new Map(
    changes.map((row) => [row.entityId, row._max.createdAt]),
  );

  return locations.map(({ _count, states, pages, ...location }) => ({
    ...location,
    stateNames: states.map((state) => state.name),
    classesOnSale: classesOnSale.get(location.id) ?? 0,
    zones: _count.zones,
    routesPriced: routesPriced.get(location.id) ?? 0,
    awaitingConfirmation: awaitingConfirmation.get(location.id) ?? 0,
    pickupsToday: pickupsToday.get(location.id) ?? 0,
    awaitingDriver: awaitingDriver.get(location.id) ?? 0,
    vehicles: _count.vehicles,
    drivers: _count.drivers,
    vehiclesDue: vehiclesDueAt.get(location.id) ?? 0,
    driversDue: driversDueAt.get(location.id) ?? 0,
    pages: standingsOf(pages),
    changedAt: changedAt.get(location.id) ?? null,
  }));
}
