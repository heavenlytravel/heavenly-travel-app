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
  /** The booking, admin user or setting the action touched. */
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

/** An entry with its actor and record named, ready to show. */
export type ActivityEntry = ActivityLog & {
  /** "Nurul Aina", the email when there is no name, "System", or "Former staff". */
  actorName: string;
  /** "HT-7K3QZM", the admin's email, "The wall"; the id when unknown. */
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

/**
 * Names the actors and the records of a page of entries in two queries.
 * The log holds ids only, so a renamed or deleted user never rewrites it.
 */
async function decorate(rows: ActivityLog[]): Promise<ActivityEntry[]> {
  const userIds = new Set<string>();
  const bookingIds = new Set<string>();
  for (const row of rows) {
    if (row.actorId) userIds.add(row.actorId);
    if (row.entityType === "admin") userIds.add(row.entityId);
    if (row.entityType === "booking") bookingIds.add(row.entityId);
  }
  const [users, bookings] = await Promise.all([
    db.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    db.booking.findMany({
      where: { id: { in: [...bookingIds] } },
      select: { id: true, reference: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const referenceById = new Map(bookings.map((b) => [b.id, b.reference]));

  return rows.map((row) => {
    const actor = row.actorId ? userById.get(row.actorId) : undefined;
    const kind = isActorKind(row.actorKind) ? row.actorKind : "system";
    const actorName = actor
      ? nameOf(actor)
      : kind === "system"
        ? "System"
        : FORMER[kind];
    return {
      ...row,
      actorName,
      entityLabel: entityLabelOf(row, userById, referenceById),
    };
  });
}

function entityLabelOf(
  row: ActivityLog,
  userById: Map<string, { email: string }>,
  referenceById: Map<string, string>,
) {
  switch (row.entityType as ActivityEntityType) {
    case "booking":
      return referenceById.get(row.entityId) ?? row.entityId;
    case "admin":
      return userById.get(row.entityId)?.email ?? "Former user";
    case "setting":
      return "The wall";
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
