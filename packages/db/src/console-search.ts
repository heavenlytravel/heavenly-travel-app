import { db } from "./client";
import { driverSearchWhere } from "./drivers";
import { userSearchWhere } from "./users";
import { vehicleSearchWhere } from "./vehicles";

/**
 * The records the console's search finds as the admin types, beside the
 * bookings (`findBookingMatches`): each kind matched the way its own list
 * matches it, or by its id pasted whole, with only what a line of them
 * shows. Each caps at `take`; the rest are on the kind's list.
 */

/** Its location, for the record's address and the line under it. */
const where = { select: { name: true, slug: true } } as const;

/** Vehicles by plate, brand or model, those in service first. */
export function findVehicleMatches(search: string, take: number) {
  return db.vehicle.findMany({
    where: { OR: [{ id: search }, vehicleSearchWhere(search)] },
    orderBy: [{ isActive: "desc" }, { plate: "asc" }],
    take,
    select: {
      id: true,
      plate: true,
      isActive: true,
      vehicleModel: { select: { brand: true, name: true } },
      location: where,
    },
  });
}

/** Drivers by name or phone, the active first. */
export function findDriverMatches(search: string, take: number) {
  return db.driver.findMany({
    where: { OR: [{ id: search }, driverSearchWhere(search)] },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      location: where,
    },
  });
}

/** Accounts by name or email, the newest first. */
export function findUserMatches(search: string, take: number) {
  return db.user.findMany({
    where: { OR: [{ id: search }, userSearchWhere(search)] },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      adminProfile: { select: { level: true } },
    },
  });
}

/** Classes of the catalogue by name, those on offer first. */
export function findVehicleClassMatches(search: string, take: number) {
  return db.vehicleClass.findMany({
    where: {
      OR: [{ id: search }, { name: { contains: search, mode: "insensitive" } }],
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take,
    select: { id: true, name: true, isActive: true },
  });
}

/** Zones by name, with their location. */
export function findZoneMatches(search: string, take: number) {
  return db.zone.findMany({
    where: {
      OR: [{ id: search }, { name: { contains: search, mode: "insensitive" } }],
    },
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    take,
    select: { id: true, name: true, location: where },
  });
}
