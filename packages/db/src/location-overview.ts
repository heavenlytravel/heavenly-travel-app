import { localDayRange } from "./booking-rules";
import type { BookingStatus, ItemStatus } from "./booking-status";
import { db } from "./client";
import type { Location } from "./generated/prisma/client";
import type { OperationStanding, PageStanding } from "./location-input";
import { PAGE_LOCALE } from "./location-page-input";
import { standingsOf } from "./locations";

/**
 * A location in numbers, for the console's home and the location's
 * Overview tab: where it lies, what it sells, its coverage, its queue and
 * its pages. Every
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
    /** Where each page stands, in the order of `LOCATION_PAGES`. */
    pages: PageStanding[];
    /** The newest logged change to the location; null when none is logged. */
    changedAt: Date | null;
  };

const RECEIVED: BookingStatus = "received";
const CONFIRMED: ItemStatus = "confirmed";
const CANCELLED: ItemStatus = "cancelled";

/** Every location, by name, each with its numbers. */
export async function listLocationOverviews(
  now: Date = new Date(),
): Promise<LocationOverview[]> {
  const today = localDayRange(now);
  const [locations, offerings, routes, awaiting, pickups, unassigned, changes] =
    await Promise.all([
      db.location.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          state: true,
          wentLiveAt: true,
          topChoiceOrder: true,
          _count: { select: { zones: true } },
          states: { select: { name: true }, orderBy: { name: "asc" } },
          pages: {
            where: { locale: PAGE_LOCALE },
            select: { page: true, isOn: true, draft: true, published: true },
          },
        },
      }),
      db.locationVehicleClass.groupBy({
        by: ["locationId"],
        where: { isActive: true, vehicleClass: { isActive: true } },
        _count: { _all: true },
      }),
      // A route counts once however many classes it is priced for.
      db.zoneRate.findMany({
        select: { locationId: true, fromZoneId: true, toZoneId: true },
        distinct: ["locationId", "fromZoneId", "toZoneId"],
      }),
      // A booking counts once per location its items pick up in, however
      // many of its items do.
      db.bookingItem.findMany({
        where: {
          locationId: { not: null },
          status: { not: CANCELLED },
          booking: { status: RECEIVED },
        },
        select: { locationId: true, bookingId: true },
        distinct: ["locationId", "bookingId"],
      }),
      db.bookingItem.groupBy({
        by: ["locationId"],
        where: {
          locationId: { not: null },
          status: { not: CANCELLED },
          startsAt: { gte: today.start, lt: today.end },
        },
        _count: { _all: true },
      }),
      db.bookingItem.groupBy({
        by: ["locationId"],
        where: {
          locationId: { not: null },
          status: CONFIRMED,
          startsAt: { gte: now },
        },
        _count: { _all: true },
      }),
      db.activityLog.groupBy({
        by: ["entityId"],
        where: { entityType: "location" },
        _max: { createdAt: true },
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
    pages: standingsOf(pages),
    changedAt: changedAt.get(location.id) ?? null,
  }));
}

/** One location's numbers, or null when there is no such location. */
export async function getLocationOverview(
  id: string,
  now: Date = new Date(),
): Promise<LocationOverview | null> {
  const overviews = await listLocationOverviews(now);
  return overviews.find((overview) => overview.id === id) ?? null;
}
