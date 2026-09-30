import { changedFields, logActivity } from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import type { Prisma, Zone, ZoneDistrict } from "./generated/prisma/client";
import type { Place } from "./place";
import { slugify } from "./slug";
import {
  checkZoneDistrictFields,
  checkZoneFields,
  type ZoneDistrictFields,
  type ZoneFields,
} from "./zone-input";

export type { Zone, ZoneDistrict };

/**
 * Zones and their districts: what the site sells where. The readers serve
 * the website and the Zones screen; the writers are the screen's, each
 * taking the actor and logging inside its transaction. Zones are never
 * deleted, only turned off. See docs/260930-ops-screens.md.
 */

const ZONE: ActivityEntityType = "zone";

const NOT_FOUND: Change = { ok: false, error: "Zone not found." };

const withDistricts = {
  include: {
    districts: { orderBy: [{ state: "asc" }, { district: "asc" }] },
  },
} satisfies Prisma.ZoneDefaultArgs;

export type ZoneWithDistricts = Prisma.ZoneGetPayload<typeof withDistricts>;

/** A row of the Zones list: the zone, its districts, and its last change. */
export type ZoneSummary = ZoneWithDistricts & {
  /** From the activity log; null for a zone seeded before the log. */
  changedAt: Date | null;
};

export function listActiveZones(): Promise<Zone[]> {
  return db.zone.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Every district of every active zone, as Google spells them. */
export function listActiveZoneDistricts(): Promise<ZoneDistrict[]> {
  return db.zoneDistrict.findMany({
    where: { zone: { isActive: true } },
    orderBy: [{ state: "asc" }, { district: "asc" }],
  });
}

/** Every zone, active or not, by name, for the Zones screen. */
export async function listZones(): Promise<ZoneSummary[]> {
  const [zones, changes] = await Promise.all([
    db.zone.findMany({ ...withDistricts, orderBy: { name: "asc" } }),
    db.activityLog.groupBy({
      by: ["entityId"],
      where: { entityType: ZONE },
      _max: { createdAt: true },
    }),
  ]);
  const changedAt = new Map(
    changes.map((row) => [row.entityId, row._max.createdAt]),
  );
  return zones.map((zone) => ({
    ...zone,
    changedAt: changedAt.get(zone.id) ?? null,
  }));
}

export function getZone(id: string): Promise<ZoneWithDistricts | null> {
  return db.zone.findUnique({ where: { id }, ...withDistricts });
}

/** The zone a place falls in and the district row that placed it there. */
export type ZoneMatch = { zone: Zone; district: ZoneDistrict };

/**
 * The zone a place falls in, active or not (callers decide what an inactive
 * zone means). Google spells the district in administrative_area_level_2 or,
 * in Malaysia, only in locality, so both are tried, district first. The
 * state breaks a tie when two zones list the same name.
 */
export async function resolveZone(
  place: Pick<Place, "state" | "district" | "locality">,
): Promise<ZoneMatch | null> {
  const candidates = [place.district, place.locality].filter(
    (name): name is string => Boolean(name),
  );
  if (candidates.length === 0) return null;

  const rows = await db.zoneDistrict.findMany({
    where: { district: { in: candidates, mode: "insensitive" } },
    include: { zone: true },
  });
  if (rows.length === 0) return null;

  const rank = (name: string) =>
    candidates.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  const sameState = (state: string) =>
    place.state !== null && state.toLowerCase() === place.state.toLowerCase();

  rows.sort(
    (a, b) =>
      rank(a.district) - rank(b.district) ||
      Number(sameState(b.state)) - Number(sameState(a.state)),
  );
  const first = rows[0];
  if (!first) return null;
  const { zone, ...district } = first;
  return { zone, district };
}

/**
 * A new zone: its slug from its name, multiplier 1, no districts, and off
 * until it has districts to serve.
 */
export async function createZone(actor: Actor, name: string): Promise<Created> {
  const check = checkZoneFields({ name });
  if (!check.ok) return check;
  const slug = slugify(name);
  if (!slug)
    return { ok: false, error: "Enter a name with a letter or digit." };

  return db.$transaction(async (tx) => {
    const taken = await tx.zone.findUnique({ where: { slug } });
    if (taken) {
      return {
        ok: false,
        error: `${taken.name} already has the slug ${slug}.`,
      };
    }
    const after = { name: name.trim(), slug, multiplier: 1, isActive: false };
    const zone = await tx.zone.create({ data: after });
    await logActivity(tx, actor, {
      action: "zone.created",
      entityId: zone.id,
      after,
    });
    return { ok: true, id: zone.id };
  });
}

export type ZonePatch = Partial<ZoneFields & { isActive: boolean }>;

/**
 * Changes the name, the multiplier or the switch. A zone with no districts
 * stays off. Saving what is already there logs nothing.
 */
export async function updateZone(
  actor: Actor,
  id: string,
  patch: ZonePatch,
): Promise<Change> {
  const check = checkZoneFields(patch);
  if (!check.ok) return check;
  const trimmed =
    patch.name === undefined ? patch : { ...patch, name: patch.name.trim() };

  return db.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({
      where: { id },
      include: { _count: { select: { districts: true } } },
    });
    if (!zone) return NOT_FOUND;

    const changed = changedFields(zone, trimmed);
    if (!changed) return { ok: true };
    if (changed.after.isActive === true && zone._count.districts === 0) {
      return { ok: false, error: "Add a district before turning the zone on." };
    }

    await tx.zone.update({ where: { id }, data: changed.after });
    await logActivity(tx, actor, {
      action: "zone.updated",
      entityId: id,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}

/**
 * Lists a town under the zone. A name another zone already holds is refused
 * with that zone named: to move a town, remove it there first.
 */
export async function addZoneDistrict(
  actor: Actor,
  zoneId: string,
  fields: ZoneDistrictFields,
): Promise<Change> {
  const check = checkZoneDistrictFields(fields);
  if (!check.ok) return check;
  const district = fields.district.trim();
  const state = fields.state.trim();

  return db.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({ where: { id: zoneId } });
    if (!zone) return NOT_FOUND;

    const holder = await tx.zoneDistrict.findFirst({
      where: { district: { equals: district, mode: "insensitive" } },
      include: { zone: { select: { name: true } } },
    });
    if (holder) {
      return {
        ok: false,
        error:
          holder.zoneId === zoneId
            ? `${zone.name} already lists ${holder.district}.`
            : `${holder.zone.name} already lists ${holder.district}. Remove it there first.`,
      };
    }

    await tx.zoneDistrict.create({ data: { zoneId, state, district } });
    await logActivity(tx, actor, {
      action: "zone.district.added",
      entityId: zoneId,
      after: { state, district },
    });
    return { ok: true };
  });
}

export async function removeZoneDistrict(
  actor: Actor,
  zoneId: string,
  districtId: string,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const row = await tx.zoneDistrict.findUnique({ where: { id: districtId } });
    if (!row || row.zoneId !== zoneId) {
      return { ok: false, error: "That district is not in this zone." };
    }
    await tx.zoneDistrict.delete({ where: { id: districtId } });
    await logActivity(tx, actor, {
      action: "zone.district.removed",
      entityId: zoneId,
      before: { state: row.state, district: row.district },
    });
    return { ok: true };
  });
}
