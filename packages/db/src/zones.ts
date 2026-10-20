import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import { Prisma, type Zone, type ZoneRate } from "./generated/prisma/client";
import { byClassOrder } from "./offerings";
import {
  ZONE_LIMITS,
  checkOddHours,
  checkZoneFields,
  oddHoursOf,
  type DropoffRule,
  type OddHours,
  type RateCell,
  type ZoneFields,
} from "./rates-input";

export type { Zone, ZoneRate };

/**
 * A location's price list: its zones, the rate grid between them, the
 * odd-hours surcharge and the drop-off rule. The readers serve the Zones
 * and rates tab and the quote; the writers are the tab's, each taking the
 * actor and logging against the location inside its transaction. See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */

/** Why a write did not happen; fits both `Change` and `Created`. */
type Refusal = { ok: false; error: string };

const NOT_FOUND: Refusal = { ok: false, error: "Location not found." };
const ZONE_NOT_FOUND: Refusal = { ok: false, error: "Zone not found." };

/** The zones of a location in their order. */
export function listZones(locationId: string): Promise<Zone[]> {
  return db.zone.findMany({
    where: { locationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function getZone(id: string): Promise<Zone | null> {
  return db.zone.findUnique({ where: { id } });
}

/** Every cell of the location's grid that holds a price. */
export function listZoneRates(locationId: string): Promise<ZoneRate[]> {
  return db.zoneRate.findMany({ where: { locationId } });
}

const zonesInOrder = {
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
} satisfies Prisma.Location$zonesArgs;

const coverage = {
  include: {
    states: { select: { code: true, name: true }, orderBy: { name: "asc" } },
    zones: zonesInOrder,
    zoneRates: true,
  },
} satisfies Prisma.LocationDefaultArgs;

/** A location with what it serves: its states, its zones in their order with their shapes, and its grid. */
export type LocationCoverage = Prisma.LocationGetPayload<typeof coverage>;

/**
 * Every location's coverage by name, or one location's, for the console's
 * Coverage across locations. One query, whatever the number of locations.
 */
export function listCoverage(locationId?: string): Promise<LocationCoverage[]> {
  return db.location.findMany({
    where: locationId ? { id: locationId } : undefined,
    orderBy: { name: "asc" },
    ...coverage,
  });
}

const priceList = {
  include: {
    zones: { ...zonesInOrder, select: { id: true, name: true } },
    zoneRates: true,
    offerings: { include: { vehicleClass: true } },
  },
} satisfies Prisma.LocationDefaultArgs;

/**
 * A location with what it charges: its zones in their order, by name, its
 * grid, and the classes it sells, in the catalogue's order, with their
 * rates and rules.
 */
export type LocationPriceList = Prisma.LocationGetPayload<typeof priceList>;

/**
 * Every location's price list by name, or one location's, for the
 * console's Rates across locations. One query, whatever the number of
 * locations; the zones' shapes are left out.
 */
export async function listPriceLists(
  locationId?: string,
): Promise<LocationPriceList[]> {
  const rows = await db.location.findMany({
    where: locationId ? { id: locationId } : undefined,
    orderBy: { name: "asc" },
    ...priceList,
  });
  return rows.map((row) => ({
    ...row,
    offerings: row.offerings.sort(byClassOrder),
  }));
}

/** A new zone, after the location's others. */
export async function createZone(
  actor: Actor,
  locationId: string,
  fields: ZoneFields,
): Promise<Created> {
  const check = checkZoneFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { id: true, _count: { select: { zones: true } } },
    });
    if (!location) return NOT_FOUND;
    if (location._count.zones >= ZONE_LIMITS.zones) {
      return {
        ok: false,
        error: `A location keeps at most ${ZONE_LIMITS.zones} zones.`,
      };
    }
    const last = await tx.zone.aggregate({
      where: { locationId },
      _max: { sortOrder: true },
    });
    const zone = await tx.zone.create({
      data: {
        locationId,
        name: fields.name,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        shape: fields.shape,
        drawnFrom: fields.drawnFrom ?? undefined,
      },
    });
    await logActivity(tx, actor, {
      action: "location.zone.created",
      entityId: locationId,
      after: { zoneId: zone.id, name: fields.name },
    });
    return { ok: true, id: zone.id };
  });
}

/** Renames or redraws a zone. Its rates stay. */
export async function updateZone(
  actor: Actor,
  id: string,
  fields: ZoneFields,
): Promise<Change> {
  const check = checkZoneFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({ where: { id } });
    if (!zone) return ZONE_NOT_FOUND;
    await tx.zone.update({
      where: { id },
      data: {
        name: fields.name,
        shape: fields.shape,
        drawnFrom: fields.drawnFrom ?? Prisma.DbNull,
      },
    });
    await logActivity(tx, actor, {
      action: "location.zone.updated",
      entityId: zone.locationId,
      before: { zoneId: id, name: zone.name },
      after: { zoneId: id, name: fields.name },
    });
    return { ok: true };
  });
}

/** Removes a zone and every cell of the grid on it. */
export async function deleteZone(actor: Actor, id: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({ where: { id } });
    if (!zone) return ZONE_NOT_FOUND;
    // Its cells go with it, by the schema's cascade.
    await tx.zone.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "location.zone.deleted",
      entityId: zone.locationId,
      before: { zoneId: id, name: zone.name },
    });
    return { ok: true };
  });
}

/**
 * Writes the cells of the grid as posted: a price sets the cell, null
 * clears it. Each cell names two zones of the location and a class it
 * offers. Cells that already hold what is posted are left alone; saving
 * what is already there logs nothing.
 */
export async function setZoneRates(
  actor: Actor,
  locationId: string,
  cells: readonly RateCell[],
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      include: {
        zones: { select: { id: true, name: true } },
        offerings: {
          select: {
            vehicleClassId: true,
            vehicleClass: { select: { name: true } },
          },
        },
        zoneRates: true,
      },
    });
    if (!location) return NOT_FOUND;
    const zoneName = new Map(
      location.zones.map((zone) => [zone.id, zone.name]),
    );
    const className = new Map(
      location.offerings.map((offering) => [
        offering.vehicleClassId,
        offering.vehicleClass.name,
      ]),
    );
    const stored = new Map(
      location.zoneRates.map((rate) => [
        `${rate.fromZoneId}|${rate.toZoneId}|${rate.vehicleClassId}`,
        rate,
      ]),
    );

    const changes: {
      cell: string;
      before: number | null;
      after: number | null;
    }[] = [];
    for (const cell of cells) {
      if (!zoneName.has(cell.fromZoneId) || !zoneName.has(cell.toZoneId)) {
        return { ok: false, error: "A zone on the grid was removed. Reload." };
      }
      if (!className.has(cell.vehicleClassId)) {
        return {
          ok: false,
          error: "A class on the grid is no longer offered here. Reload.",
        };
      }
      const key = `${cell.fromZoneId}|${cell.toZoneId}|${cell.vehicleClassId}`;
      const was = stored.get(key) ?? null;
      if ((was?.priceSen ?? null) === cell.priceSen) continue;

      if (cell.priceSen === null) {
        await tx.zoneRate.delete({ where: { id: was!.id } });
      } else if (was) {
        await tx.zoneRate.update({
          where: { id: was.id },
          data: { priceSen: cell.priceSen },
        });
      } else {
        await tx.zoneRate.create({
          data: {
            locationId,
            fromZoneId: cell.fromZoneId,
            toZoneId: cell.toZoneId,
            vehicleClassId: cell.vehicleClassId,
            priceSen: cell.priceSen,
          },
        });
      }
      changes.push({
        cell: `${zoneName.get(cell.fromZoneId)} to ${zoneName.get(cell.toZoneId)}, ${className.get(cell.vehicleClassId)}`,
        before: was?.priceSen ?? null,
        after: cell.priceSen,
      });
    }
    if (changes.length === 0) return { ok: true };

    await logActivity(tx, actor, {
      action: "location.rates.updated",
      entityId: locationId,
      before: {
        cells: changes.map(({ cell, before }) => ({ cell, priceSen: before })),
      },
      after: {
        cells: changes.map(({ cell, after }) => ({ cell, priceSen: after })),
      },
    });
    return { ok: true };
  });
}

/** Sets the odd-hours surcharge, or removes it with null. Saving what is already there logs nothing. */
export async function setOddHours(
  actor: Actor,
  locationId: string,
  window: OddHours | null,
): Promise<Change> {
  if (window) {
    const check = checkOddHours(window);
    if (!check.ok) return check;
  }
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });
    if (!location) return NOT_FOUND;
    const changed = changedFields(location, {
      oddHoursFromMinute: window?.fromMinute ?? null,
      oddHoursToMinute: window?.toMinute ?? null,
      oddHoursPercent: window?.percent ?? null,
      oddHoursFlatSen: window?.flatSen ?? null,
    });
    if (!changed) return { ok: true };
    await tx.location.update({
      where: { id: locationId },
      data: changed.after,
    });
    const before = oddHoursOf(location);
    await logActivity(tx, actor, {
      action: "location.surcharge.updated",
      entityId: locationId,
      before: before ? { ...before } : {},
      after: window ? { ...window } : {},
    });
    return { ok: true };
  });
}

/** Sets where a one-way trip may end. Setting what is already there logs nothing. */
export async function setDropoffRule(
  actor: Actor,
  locationId: string,
  dropoffRule: DropoffRule,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });
    if (!location) return NOT_FOUND;
    const changed = changedFields(location, { dropoffRule });
    if (!changed) return { ok: true };
    await tx.location.update({
      where: { id: locationId },
      data: changed.after,
    });
    await logActivity(tx, actor, {
      action: "location.dropoff.updated",
      entityId: locationId,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}
