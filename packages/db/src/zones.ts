import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import {
  checkDeleteConfirmed,
  type DeleteConfirmation,
  type DeleteImpact,
} from "./delete-impact";
import { Prisma, type Zone, type ZoneRate } from "./generated/prisma/client";
import { andList } from "./names";
import { byClassOrder } from "./offerings";
import {
  ZONE_LIMITS,
  checkOddHours,
  checkWeekend,
  checkZoneFields,
  checkTripReach,
  checkZoneShape,
  isZoneDistrict,
  oddHoursOf,
  weekendOf,
  reshapedFromDistrict,
  type RateCell,
  type TripRules,
  type ZoneFields,
} from "./rates-input";
import { cutOut, joinOverlaps, shapesOverlap } from "./zone-geometry";
import {
  pricedFromByZone,
  pricedRoutesByZone,
  routesByLocation,
  zoneDeleteImpact,
  type RoutesIn,
} from "./zone-routes";
import type { MultiPolygon } from "./geo";
import { isZoneShape, type ZoneShape } from "./zone-match";

export type { Zone, ZoneRate };

/**
 * A location's price list: its zones, the rate grid between them, the
 * odd-hours surcharge and where its trips may go. The readers serve the Zones
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

/** A zone by name with its location's: how a grid names another location's zone. */
export type ZoneElsewhere = {
  id: string;
  name: string;
  locationId: string;
  location: { name: string };
};

/**
 * Every zone by name with its location, by location then in their order,
 * leaving out the location's own when one is given: the zones a route out
 * of it may end at, and the names of those its grid ends at already. A
 * route stays on the zone itself, so a rename or a redraw by its location
 * shows on every grid that prices it.
 */
export function listZonesElsewhere(
  exceptLocationId?: string,
): Promise<ZoneElsewhere[]> {
  return db.zone.findMany({
    where: exceptLocationId
      ? { locationId: { not: exceptLocationId } }
      : undefined,
    orderBy: [
      { location: { name: "asc" } },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      locationId: true,
      location: { select: { name: true } },
    },
  });
}

/** A cell of another location's grid that ends at a zone of this one. */
export type RateFromElsewhere = {
  fromZoneId: string;
  toZoneId: string;
  location: { name: string };
};

/**
 * The cells of other locations' grids that end at the location's zones, or
 * at the one zone: routes out of those locations, such as Kuala Lumpur's to
 * Selangor's KLIA. They go when the zone is removed, and a redraw moves
 * where their trips end.
 */
export function listRatesFromElsewhere(
  locationId: string,
  zoneId?: string,
): Promise<RateFromElsewhere[]> {
  return db.zoneRate.findMany({
    where: {
      locationId: { not: locationId },
      toZone: zoneId ? { id: zoneId, locationId } : { locationId },
    },
    select: {
      fromZoneId: true,
      toZoneId: true,
      location: { select: { name: true } },
    },
  });
}

/** The other locations whose grids end at the zone: their pages change with it. */
function gridsEndingAt(
  tx: Prisma.TransactionClient,
  zone: { id: string; locationId: string },
): Promise<{ locationId: string; location: { name: string } }[]> {
  return tx.zoneRate.findMany({
    where: { toZoneId: zone.id, locationId: { not: zone.locationId } },
    distinct: ["locationId"],
    select: { locationId: true, location: { select: { name: true } } },
  });
}

/**
 * The other locations whose grids end at the location's zones, by name,
 * each with how many routes, a route priced for several classes once:
 * what deleting the location takes from them. `client` is the delete's
 * transaction when it reads them.
 */
export async function routesIntoLocation(
  locationId: string,
  client: Prisma.TransactionClient = db,
): Promise<RoutesIn> {
  const cells = await client.zoneRate.findMany({
    where: { locationId: { not: locationId }, toZone: { locationId } },
    select: {
      locationId: true,
      fromZoneId: true,
      toZoneId: true,
      location: { select: { name: true } },
    },
  });
  return routesByLocation(cells);
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
 * A zone a shape overlaps, as a refusal names it: "Langkawi", or "KLIA
 * (Selangor)" for another location's.
 */
export type ZoneInTheWay = { id: string; label: string };

/**
 * A zone in the way trimmed of a shape's ground, as the zone maker shows
 * it before the save that trims it.
 */
export type ZoneTrim = ZoneInTheWay & { shape: MultiPolygon };

/**
 * A zone write refused because the zone overlaps others, with those zones:
 * the zone maker offers to trim this zone, or to trim them.
 */
export type ZoneRefusal = Refusal & { overlaps?: ZoneInTheWay[] };

/**
 * The key of the lock zone writes take, one at a time across the console,
 * so two saves at once cannot both pass the overlap check.
 */
const ZONE_WRITE_LOCK = 261021;

/**
 * Takes the zone write lock, held until the transaction ends. Every zone
 * write takes it first, before it reads what it checks.
 */
async function lockZoneWrites(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ZONE_WRITE_LOCK})`;
}

/**
 * The zones whose ground the shape covers, of this location or another, in
 * their order; `zoneId`, the zone being remade, is left out.
 */
async function zonesInTheWay(
  client: Prisma.TransactionClient,
  locationId: string,
  shape: ZoneShape,
  zoneId?: string,
) {
  const zones = await client.zone.findMany({
    where: zoneId ? { id: { not: zoneId } } : undefined,
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
  return zones.flatMap((zone) =>
    isZoneShape(zone.shape) && shapesOverlap(shape, zone.shape)
      ? [
          {
            ...zone,
            shape: zone.shape,
            label:
              zone.locationId === locationId
                ? zone.name
                : `${zone.name} (${zone.location.name})`,
          },
        ]
      : [],
  );
}

/** A zone in the way, as `zonesInTheWay` answers it. */
type InTheWay = Awaited<ReturnType<typeof zonesInTheWay>>[number];

/**
 * Why a shape over the zones cannot be saved as it is: zones never overlap,
 * so a pickup falls in one zone of one location at most.
 */
function overlapRefusal(zones: readonly ZoneInTheWay[]): ZoneRefusal {
  const labels = zones.map((zone) => zone.label);
  return {
    ok: false,
    error: `This zone overlaps ${andList(labels)}. Zones cannot overlap, so ${zones.length === 1 ? "one of them gives" : "either this zone or they give"} up the shared ground.`,
    overlaps: zones.map(({ id, label }) => ({ id, label })),
  };
}

/**
 * The zones in the way, each trimmed of the shape's ground, or why they
 * cannot be: one would be left with nothing, or with more corners than a
 * zone keeps. The zone maker's preview and the write both ask it, so the
 * preview refuses what the save would.
 */
function trimmed(
  inTheWay: readonly InTheWay[],
  shape: ZoneShape,
): { ok: true; zones: (InTheWay & { left: MultiPolygon })[] } | ZoneRefusal {
  const overlaps = inTheWay.map(({ id, label }) => ({ id, label }));
  const zones = inTheWay.map((other) => ({
    ...other,
    left: cutOut(other.shape, [shape]),
  }));
  const emptied = zones.filter((other) => other.left.length === 0);
  if (emptied.length > 0) {
    // The other way, trimming this zone, is still open.
    const labels = andList(emptied.map((other) => other.label));
    return {
      ...refuse(
        `This zone covers all of ${labels}, so nothing of ${emptied.length === 1 ? "it" : "them"} would be left. Trim this zone instead, remove ${labels} on the Coverage tab, or reshape this zone.`,
      ),
      overlaps,
    };
  }
  // A hole adds this zone's corners to theirs; past the limit, no editor
  // could save them again.
  const crowded = zones.filter((other) => !checkZoneShape(other.left).ok);
  if (crowded.length > 0) {
    return {
      ...refuse(
        `Trimmed, ${andList(crowded.map((other) => other.label))} would have more than ${ZONE_LIMITS.corners} corners. Trim this zone instead, or give this zone fewer corners.`,
      ),
      overlaps,
    };
  }
  return { ok: true, zones };
}

/**
 * What a shape overlaps, and the two ways out, each worked out as the save
 * would do it or refused as the save would refuse it.
 */
export type OverlapCheck = {
  /** The zones in the way, this location's or another's, in their order; none when nothing is. */
  zones: ZoneInTheWay[];
  /** The zones in the way, each trimmed of the shape's ground, as the save trims them (`makeWay`). */
  trimOthers: { ok: true; zones: ZoneTrim[] } | Refusal;
  /** The shape trimmed of the zones in the way. */
  trimThis: { ok: true; shape: MultiPolygon } | Refusal;
};

/**
 * What a shape overlaps, for the zone maker to show while the zone is
 * drawn, both ways out ready before a save: `zoneId` is the zone being
 * remade, which is left out. One read of the zones.
 */
export async function checkOverlaps(
  locationId: string,
  shape: ZoneShape,
  zoneId?: string,
): Promise<OverlapCheck> {
  const inTheWay = await zonesInTheWay(db, locationId, shape, zoneId);
  const trims = trimmed(inTheWay, shape);
  const left = cutOut(
    shape,
    inTheWay.map((other) => other.shape),
  );
  return {
    zones: inTheWay.map(({ id, label }) => ({ id, label })),
    trimOthers: trims.ok
      ? {
          ok: true,
          zones: trims.zones.map(({ id, label, left }) => ({
            id,
            label,
            shape: left,
          })),
        }
      : refuse(trims.error),
    trimThis:
      left.length > 0
        ? { ok: true, shape: left }
        : refuse(
            "Trimmed, nothing of this zone would be left. Trim the zones in its way instead, or draw it somewhere else.",
          ),
  };
}

/**
 * Makes way for a zone's shape. With no zone in the way, nothing to do.
 * Zones in the way refuse the write, unless the admin chose to trim them
 * (`cutFrom`, their ids as the refusal named them): then each loses the
 * ground the shape covers, keeping its rates, and a district as it is
 * becomes reshaped from it. Refused when the zones in the way are no
 * longer the ones chosen, or when `trimmed` refuses. Under the zone write
 * lock (`lockZoneWrites`). Answers the zones trimmed, for the pages to
 * refresh.
 */
async function makeWay(
  tx: Prisma.TransactionClient,
  actor: Actor,
  zone: { locationId: string; name: string; shape: ZoneShape },
  zoneId: string | undefined,
  cutFrom: readonly string[] | undefined,
): Promise<
  { ok: true; cut: { id: string; locationId: string }[] } | ZoneRefusal
> {
  const inTheWay = await zonesInTheWay(tx, zone.locationId, zone.shape, zoneId);
  if (inTheWay.length === 0) return { ok: true, cut: [] };
  const refusal = overlapRefusal(inTheWay);
  if (!cutFrom) return refusal;
  const chosen = new Set(cutFrom);
  if (
    chosen.size !== inTheWay.length ||
    inTheWay.some((other) => !chosen.has(other.id))
  ) {
    return {
      ...refusal,
      error: `The zones in the way changed meanwhile. ${refusal.error}`,
    };
  }
  // Every trim is worked out before any is written: a refusal returns
  // from the transaction, which then commits what was written.
  const trims = trimmed(inTheWay, zone.shape);
  if (!trims.ok) return trims;
  for (const other of trims.zones) {
    await tx.zone.update({
      where: { id: other.id },
      data: {
        shape: other.left,
        ...(isZoneDistrict(other.drawnFrom)
          ? { drawnFrom: reshapedFromDistrict(other.drawnFrom) }
          : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "location.zone.updated",
      entityId: other.locationId,
      before: { zoneId: other.id, name: other.name },
      after: { zoneId: other.id, name: other.name, cutFor: zone.name },
    });
  }
  return {
    ok: true,
    cut: trims.zones.map(({ id, locationId }) => ({ id, locationId })),
  };
}

/**
 * The other locations a zone write reaches, by id, once each: those whose
 * zones it cut, and those whose grids end at the zones it changed.
 */
async function alsoChangedBy(
  tx: Prisma.TransactionClient,
  locationId: string,
  changed: readonly { id: string; locationId: string }[],
): Promise<string[]> {
  const grids = await Promise.all(
    changed.map((zone) => gridsEndingAt(tx, zone)),
  );
  return [
    ...new Set([
      ...changed.map((zone) => zone.locationId),
      ...grids.flat().map((grid) => grid.locationId),
    ]),
  ].filter((id) => id !== locationId);
}

/**
 * The fields as a zone write stores them, once checked: the shape's pieces
 * that overlap joined (`joinOverlaps`), so the admin need not merge them
 * first. A district as it is keeps its boundary as the data has it.
 */
function fieldsToWrite(
  fields: ZoneFields,
): { ok: true; fields: ZoneFields } | Refusal {
  const check = checkZoneFields(fields);
  if (!check.ok) return check;
  if (isZoneDistrict(fields.drawnFrom)) return { ok: true, fields };
  const shape = joinOverlaps(fields.shape);
  const joined = checkZoneShape(shape);
  return joined.ok ? { ok: true, fields: { ...fields, shape } } : joined;
}

/**
 * A zone write done: the location whose zone it is, and the other
 * locations whose pages it changes, by id: those whose zones it cut, and
 * those whose grids end at a zone it changed. Their search keeps to those
 * zones too, so they are refreshed with the location's own.
 */
export type ZoneChanged = {
  ok: true;
  locationId: string;
  alsoChanged: string[];
};

/**
 * A zone saved, with the zones in its way it trimmed, by id: none when
 * nothing was in its way any more, whatever the admin chose.
 */
export type ZoneSaved = ZoneChanged & { trimmed: string[] };

/**
 * A new zone, after the location's others, its overlapping pieces joined
 * (`fieldsToWrite`). It may not overlap any zone, unless `cutFrom` names
 * the zones in the way to trim (`makeWay`).
 */
export async function createZone(
  actor: Actor,
  locationId: string,
  posted: ZoneFields,
  cutFrom?: readonly string[],
): Promise<(ZoneSaved & { id: string }) | ZoneRefusal> {
  const ready = fieldsToWrite(posted);
  if (!ready.ok) return ready;
  const { fields } = ready;

  return db.$transaction(async (tx) => {
    await lockZoneWrites(tx);
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { id: true, _count: { select: { zones: true } } },
    });
    if (!location) return NOT_FOUND;
    // Before the way is made: a refusal after it would keep the cuts.
    if (location._count.zones >= ZONE_LIMITS.zones) {
      return refuse(
        `A location keeps at most ${ZONE_LIMITS.zones} zones. Delete one first.`,
      );
    }
    const way = await makeWay(
      tx,
      actor,
      { locationId, name: fields.name, shape: fields.shape },
      undefined,
      cutFrom,
    );
    if (!way.ok) return way;
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
    return {
      ok: true,
      id: zone.id,
      locationId,
      alsoChanged: await alsoChangedBy(tx, locationId, way.cut),
      trimmed: way.cut.map((other) => other.id),
    };
  });
}

/**
 * Renames or redraws a zone, its overlapping pieces joined
 * (`fieldsToWrite`). Its rates stay, and other locations' routes to it
 * follow it. It may not overlap any other zone, unless `cutFrom` names the
 * zones in the way to trim (`makeWay`).
 */
export async function updateZone(
  actor: Actor,
  id: string,
  posted: ZoneFields,
  cutFrom?: readonly string[],
): Promise<ZoneSaved | ZoneRefusal> {
  const ready = fieldsToWrite(posted);
  if (!ready.ok) return ready;
  const { fields } = ready;

  return db.$transaction(async (tx) => {
    await lockZoneWrites(tx);
    const zone = await tx.zone.findUnique({ where: { id } });
    if (!zone) return ZONE_NOT_FOUND;
    const way = await makeWay(
      tx,
      actor,
      { locationId: zone.locationId, name: fields.name, shape: fields.shape },
      id,
      cutFrom,
    );
    if (!way.ok) return way;
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
    return {
      ok: true,
      locationId: zone.locationId,
      alsoChanged: await alsoChangedBy(tx, zone.locationId, [zone, ...way.cut]),
      trimmed: way.cut.map((other) => other.id),
    };
  });
}

/**
 * What removing the zone takes as it stands (`zoneDeleteImpact`), counted
 * as the Coverage tab counts it: the location's routes with the zone at an
 * end, and other locations' routes to it.
 */
async function zoneImpactOf(
  tx: Prisma.TransactionClient,
  zone: { id: string; locationId: string; name: string },
): Promise<DeleteImpact> {
  const [own, fromElsewhere] = await Promise.all([
    tx.zoneRate.findMany({
      where: {
        locationId: zone.locationId,
        OR: [{ fromZoneId: zone.id }, { toZoneId: zone.id }],
      },
      select: { fromZoneId: true, toZoneId: true },
    }),
    tx.zoneRate.findMany({
      where: { toZoneId: zone.id, locationId: { not: zone.locationId } },
      select: {
        fromZoneId: true,
        toZoneId: true,
        location: { select: { name: true } },
      },
    }),
  ]);
  return zoneDeleteImpact(
    zone,
    pricedRoutesByZone(own).get(zone.id) ?? 0,
    pricedFromByZone(fromElsewhere).get(zone.id) ?? [],
  );
}

/**
 * Removes a zone and every cell of a grid on it: this location's, and other
 * locations' routes to it, once the admin confirmed what that takes as it
 * stands (./delete-impact), as the Coverage tab says it.
 */
export async function deleteZone(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<ZoneChanged | Refusal> {
  return db.$transaction(async (tx) => {
    // A save trimming this zone meanwhile would otherwise find it gone.
    await lockZoneWrites(tx);
    const zone = await tx.zone.findUnique({ where: { id } });
    if (!zone) return ZONE_NOT_FOUND;
    // The zone held until the delete ends: a route priced to it meanwhile,
    // which takes no zone write lock, waits, then finds it gone, rather
    // than going unannounced.
    await tx.$executeRaw`SELECT id FROM "Zone" WHERE id = ${id} FOR UPDATE`;
    const confirmed = checkDeleteConfirmed(
      await zoneImpactOf(tx, zone),
      confirmation,
    );
    if (!confirmed.ok) return confirmed;
    const grids = await gridsEndingAt(tx, zone);
    // Its cells go with it, other locations' too, by the schema's cascade.
    await tx.zone.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "location.zone.deleted",
      entityId: zone.locationId,
      before: {
        zoneId: id,
        name: zone.name,
        ...(grids.length > 0
          ? { routesFrom: grids.map((grid) => grid.location.name) }
          : {}),
      },
      // Their routes to it went too: the entry is in their history.
      locationIds: grids.map((grid) => grid.locationId),
    });
    return {
      ok: true,
      locationId: zone.locationId,
      alsoChanged: grids.map((grid) => grid.locationId),
    };
  });
}

/**
 * Writes the cells of the grid as posted: a price sets the cell, null
 * clears it. Each cell runs from a zone of the location to another of its
 * zones or, for a route out of it, to another location's zone, and names
 * a class it offers. A new route out is refused while drop-offs are kept
 * inside the location. Cells that already hold what is posted are left
 * alone; saving what is already there logs nothing.
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
    const own = new Set(location.zones.map((zone) => zone.id));
    // Another location's zone a cell ends at is named with its location.
    const farIds = [
      ...new Set(
        cells.flatMap((cell) =>
          own.has(cell.toZoneId) ? [] : [cell.toZoneId],
        ),
      ),
    ];
    const far =
      farIds.length > 0
        ? await tx.zone.findMany({
            where: { id: { in: farIds } },
            select: {
              id: true,
              name: true,
              location: { select: { name: true } },
            },
          })
        : [];
    const zoneName = new Map([
      ...location.zones.map((zone) => [zone.id, zone.name] as const),
      ...far.map(
        (zone) => [zone.id, `${zone.name} (${zone.location.name})`] as const,
      ),
    ]);
    const keptInside = !location.crossLocation;
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
      if (!own.has(cell.fromZoneId) || !zoneName.has(cell.toZoneId)) {
        return refuse("A zone on the grid was deleted meanwhile. Reload.");
      }
      if (!className.has(cell.vehicleClassId)) {
        return refuse("A class on the grid is no longer offered here. Reload.");
      }
      const key = `${cell.fromZoneId}|${cell.toZoneId}|${cell.vehicleClassId}`;
      const was = stored.get(key) ?? null;
      if ((was?.priceSen ?? null) === cell.priceSen) continue;
      if (!was && keptInside && !own.has(cell.toZoneId)) {
        return refuse(
          "Trips stay in this location, so a route cannot end at another location's zone. Turn on trips across locations first.",
        );
      }

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

/**
 * Sets the location's rules on its trips' prices, as the Rates tab saves
 * them together: where trips may go, the odd-hours surcharge and the
 * weekend and holiday surcharge. Each part that changed is logged as its
 * own entry; saving what is already there logs nothing. Switching
 * cross-location off keeps the routes out on the grid, unsold, so
 * switching it back on restores them.
 */
export async function setTripRules(
  actor: Actor,
  locationId: string,
  rules: TripRules,
): Promise<Change> {
  const { reach, oddHours, weekend } = rules;
  for (const check of [
    checkTripReach(reach),
    oddHours ? checkOddHours(oddHours) : null,
    weekend ? checkWeekend(weekend) : null,
  ]) {
    if (check && !check.ok) return check;
  }
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });
    if (!location) return NOT_FOUND;

    const reachChanged = changedFields(location, {
      freeExtraKm: reach.freeExtraKm,
      maxExtraKm: reach.maxExtraKm,
      crossLocation: reach.crossLocation,
    });
    const oddHoursChanged = changedFields(location, {
      oddHoursFromMinute: oddHours?.fromMinute ?? null,
      oddHoursToMinute: oddHours?.toMinute ?? null,
      oddHoursPercent: oddHours?.percent ?? null,
      oddHoursFlatSen: oddHours?.flatSen ?? null,
    });
    const weekendBefore = weekendOf(location);
    const weekendChanged =
      JSON.stringify(weekendBefore) !== JSON.stringify(weekend);
    if (!reachChanged && !oddHoursChanged && !weekendChanged) {
      return { ok: true };
    }

    await tx.location.update({
      where: { id: locationId },
      data: {
        ...reachChanged?.after,
        ...oddHoursChanged?.after,
        ...(weekendChanged
          ? {
              weekendDays: weekend?.days ?? [],
              holidayDates: weekend?.dates ?? [],
              weekendPercent: weekend?.percent ?? null,
              weekendFlatSen: weekend?.flatSen ?? null,
            }
          : {}),
      },
    });
    if (reachChanged) {
      await logActivity(tx, actor, {
        action: "location.reach.updated",
        entityId: locationId,
        before: reachChanged.before,
        after: reachChanged.after,
      });
    }
    if (oddHoursChanged) {
      const before = oddHoursOf(location);
      await logActivity(tx, actor, {
        action: "location.surcharge.updated",
        entityId: locationId,
        before: before ? { ...before } : {},
        after: oddHours ? { ...oddHours } : {},
      });
    }
    if (weekendChanged) {
      await logActivity(tx, actor, {
        action: "location.weekend.updated",
        entityId: locationId,
        before: weekendBefore ? { ...weekendBefore } : {},
        after: weekend ? { ...weekend } : {},
      });
    }
    return { ok: true };
  });
}
