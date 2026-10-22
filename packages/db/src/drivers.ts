import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import { checkDeleteConfirmed, type DeleteConfirmation } from "./delete-impact";
import {
  checkDriverFields,
  DRIVER_CLASSES_FIELD,
  DRIVER_DELETE_IMPACT,
  DRIVER_DOCUMENTS,
  driverFieldsOf,
  type DriverDocument,
  type DriverFields,
} from "./driver-input";
import { dateOfDay, dueByDate } from "./expiry";
import type { Prisma } from "./generated/prisma/client";
import type { FleetFilter } from "./vehicles";
import { phoneDigitsOf } from "./search";

/**
 * Our drivers, each based at one location, with the classes they may drive
 * and the expiry dates of their licences. A driver needs no account; the
 * driver portal links one later. The readers serve a location's Drivers
 * tab and the list across locations; the writers take the actor and log
 * against the driver inside their transaction. See
 * docs/261019-vehicles-and-drivers.md.
 */

const withClasses = {
  include: {
    vehicleClasses: {
      select: { id: true, name: true, category: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    },
    location: { select: { id: true, name: true, slug: true, state: true } },
  },
} satisfies Prisma.DriverDefaultArgs;

/** A driver with the classes they may drive and their location. */
export type DriverWithClasses = Prisma.DriverGetPayload<typeof withClasses>;

const NOT_FOUND: Change = refuse(
  "This driver was deleted meanwhile. Go back to the list.",
);

/** Where a driver matches a search: their name or their phone. */
function driverSearchWhere(search: string): Prisma.DriverWhereInput {
  const phone = phoneDigitsOf(search);
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      ...(phone ? [{ phone: { contains: phone } }] : []),
    ],
  };
}

/** Every driver, or those the filter leaves, active first, by name. */
export function listDrivers(
  filter: FleetFilter = {},
): Promise<DriverWithClasses[]> {
  const where: Prisma.DriverWhereInput[] = [];
  if (filter.locationId) where.push({ locationId: filter.locationId });
  if (filter.due) where.push(driversDueWhere());
  if (filter.search) where.push(driverSearchWhere(filter.search));
  return db.driver.findMany({
    where: { AND: where },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    ...withClasses,
  });
}

export function getDriver(id: string): Promise<DriverWithClasses | null> {
  return db.driver.findUnique({ where: { id }, ...withClasses });
}

/** Where a driver filter matches the active ones with a licence due by the warning, or expired. */
export function driversDueWhere(now: Date = new Date()) {
  const dueBy = dueByDate(now);
  return {
    isActive: true,
    OR: DRIVER_DOCUMENTS.map((key) => ({ [key]: { lte: dueBy } })),
  } satisfies Prisma.DriverWhereInput;
}

/** The days among the fields as the row stores them: dates. */
function documentDates(fields: Partial<DriverFields>) {
  const dates: Partial<Record<DriverDocument, Date | null>> = {};
  for (const key of DRIVER_DOCUMENTS) {
    const day = fields[key];
    if (day !== undefined) dates[key] = dateOfDay(day);
  }
  return dates;
}

/**
 * Checks that the location and the classes a driver points at exist, and
 * answers their names for the log: the classes in the catalogue's order.
 */
async function namesOf(
  tx: Prisma.TransactionClient,
  fields: Partial<Pick<DriverFields, "locationId" | "vehicleClassIds">>,
): Promise<
  { ok: true; locationName?: string; classNames?: string[] } | Refusal
> {
  const ids = fields.vehicleClassIds;
  const [location, classes] = await Promise.all([
    fields.locationId
      ? tx.location.findUnique({
          where: { id: fields.locationId },
          select: { name: true },
        })
      : null,
    ids
      ? tx.vehicleClass.findMany({
          where: { id: { in: ids } },
          select: { name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : null,
  ]);
  if (fields.locationId && !location) {
    return refuse(
      "That location was just deleted. Choose where they are based again.",
      "locationId",
    );
  }
  if (ids && classes?.length !== ids.length) {
    return refuse(
      "A class ticked was just deleted. Tick the classes they may drive again.",
      DRIVER_CLASSES_FIELD,
    );
  }
  return {
    ok: true,
    locationName: location?.name,
    classNames: classes?.map((c) => c.name),
  };
}

export async function createDriver(
  actor: Actor,
  fields: DriverFields,
): Promise<Created> {
  const check = checkDriverFields(fields);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const names = await namesOf(tx, fields);
    if (!names.ok) return names;
    const { vehicleClassIds, ...rest } = fields;
    const driver = await tx.driver.create({
      data: {
        ...rest,
        ...documentDates(fields),
        vehicleClasses: { connect: vehicleClassIds.map((id) => ({ id })) },
      },
    });
    await logActivity(tx, actor, {
      action: "driver.created",
      entityId: driver.id,
      after: {
        ...rest,
        classes: names.classNames ?? [],
        locationName: names.locationName ?? null,
      },
      locationIds: [fields.locationId],
    });
    return { ok: true, id: driver.id };
  });
}

/**
 * Changes any of the fields. The classes are logged by name when they
 * change. Saving what is already there logs nothing.
 */
export async function updateDriver(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
): Promise<Change> {
  const check = checkDriverFields(patch);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: {
        vehicleClasses: {
          select: { id: true, name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
    if (!driver) return NOT_FOUND;
    const current = driverFieldsOf(driver);
    const { vehicleClassIds, ...scalars } = patch;
    const changed = changedFields(current, scalars);
    const classesChanged =
      vehicleClassIds !== undefined &&
      vehicleClassIds.join(",") !== current.vehicleClassIds.join(",");
    if (!changed && !classesChanged) return { ok: true };

    const names = await namesOf(tx, {
      locationId: changed?.after.locationId,
      vehicleClassIds: classesChanged ? vehicleClassIds : undefined,
    });
    if (!names.ok) return names;
    await tx.driver.update({
      where: { id },
      data: {
        ...changed?.after,
        ...(changed ? documentDates(changed.after) : {}),
        ...(classesChanged
          ? {
              vehicleClasses: {
                set: vehicleClassIds.map((classId) => ({ id: classId })),
              },
            }
          : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "driver.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(classesChanged
          ? { classes: driver.vehicleClasses.map((c) => c.name) }
          : {}),
      },
      after: {
        ...changed?.after,
        ...(classesChanged ? { classes: names.classNames ?? [] } : {}),
        ...(names.locationName ? { locationName: names.locationName } : {}),
      },
      locationIds: [
        driver.locationId,
        ...(changed?.after.locationId ? [changed.after.locationId] : []),
      ],
    });
    return { ok: true };
  });
}

/**
 * Deletes a driver entered by mistake, once the admin confirmed what that
 * takes (`DRIVER_DELETE_IMPACT`, ./delete-impact). One who has driven for
 * us is made inactive instead.
 */
export function deleteDriver(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<Change> {
  const confirmed = checkDeleteConfirmed(DRIVER_DELETE_IMPACT, confirmation);
  if (!confirmed.ok) return Promise.resolve(confirmed);
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: { location: { select: { name: true } } },
    });
    if (!driver) return NOT_FOUND;
    await tx.driver.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "driver.deleted",
      entityId: id,
      before: { name: driver.name, locationName: driver.location.name },
      locationIds: [driver.locationId],
    });
    return { ok: true };
  });
}
