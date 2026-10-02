import { changedFields, listActivityForMany, logActivity } from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import type { Change } from "./change";
import { db } from "./client";
import { checkMultiplier } from "./coverage-input";
import { districtCodeAt } from "./district-index";
import type { District, Prisma, State } from "./generated/prisma/client";

export type { District, State };

/**
 * Coverage: which of Malaysia's districts the site serves, and the price
 * multiplier of each state. The rows are Malaysia's fixed list, seeded from
 * data/malaysia-districts.json and keyed by the same codes; ops only flips
 * a district's switch and sets a state's multiplier. A pickup is placed by
 * its coordinates in a district boundary. See docs/260930-coverage.md.
 */

const STATE: ActivityEntityType = "state";
const DISTRICT: ActivityEntityType = "district";

const withDistricts = {
  include: { districts: { orderBy: { name: "asc" } } },
} satisfies Prisma.StateDefaultArgs;

export type StateWithDistricts = Prisma.StateGetPayload<typeof withDistricts>;

/** A row of the Coverage list: the state, its districts, and its last change. */
export type StateSummary = StateWithDistricts & {
  /** The newest change to the state or any of its districts; null when none is logged. */
  changedAt: Date | null;
};

const withState = {
  include: { state: true },
} satisfies Prisma.DistrictDefaultArgs;

export type DistrictWithState = Prisma.DistrictGetPayload<typeof withState>;

/** Every state, by name, with its districts and its last change. */
export async function listStates(): Promise<StateSummary[]> {
  const [states, changes] = await Promise.all([
    db.state.findMany({ ...withDistricts, orderBy: { name: "asc" } }),
    db.activityLog.groupBy({
      by: ["entityId"],
      where: { entityType: { in: [STATE, DISTRICT] } },
      _max: { createdAt: true },
    }),
  ]);
  const changedAt = new Map(
    changes.map((row) => [row.entityId, row._max.createdAt]),
  );
  return states.map((state) => ({
    ...state,
    changedAt: [state.code, ...state.districts.map((d) => d.code)]
      .map((code) => changedAt.get(code) ?? null)
      .reduce<Date | null>(
        (latest, at) => (at && (!latest || at > latest) ? at : latest),
        null,
      ),
  }));
}

export function getState(code: string): Promise<StateWithDistricts | null> {
  return db.state.findUnique({ where: { code }, ...withDistricts });
}

/** Every district with its state, by state then name, for the null places provider. */
export function listDistricts(): Promise<DistrictWithState[]> {
  return db.district.findMany({
    ...withState,
    orderBy: [{ state: { name: "asc" } }, { name: "asc" }],
  });
}

/**
 * The district a place falls in, served or not (callers decide what an
 * inactive district means), or null when the point is in no district: at
 * sea, or a place the seed has not created yet.
 */
export async function resolveDistrict(place: {
  lat: number;
  lng: number;
}): Promise<DistrictWithState | null> {
  const code = districtCodeAt(place.lat, place.lng);
  if (!code) return null;
  return db.district.findUnique({ where: { code }, ...withState });
}

/** The state's own entries and its districts', oldest first. */
export async function listCoverageActivity(state: StateWithDistricts) {
  return listActivityForMany([
    { entityType: STATE, entityId: state.code },
    ...state.districts.map((d) => ({
      entityType: DISTRICT,
      entityId: d.code,
    })),
  ]);
}

/** Sets the state's multiplier. Saving what is already there logs nothing. */
export async function setStateMultiplier(
  actor: Actor,
  code: string,
  multiplier: number,
): Promise<Change> {
  const check = checkMultiplier(multiplier);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const state = await tx.state.findUnique({ where: { code } });
    if (!state) return { ok: false, error: "State not found." };
    const changed = changedFields(state, { multiplier });
    if (!changed) return { ok: true };
    await tx.state.update({ where: { code }, data: changed.after });
    await logActivity(tx, actor, {
      action: "state.updated",
      entityId: code,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}

/** Turns a district on or off. Setting it to what it is logs nothing. */
export async function setDistrictActive(
  actor: Actor,
  code: string,
  isActive: boolean,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const district = await tx.district.findUnique({ where: { code } });
    if (!district) return { ok: false, error: "District not found." };
    const changed = changedFields(district, { isActive });
    if (!changed) return { ok: true };
    await tx.district.update({ where: { code }, data: changed.after });
    await logActivity(tx, actor, {
      action: "district.updated",
      entityId: code,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}
