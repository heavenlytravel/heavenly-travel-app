import {
  activityActionMeta,
  isActorKind,
  type ActivityAction,
  type ActivityEntityType,
  type Actor,
} from "./activity-actions";
import { db } from "./client";
import type { ActivityLog, Prisma } from "./generated/prisma/client";
import { fullName } from "./names";

/**
 * The activity log: one row per change, written by the transaction that
 * makes the change, so a change that is not logged does not happen. Rows
 * are never edited or deleted. The vocabulary is in ./activity-actions.
 */

export type { ActivityLog };

export type ActivityWrite = {
  action: ActivityAction;
  /** The booking, zone, class, admin user or setting the action touched. */
  entityId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
};

/** Writes one entry inside the caller's transaction. */
export function logActivity(
  tx: Prisma.TransactionClient,
  actor: Actor,
  entry: ActivityWrite,
) {
  const meta = activityActionMeta(entry.action);
  return tx.activityLog.create({
    data: {
      actorId: actor.kind === "system" ? null : actor.userId,
      actorKind: actor.kind,
      action: entry.action,
      entityType: meta.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      customerVisible: meta.customerVisible,
    },
  });
}

type Scalar = string | number | boolean | null;

/**
 * The fields of `patch` that differ from `current`, as the `before` and
 * `after` an update logs and the `data` it writes. Null when nothing
 * differs, so saving what is already there logs nothing. A field left
 * undefined in the patch is not a change.
 */
export function changedFields<P extends Record<string, Scalar>>(
  current: { [K in keyof P]: Scalar },
  patch: Partial<P>,
): { before: Partial<P>; after: Partial<P> } | null {
  const before: Partial<P> = {};
  const after: Partial<P> = {};
  for (const key of Object.keys(patch) as (keyof P)[]) {
    const value = patch[key];
    if (value === undefined || value === current[key]) continue;
    before[key] = current[key] as P[keyof P];
    after[key] = value;
  }
  return Object.keys(after).length > 0 ? { before, after } : null;
}

/** An entry with its actor and record named, ready to show. */
export type ActivityEntry = ActivityLog & {
  /** "Nurul Aina", the email when there is no name, "System", or "Former staff". */
  actorName: string;
  /** "HT-7K3QZM", "Klang Valley", the admin's email, "The wall"; the id when unknown. */
  entityLabel: string;
};

const FORMER: Record<"admin" | "customer", string> = {
  admin: "Former staff",
  customer: "Former customer",
};

function nameOf(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return fullName(user) || user.email;
}

/** The ids of one entity type among the rows. */
function idsOf(rows: ActivityLog[], entityType: ActivityEntityType) {
  return rows.filter((r) => r.entityType === entityType).map((r) => r.entityId);
}

/**
 * Names the actors and the records of a page of entries in a few queries.
 * The log holds ids only, so a renamed or deleted record never rewrites it.
 */
async function decorate(rows: ActivityLog[]): Promise<ActivityEntry[]> {
  const userIds = new Set<string>(idsOf(rows, "admin"));
  for (const row of rows) if (row.actorId) userIds.add(row.actorId);

  const [users, bookings, zones, vehicleClasses] = await Promise.all([
    db.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    db.booking.findMany({
      where: { id: { in: idsOf(rows, "booking") } },
      select: { id: true, reference: true },
    }),
    db.zone.findMany({
      where: { id: { in: idsOf(rows, "zone") } },
      select: { id: true, name: true },
    }),
    db.vehicleClass.findMany({
      where: { id: { in: idsOf(rows, "vehicle-class") } },
      select: { id: true, name: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const labels: Record<ActivityEntityType, Map<string, string>> = {
    booking: new Map(bookings.map((b) => [b.id, b.reference])),
    zone: new Map(zones.map((z) => [z.id, z.name])),
    "vehicle-class": new Map(vehicleClasses.map((v) => [v.id, v.name])),
    admin: new Map(users.map((u) => [u.id, u.email])),
    setting: new Map(),
  };

  return rows.map((row) => {
    const actor = row.actorId ? userById.get(row.actorId) : undefined;
    const kind = isActorKind(row.actorKind) ? row.actorKind : "system";
    const actorName = actor
      ? nameOf(actor)
      : kind === "system"
        ? "System"
        : FORMER[kind];
    return { ...row, actorName, entityLabel: entityLabelOf(row, labels) };
  });
}

function entityLabelOf(
  row: ActivityLog,
  labels: Record<ActivityEntityType, Map<string, string>>,
) {
  const entityType = row.entityType as ActivityEntityType;
  switch (entityType) {
    case "admin":
      return labels.admin.get(row.entityId) ?? "Former user";
    case "setting":
      return "The wall";
    case "booking":
    case "zone":
    case "vehicle-class":
      return labels[entityType].get(row.entityId) ?? row.entityId;
    default:
      return row.entityId;
  }
}

/** The history of one record, oldest first, as a booking page shows it. */
export async function listActivityFor(
  entityType: ActivityEntityType,
  entityId: string,
): Promise<ActivityEntry[]> {
  const rows = await db.activityLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
  });
  return decorate(rows);
}

export type ActivityPage = {
  entries: ActivityEntry[];
  /** The id to pass as `before` for the next, older page; null at the end. */
  nextCursor: string | null;
};

/**
 * The full log across the app, newest first, one page at a time. `before`
 * is the id of the last entry of the previous page.
 */
export async function listActivity({
  before,
  take,
}: {
  before?: string;
  take: number;
}): Promise<ActivityPage> {
  const rows = await db.activityLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  });
  const page = rows.slice(0, take);
  return {
    entries: await decorate(page),
    nextCursor: rows.length > take ? (page.at(-1)?.id ?? null) : null,
  };
}
