import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import { Prisma, type Zone, type ZoneRate } from "./generated/prisma/client";
import { andList } from "./names";
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
import { cutOut, shapesOverlap } from "./zone-geometry";
import type { MultiPolygon } from "./geo";
import { isZoneShape, type ZoneShape } from "./zone-match";

export type { Zone, ZoneRate };

/**
 * A location's price list: its zones, the rate grid between them, the
 * odd-hours surcharge and the drop-off rule. The readers serve the Zones
 * and rates tab and the quote; the writers are the tab's, each taking the
 * actor and logging against the location inside its transaction. See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */

const NOT_FOUND = refuse(
  "This location was deleted meanwhile. Go back to Locations.",
);
const ZONE_NOT_FOUND = refuse(
  "This zone was deleted meanwhile. Go back to Coverage.",
);

/** The zones of a location in their order. */
export function listZones(locationId: string): Promise<Zone[]> {
  return db.zone.findMany({
    where: { locationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** The zones of a location in their order, by name only: what a list or a menu of them shows. */
export function listZoneNames(
  locationId: string,
): Promise<{ id: string; name: string }[]> {
  return db.zone.findMany({
    where: { locationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
}

/** A zone with its shape and its location, as the zone maker draws the zones around one. */
export type ZoneOutline = Pick<
  Zone,
  "id" | "name" | "shape" | "drawnFrom" | "locationId"
> & {
  location: { name: string };
};

/**
 * Every zone of every location, with its shape: what a zone being made
 * may not overlap, this location's or another's.
 */
export function listZoneOutlines(): Promise<ZoneOutline[]> {
  return db.zone.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      shape: true,
      drawnFrom: true,
      locationId: true,
      location: { select: { name: true } },
    },
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

/**
 * A zone write refused because the zone overlaps others, with their names:
 * the zone maker offers to cut them out of it.
 */
export type ZoneRefusal = Refusal & { overlaps?: string[] };

/**
 * The key of the lock zone writes take, one at a time across the console,
 * so two saves at once cannot both pass the overlap check.
 */
const ZONE_WRITE_LOCK = 261021;

/**
 * Why the shape cannot be saved: it covers ground another zone covers, of
 * this location or another. Zones never overlap, so a pickup falls in one
 * zone of one location at most. Null when it overlaps none. Takes the
 * lock, so it runs first in the write's transaction.
 */
async function overlapRefusal(
  tx: Prisma.TransactionClient,
  locationId: string,
  shape: ZoneShape,
  zoneId?: string,
): Promise<ZoneRefusal | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ZONE_WRITE_LOCK})`;
  const zones = await tx.zone.findMany({
    where: zoneId ? { id: { not: zoneId } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      name: true,
      shape: true,
      locationId: true,
      location: { select: { name: true } },
    },
  });
  const overlaps = zones.flatMap((zone) =>
    isZoneShape(zone.shape) && shapesOverlap(shape, zone.shape)
      ? [
          zone.locationId === locationId
            ? zone.name
            : `${zone.name} (${zone.location.name})`,
        ]
      : [],
  );
  if (overlaps.length === 0) return null;
  return {
    ok: false,
    error: `This zone overlaps ${andList(overlaps)}. Zones never overlap: reshape it, or cut ${overlaps.length === 1 ? "that zone" : "those zones"} out of it.`,
    overlaps,
  };
}

/**
 * The shape with every zone it overlaps cut out of it, this location's or
 * another's, for the zone maker to show before it is saved: `zoneId` is
 * the zone being remade, which is left out. Refused when nothing is left.
 */
export async function cutOutOverlaps(
  shape: ZoneShape,
  zoneId?: string,
): Promise<{ ok: true; shape: MultiPolygon } | Refusal> {
  const zones = await db.zone.findMany({
    where: zoneId ? { id: { not: zoneId } } : undefined,
    select: { shape: true },
  });
  const overlapping = zones.flatMap(({ shape: other }) =>
    isZoneShape(other) && shapesOverlap(shape, other) ? [other] : [],
  );
  const left = cutOut(shape, overlapping);
  if (left.length === 0) {
    return refuse(
      "Nothing of this zone is left once the zones it overlaps are cut out. Draw it somewhere else.",
    );
  }
  return { ok: true, shape: left };
}

/** A new zone, after the location's others. It may not overlap any zone. */
export async function createZone(
  actor: Actor,
  locationId: string,
  fields: ZoneFields,
): Promise<Created | ZoneRefusal> {
  const check = checkZoneFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { id: true, _count: { select: { zones: true } } },
    });
    if (!location) return NOT_FOUND;
    const overlap = await overlapRefusal(tx, locationId, fields.shape);
    if (overlap) return overlap;
    if (location._count.zones >= ZONE_LIMITS.zones) {
      return refuse(
        `A location keeps at most ${ZONE_LIMITS.zones} zones. Delete one first.`,
      );
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

/** Renames or redraws a zone. Its rates stay. It may not overlap any other zone. */
export async function updateZone(
  actor: Actor,
  id: string,
  fields: ZoneFields,
): Promise<Change | ZoneRefusal> {
  const check = checkZoneFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({ where: { id } });
    if (!zone) return ZONE_NOT_FOUND;
    const overlap = await overlapRefusal(tx, zone.locationId, fields.shape, id);
    if (overlap) return overlap;
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
        return refuse("A zone on the grid was deleted meanwhile. Reload.");
      }
      if (!className.has(cell.vehicleClassId)) {
        return refuse("A class on the grid is no longer offered here. Reload.");
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
