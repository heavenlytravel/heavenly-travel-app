import {
  activityActionMeta,
  ANONYMOUS_ACTOR_NAMES,
  isActorKind,
  type ActivityAction,
  type ActivityEntityType,
  type Actor,
} from "./activity-actions";
import { activityActionsIn, type ActivityArea } from "./activity-areas";
import { db } from "./client";
import type { ActivityLog, Prisma } from "./generated/prisma/client";
import type { LocationPageRef } from "./location-page-input";
import { fullName } from "./names";
import {
  SITE_PAGES,
  SITE_PAGE_LABELS,
  type SitePageKey,
} from "./site-page-input";
import { FOOTER_KEYS, FOOTER_LABELS, type FooterKey } from "./footer-content";

/**
 * The activity log: one row per change, written by the transaction that
 * makes the change, so a change that is not logged does not happen. Rows
 * are never edited or deleted. The vocabulary is in ./activity-actions.
 */

export type { ActivityLog };

export type ActivityWrite = {
  action: ActivityAction;
  /** The booking, state or district code, class, admin user, setting, location, vehicle, driver or `MEDIA_RECORD_ID` the action touched. */
  entityId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
  /** The locations whose history it belongs in too: where a vehicle or a driver is based, before and after a move. */
  locationIds?: readonly string[];
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
      actorId: "userId" in actor ? actor.userId : null,
      actorKind: actor.kind,
      action: entry.action,
      entityType: meta.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      customerVisible: meta.customerVisible,
      locationIds: [...new Set(entry.locationIds ?? [])],
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
  current: NoInfer<{ [K in keyof P]: Scalar }> & Record<string, unknown>,
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
  /** "Nurul Aina", the email when there is no name, "Guest", "System", or "Former staff". */
  actorName: string;
  /** "HT-7K3QZM", "Selangor", "Petaling", "Langkawi", the admin's email, "The wall", "Media", "VLE1234", a driver's name; the id when unknown. */
  entityLabel: string;
  /** The record was deleted since: its label is the name it last had, and it has no page to open. */
  isDeleted: boolean;
  /** Where a vehicle or a driver is based now, whose screens hold its page; null for any other record. */
  recordLocationId: string | null;
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
  const userIds = new Set<string>([
    ...idsOf(rows, "user"),
    ...idsOf(rows, "admin"),
  ]);
  for (const row of rows) if (row.actorId) userIds.add(row.actorId);
  // A record type the rows do not name costs no query.
  const read = <T>(ids: readonly string[], query: () => Promise<T[]>) =>
    ids.length > 0 ? query() : Promise.resolve<T[]>([]);
  const ids = {
    booking: idsOf(rows, "booking"),
    state: idsOf(rows, "state"),
    district: idsOf(rows, "district"),
    vehicleClass: idsOf(rows, "vehicle-class"),
    location: idsOf(rows, "location"),
    vehicle: idsOf(rows, "vehicle"),
    driver: idsOf(rows, "driver"),
    vendor: idsOf(rows, "vendor"),
  };

  const [
    users,
    bookings,
    states,
    districts,
    vehicleClasses,
    locations,
    vehicles,
    drivers,
    vendors,
  ] = await Promise.all([
    read([...userIds], () =>
      db.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
    ),
    read(ids.booking, () =>
      db.booking.findMany({
        where: { id: { in: ids.booking } },
        select: { id: true, reference: true },
      }),
    ),
    read(ids.state, () =>
      db.state.findMany({
        where: { code: { in: ids.state } },
        select: { code: true, name: true },
      }),
    ),
    read(ids.district, () =>
      db.district.findMany({
        where: { code: { in: ids.district } },
        select: { code: true, name: true },
      }),
    ),
    read(ids.vehicleClass, () =>
      db.vehicleClass.findMany({
        where: { id: { in: ids.vehicleClass } },
        select: { id: true, name: true },
      }),
    ),
    read(ids.location, () =>
      db.location.findMany({
        where: { id: { in: ids.location } },
        select: { id: true, name: true },
      }),
    ),
    read(ids.vehicle, () =>
      db.vehicle.findMany({
        where: { id: { in: ids.vehicle } },
        select: { id: true, plate: true, locationId: true },
      }),
    ),
    read(ids.driver, () =>
      db.driver.findMany({
        where: { id: { in: ids.driver } },
        select: { id: true, name: true, locationId: true },
      }),
    ),
    read(ids.vendor, () =>
      db.vendor.findMany({
        where: { id: { in: ids.vendor } },
        select: { id: true, name: true },
      }),
    ),
  ]);
  const basedAt = new Map(
    [...vehicles, ...drivers].map((record) => [record.id, record.locationId]),
  );
  const userById = new Map(users.map((u) => [u.id, u]));
  const emails = new Map(users.map((u) => [u.id, u.email]));
  const [deleted, deletedVehicles, deletedDrivers] = await Promise.all([
    deletedNames(
      "location.deleted",
      "name",
      ids.location,
      new Set(locations.map((l) => l.id)),
    ),
    deletedNames(
      "vehicle.deleted",
      "plate",
      ids.vehicle,
      new Set(vehicles.map((v) => v.id)),
    ),
    deletedNames(
      "driver.deleted",
      "name",
      ids.driver,
      new Set(drivers.map((d) => d.id)),
    ),
  ]);
  const withDeleted = (
    live: readonly (readonly [string, string])[],
    gone: Map<string, string>,
  ) =>
    new Map([
      ...live,
      ...[...gone].map(([id, name]) => [id, `${name} (deleted)`] as const),
    ]);
  const gone: Partial<Record<ActivityEntityType, Map<string, string>>> = {
    location: deleted,
    vehicle: deletedVehicles,
    driver: deletedDrivers,
  };
  const labels: Record<ActivityEntityType, Map<string, string>> = {
    booking: new Map(bookings.map((b) => [b.id, b.reference])),
    state: new Map(states.map((s) => [s.code, s.name])),
    district: new Map(districts.map((d) => [d.code, d.name])),
    "vehicle-class": new Map(vehicleClasses.map((v) => [v.id, v.name])),
    user: emails,
    admin: emails,
    setting: new Map(),
    media: new Map(),
    "site-page": new Map([
      ...SITE_PAGES.map((page) => [page, SITE_PAGE_LABELS[page]] as const),
      ...FOOTER_KEYS.map((key) => [key, FOOTER_LABELS[key]] as const),
    ]),
    location: withDeleted(
      locations.map((l) => [l.id, l.name] as const),
      deleted,
    ),
    vehicle: withDeleted(
      vehicles.map((v) => [v.id, v.plate] as const),
      deletedVehicles,
    ),
    driver: withDeleted(
      drivers.map((d) => [d.id, d.name] as const),
      deletedDrivers,
    ),
    vendor: new Map(vendors.map((v) => [v.id, v.name] as const)),
  };

  return rows.map((row) => {
    const actor = row.actorId ? userById.get(row.actorId) : undefined;
    const kind = isActorKind(row.actorKind) ? row.actorKind : "system";
    const actorName = actor ? nameOf(actor) : ANONYMOUS_ACTOR_NAMES[kind];
    return {
      ...row,
      actorName,
      entityLabel: entityLabelOf(row, labels),
      isDeleted:
        gone[row.entityType as ActivityEntityType]?.has(row.entityId) ?? false,
      recordLocationId:
        row.entityType === "vehicle" || row.entityType === "driver"
          ? (basedAt.get(row.entityId) ?? null)
          : null,
    };
  });
}

/**
 * The names of the records among the ids that no longer exist, from the
 * `key` of the entry their deletion logged: a location's name, a
 * vehicle's plate. Asked only when one is missing.
 */
async function deletedNames(
  action: ActivityAction,
  key: string,
  ids: readonly string[],
  existing: ReadonlySet<string>,
): Promise<Map<string, string>> {
  const missing = [...new Set(ids)].filter((id) => !existing.has(id));
  if (missing.length === 0) return new Map();
  const entries = await db.activityLog.findMany({
    where: {
      entityType: activityActionMeta(action).entityType,
      entityId: { in: missing },
      action,
    },
    select: { entityId: true, before: true },
  });
  return new Map(
    entries.flatMap(({ entityId, before }) => {
      const name = (before as Record<string, unknown> | null)?.[key];
      return typeof name === "string" ? [[entityId, name] as const] : [];
    }),
  );
}

function entityLabelOf(
  row: ActivityLog,
  labels: Record<ActivityEntityType, Map<string, string>>,
) {
  const entityType = row.entityType as ActivityEntityType;
  switch (entityType) {
    case "user":
    case "admin":
      return labels[entityType].get(row.entityId) ?? "Former user";
    case "setting":
      return "The wall";
    case "media":
      return "Media";
    case "site-page":
      return labels[entityType].get(row.entityId) ?? row.entityId;
    case "booking":
    case "state":
    case "district":
    case "vehicle-class":
    case "location":
    case "vehicle":
    case "driver":
    case "vendor":
      return labels[entityType].get(row.entityId) ?? row.entityId;
    default:
      return row.entityId;
  }
}

/** One entry by its id, for a page that shows what the entry holds. */
export async function getActivityEntry(
  id: string,
): Promise<ActivityEntry | null> {
  const row = await db.activityLog.findUnique({ where: { id } });
  if (!row) return null;
  const [entry] = await decorate([row]);
  return entry ?? null;
}

/** The history of one record, oldest first, as a booking page shows it. */
export function listActivityFor(
  entityType: ActivityEntityType,
  entityId: string,
): Promise<ActivityEntry[]> {
  return listActivityForMany([{ entityType, entityId }]);
}

/** The history of several records together, oldest first: a state and its districts. */
export async function listActivityForMany(
  records: readonly { entityType: ActivityEntityType; entityId: string }[],
): Promise<ActivityEntry[]> {
  if (records.length === 0) return [];
  const rows = await db.activityLog.findMany({
    where: { OR: records.map((r) => ({ ...r })) },
    // Entries written by one transaction share a time; the id keeps their order.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return decorate(rows);
}

/** Which entries of the log a reader asks for: the areas the admin holds, or one of them. */
export type ActivityAreas = {
  /** The areas the admin holds: `activityAreasHeld`. */
  held: readonly ActivityArea[];
  /** One of them, the filter's; none for all of them. */
  area?: ActivityArea;
};

/**
 * The query's part that keeps the areas asked for: by action, so a page
 * of the log is a page of what the admin may see. An area not held asks
 * for nothing.
 */
function areaWhere({
  held,
  area,
}: ActivityAreas): Prisma.ActivityLogWhereInput {
  const areas = area ? held.filter((each) => each === area) : held;
  const actions = activityActionsIn(areas);
  return actions ? { action: { in: actions } } : {};
}

/** One page of the log, newest first, after the entry `before`. */
async function pageOf(
  where: Prisma.ActivityLogWhereInput,
  before: string | undefined,
  take: number,
): Promise<ActivityPage> {
  const rows = await db.activityLog.findMany({
    where,
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

/**
 * A location's history, newest first, one page at a time: the changes to
 * the location itself, and to the vehicles and drivers based there when
 * each was made, of the areas asked for. `before` is the id of the last
 * entry of the previous page.
 */
export function listLocationHistory({
  locationId,
  areas,
  before,
  take,
}: {
  locationId: string;
  areas: ActivityAreas;
  before?: string;
  take: number;
}): Promise<ActivityPage> {
  return pageOf(
    {
      AND: [
        {
          OR: [
            { entityType: "location", entityId: locationId },
            { locationIds: { has: locationId } },
          ],
        },
        areaWhere(areas),
      ],
    },
    before,
    take,
  );
}

/**
 * The publishes of one page of a location, newest first: who published it
 * and when. What each put on the page is read on its own page, so the
 * snapshots are left unread here.
 */
export async function listPagePublishes(
  locationId: string,
  ref: LocationPageRef,
): Promise<ActivityEntry[]> {
  // An entry from before sections names no slug: it is a section's own page.
  const ids = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ActivityLog"
    WHERE "entityType" = 'location' AND "entityId" = ${locationId}
      AND action = 'location.page.published'
      AND after->>'page' = ${ref.page}
      AND COALESCE(after->>'slug', '') = ${ref.slug}`;
  return publishesById(ids.map((row) => row.id));
}

/** The publishes of a site page, newest first, without their contents. */
export async function listSitePagePublishes(
  page: SitePageKey,
): Promise<ActivityEntry[]> {
  const rows = await db.activityLog.findMany({
    where: {
      entityType: "site-page",
      entityId: page,
      action: "site.page.published",
    },
    select: { id: true },
  });
  return publishesById(rows.map((row) => row.id));
}

/** The publishes of a footer, newest first, without their contents. */
export async function listFooterPublishes(
  key: FooterKey,
): Promise<ActivityEntry[]> {
  const rows = await db.activityLog.findMany({
    where: {
      entityType: "site-page",
      entityId: key,
      action: "site.footer.published",
    },
    select: { id: true },
  });
  return publishesById(rows.map((row) => row.id));
}

/** The entries by id, newest first, their contents left out: a list needs only who and when. */
async function publishesById(ids: readonly string[]): Promise<ActivityEntry[]> {
  if (ids.length === 0) return [];
  const rows = await db.activityLog.findMany({
    where: { id: { in: [...ids] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    omit: { before: true, after: true },
  });
  return decorate(rows.map((row) => ({ ...row, before: null, after: null })));
}

export type ActivityPage = {
  entries: ActivityEntry[];
  /** The id to pass as `before` for the next, older page; null at the end. */
  nextCursor: string | null;
};

/**
 * The log across the app, newest first, one page at a time, of the areas
 * asked for. `before` is the id of the last entry of the previous page.
 */
export function listActivity({
  areas,
  before,
  take,
}: {
  areas: ActivityAreas;
  before?: string;
  take: number;
}): Promise<ActivityPage> {
  return pageOf(areaWhere(areas), before, take);
}
